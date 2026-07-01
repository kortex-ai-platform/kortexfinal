const GRAPH = "https://graph.facebook.com/v21.0";

export async function fbGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Graph GET ${path} failed`);
  return j;
}

export async function fbPost(path: string, accessToken: string, body: Record<string, unknown>) {
  const url = new URL(`${GRAPH}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("access_token", accessToken);
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Graph POST ${path} failed`);
  return j;
}

export async function resolvePageAccessToken(pageId: string, pastedToken: string): Promise<string> {
  // Page tokens identify themselves as the Page on /me. User tokens identify
  // themselves as the Facebook user and must be converted through /me/accounts.
  try {
    const me = await fbGet(`/me`, pastedToken, { fields: "id,name" });
    if (me?.id === pageId) return pastedToken;
  } catch {
    // Fall through to /me/accounts so the caller gets a useful permission error.
  }

  let accounts: any;
  try {
    accounts = await fbGet(`/me/accounts`, pastedToken, {
      fields: "id,name,access_token",
      limit: "200",
    });
  } catch (e: any) {
    throw new Error(
      `Token থেকে Page list আনা যায়নি: ${e?.message ?? "unknown"}. সম্ভবত 'pages_show_list' permission নেই বা token expired।`,
    );
  }

  const match = (accounts?.data ?? []).find((p: any) => p?.id === pageId);
  if (!match?.access_token) {
    throw new Error(
      "এই token-এ select করা Page-টি পাওয়া যায়নি। Graph API Explorer-এ সঠিক App + Page select করে আবার token generate করুন।",
    );
  }
  return match.access_token as string;
}

function isTransientGraphError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("temporarily") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("try again") ||
    m.includes("expired") ||
    m.includes("econn") ||
    m.includes("fetch failed") ||
    m.includes("network") ||
    /\b(429|500|502|503|504)\b/.test(m) ||
    // FB transient error codes: 1, 2, 4, 17, 32, 613
    /\(#(1|2|4|17|32|613)\)/.test(m)
  );
}

async function withBackoff<T>(
  fn: () => Promise<T>,
  { retries = 3, baseMs = 400, label = "graph" }: { retries?: number; baseMs?: number; label?: string } = {},
): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      if (attempt === retries || !isTransientGraphError(msg)) throw e;
      const delay = baseMs * 2 ** attempt + Math.floor(Math.random() * 150);
      console.warn(`[${label}] transient error, retry ${attempt + 1}/${retries} in ${delay}ms: ${msg}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function profileFromParticipants(data: any, psid: string, pageId?: string) {
  const conversations = data?.data ?? [];
  for (const conversation of conversations) {
    const participants = conversation?.participants?.data ?? [];
    const match = participants.find((p: any) => p?.id === psid) ?? participants.find((p: any) => pageId && p?.id !== pageId);
    if (!match) continue;
    const name = (match.name ?? "").trim() || null;
    const avatar = match.profile_pic || match?.picture?.data?.url || null;
    if (name || avatar) return { name, avatar };
  }
  return null;
}

export async function fetchUserProfile(psid: string, pageAccessToken: string, pageId?: string) {
  // 1) Messenger PSID fields (works for DM threads).
  try {
    const j = await withBackoff(
      () =>
        fbGet(`/${psid}`, pageAccessToken, {
          fields: "name,first_name,last_name,profile_pic,picture.type(large)",
        }),
      { label: `fetchUserProfile:psid:${psid}` },
    );
    const name =
      (j.name ?? "").trim() ||
      [j.first_name, j.last_name].filter(Boolean).join(" ").trim() ||
      null;
    const avatar = j.profile_pic || j?.picture?.data?.url || null;
    if (name || avatar) return { name, avatar };
  } catch (e: any) {
    console.warn("fetchUserProfile psid-fields failed", psid, e?.message ?? e);
  }

  // 2) Messenger fallback: ask the Page conversation thread for participants.
  // Some Page tokens can send messages but cannot read /{PSID} directly;
  // /me/conversations?user_id=... often still returns the customer's display name.
  try {
    const j = await withBackoff(
      () =>
        fbGet(pageId ? `/${pageId}/conversations` : "/me/conversations", pageAccessToken, {
          user_id: psid,
          fields: "participants{id,name,picture.type(large)}",
          limit: "1",
        }),
      { label: `fetchUserProfile:conversation:${psid}` },
    );
    const profile = profileFromParticipants(j, psid, pageId);
    if (profile?.name || profile?.avatar) return profile;
  } catch (e: any) {
    console.warn("fetchUserProfile conversation fallback failed", psid, e?.message ?? e);
  }

  // 3) Fallback for comment authors (real FB user id / ASID): `name` + `picture`
  //    work with a page token once the user has engaged with the page.
  try {
    const j = await withBackoff(
      () =>
        fbGet(`/${psid}`, pageAccessToken, {
          fields: "name,picture.type(large)",
        }),
      { label: `fetchUserProfile:name:${psid}` },
    );
    const name = (j.name ?? "").trim() || null;
    const avatar = j?.picture?.data?.url || null;
    return { name, avatar };
  } catch (e: any) {
    console.error("fetchUserProfile failed after all attempts", psid, e?.message ?? e);
    return { name: null, avatar: null };
  }
}


export async function sendMessengerMessage(
  pageAccessToken: string,
  recipientPsid: string,
  text: string,
) {
  return fbPost(`/me/messages`, pageAccessToken, {
    recipient: { id: recipientPsid },
    messaging_type: "RESPONSE",
    message: { text },
  });
}

export async function sendCommentReply(
  pageAccessToken: string,
  commentId: string,
  message: string,
) {
  return fbPost(`/${commentId}/comments`, pageAccessToken, { message });
}

export async function subscribePageWebhook(pageId: string, pageAccessToken: string) {
  return fbPost(`/${pageId}/subscribed_apps`, pageAccessToken, {
    subscribed_fields: "messages,messaging_postbacks,message_deliveries,feed",
  });
}

export async function unsubscribePageWebhook(pageId: string, pageAccessToken: string) {
  const url = new URL(`${GRAPH}/${pageId}/subscribed_apps`);
  url.searchParams.set("access_token", pageAccessToken);
  const r = await fetch(url.toString(), { method: "DELETE" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "unsubscribe failed");
  return j;
}

export async function hideComment(pageAccessToken: string, commentId: string) {
  return fbPost(`/${commentId}`, pageAccessToken, { is_hidden: true });
}

export async function deleteComment(pageAccessToken: string, commentId: string) {
  const url = new URL(`${GRAPH}/${commentId}`);
  url.searchParams.set("access_token", pageAccessToken);
  const r = await fetch(url.toString(), { method: "DELETE" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "delete comment failed");
  return j;
}

export async function blockUserOnPage(
  pageAccessToken: string,
  pageId: string,
  fbUserId: string,
) {
  return fbPost(`/${pageId}/blocked`, pageAccessToken, { user: fbUserId });
}

export interface PostContext {
  id: string;
  message: string | null;
  story: string | null;
  permalink: string | null;
  imageUrl: string | null;
  createdTime: string | null;
}

export async function fetchPostContext(
  pageAccessToken: string,
  postId: string,
): Promise<PostContext | null> {
  try {
    const j = await fbGet(`/${postId}`, pageAccessToken, {
      fields: "id,message,story,permalink_url,created_time,full_picture,attachments{media,media_type,title,description,subattachments}",
    });
    let imageUrl: string | null = j.full_picture ?? null;
    const att = j.attachments?.data?.[0];
    if (!imageUrl && att?.media?.image?.src) imageUrl = att.media.image.src;
    const subDesc = att?.description ?? att?.title ?? null;
    return {
      id: j.id,
      message: j.message ?? subDesc ?? null,
      story: j.story ?? null,
      permalink: j.permalink_url ?? null,
      imageUrl,
      createdTime: j.created_time ?? null,
    };
  } catch (e: any) {
    console.error("fetchPostContext failed", postId, e?.message ?? e);
    return null;
  }
}

export async function fetchCommentContext(
  pageAccessToken: string,
  commentId: string,
): Promise<{ parentMessage: string | null; attachmentUrl: string | null } | null> {
  try {
    const j = await fbGet(`/${commentId}`, pageAccessToken, {
      fields: "message,attachment{media,type,url}",
    });
    return {
      parentMessage: j.message ?? null,
      attachmentUrl: j.attachment?.media?.image?.src ?? j.attachment?.url ?? null,
    };
  } catch {
    return null;
  }
}