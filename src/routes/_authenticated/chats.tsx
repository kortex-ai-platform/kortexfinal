import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Bot, MessageCircle, MessageSquare, Inbox, User, BellDot, Copy, Check, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  listFbConversations,
  markConversationRead,
  setConversationAi,
  refreshConversationProfile,
  getConversationPostContext,
  saveConversationName,
} from "@/lib/fb-conversations.functions";
import { listFbMessages, sendHumanReply } from "@/lib/fb-messages.functions";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({ meta: [{ title: "Messenger Inbox — kortex Ai" }] }),
  component: ChatsPage,
});

type Folder = "all" | "messenger" | "comment" | "unread";

const FOLDERS: { key: Folder; label: string; icon: typeof Inbox }[] = [
  { key: "all", label: "All", icon: Inbox },
  { key: "messenger", label: "Messenger", icon: MessageCircle },
  { key: "comment", label: "Comments", icon: MessageSquare },
  { key: "unread", label: "Unread", icon: BellDot },
];

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function displayName(c: any) {
  if (c.user_name) return c.user_name;
  if (c.source === "comment") return "Facebook name pending";
  return "Facebook name pending";
}

function displayMessageText(m: any) {
  const raw = m.text ?? (m.error ? `⚠️ ${m.error}` : "[attachment]");
  if (m.direction !== "out") return raw;
  return raw
    .replace(/^\s*(you|assistant|agent|ai|bot|customer|user)\s*[:：-]\s*/i, "")
    .replace(/^\s*(আপনি|গ্রাহক|কাস্টমার|ইউজার|সহকারী|এজেন্ট)\s*[:：-]\s*/i, "");
}

export function ChatsPage() {
  const qc = useQueryClient();
  const listConvsFn = useServerFn(listFbConversations);
  const listMsgsFn = useServerFn(listFbMessages);
  const sendFn = useServerFn(sendHumanReply);
  const setAiFn = useServerFn(setConversationAi);
  const markReadFn = useServerFn(markConversationRead);
  const refreshProfileFn = useServerFn(refreshConversationProfile);
  const getPostCtxFn = useServerFn(getConversationPostContext);
  const saveNameFn = useServerFn(saveConversationName);

  const [folder, setFolder] = useState<Folder>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [nameDraft, setNameDraft] = useState("");

  const conversations = useQuery({
    queryKey: ["fb-conversations", folder],
    queryFn: () => listConvsFn({ data: { folder } }),
    refetchInterval: 15000,
  });

  const active = useMemo(
    () => conversations.data?.find((c: any) => c.id === activeId) ?? null,
    [conversations.data, activeId],
  );

  useEffect(() => {
    setNameDraft(active?.user_name ?? "");
  }, [active?.id, active?.user_name]);

  const messages = useQuery({
    queryKey: ["fb-messages", activeId],
    queryFn: () => (activeId ? listMsgsFn({ data: { conversationId: activeId } }) : []),
    enabled: !!activeId,
  });

  const postContext = useQuery({
    queryKey: ["fb-post-context", activeId],
    queryFn: () => getPostCtxFn({ data: { conversationId: activeId! } }),
    enabled: !!activeId && active?.source === "comment" && !!(active as any)?.post_id,
    staleTime: 60_000,
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("fb_inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fb_messages" },
        (payload: any) => {
          const convId = payload.new?.conversation_id ?? payload.old?.conversation_id;
          if (convId)
            qc.invalidateQueries({ queryKey: ["fb-messages", convId] });
          qc.invalidateQueries({ queryKey: ["fb-conversations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fb_conversations" },
        () => qc.invalidateQueries({ queryKey: ["fb-conversations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Mark read on open
  useEffect(() => {
    if (activeId) {
      markReadFn({ data: { conversationId: activeId } }).then(() =>
        qc.invalidateQueries({ queryKey: ["fb-conversations"] }),
      );
    }
  }, [activeId, markReadFn, qc]);

  // Auto-refresh missing profile info (name/avatar) for messenger conversations.
  // Retries whenever a new message arrives (last_message_at changes), up to a
  // per-conversation cap so transient Graph API failures recover automatically.
  const MAX_PROFILE_ATTEMPTS = 5;
  const profileAttemptsRef = useRef<
    Map<string, { attempts: number; lastMessageAt: string | null; inflight: boolean }>
  >(new Map());
  useEffect(() => {
    const list = conversations.data ?? [];
    for (const c of list as any[]) {
      if (c.source !== "messenger" && c.source !== "comment") continue;
      if (c.user_name && c.user_avatar_url) continue;

      const prev = profileAttemptsRef.current.get(c.id);
      const newMessage = !prev || prev.lastMessageAt !== c.last_message_at;
      const underCap = !prev || prev.attempts < MAX_PROFILE_ATTEMPTS;
      if (prev?.inflight) continue;
      // Try once initially, then again every time a new message arrives.
      if (!newMessage && prev) continue;
      if (!underCap) continue;

      profileAttemptsRef.current.set(c.id, {
        attempts: (prev?.attempts ?? 0) + 1,
        lastMessageAt: c.last_message_at,
        inflight: true,
      });
      refreshProfileFn({ data: { conversationId: c.id } })
        .then((r: any) => {
          const cur = profileAttemptsRef.current.get(c.id);
          if (cur) cur.inflight = false;
          if (r?.ok && (r.name || r.avatar)) {
            // Success — reset cap so future profile changes still refresh.
            profileAttemptsRef.current.set(c.id, {
              attempts: 0,
              lastMessageAt: c.last_message_at,
              inflight: false,
            });
            qc.invalidateQueries({ queryKey: ["fb-conversations"] });
          }
        })
        .catch(() => {
          const cur = profileAttemptsRef.current.get(c.id);
          if (cur) cur.inflight = false;
        });
    }
  }, [conversations.data, refreshProfileFn, qc]);

  const send = useMutation({
    mutationFn: (text: string) =>
      sendFn({ data: { conversationId: activeId!, text } }),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["fb-messages", activeId] });
      qc.invalidateQueries({ queryKey: ["fb-conversations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const toggleAi = useMutation({
    mutationFn: (v: boolean | null) =>
      setAiFn({ data: { conversationId: activeId!, ai_enabled: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fb-conversations", folder] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const saveName = useMutation({
    mutationFn: () =>
      saveNameFn({
        data: { conversationId: activeId!, userName: nameDraft.trim() || null },
      }),
    onSuccess: () => {
      toast.success("Facebook name saved");
      qc.invalidateQueries({ queryKey: ["fb-conversations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save name"),
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vp = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  }, [messages.data, activeId]);

  return (
    <div className="h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border bg-card">
      <div className="grid h-full min-h-0 grid-cols-[170px_280px_1fr]">

        {/* Left: Folders */}
        <div className="border-r p-3">
          <div className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Inbox
          </div>
          <div className="space-y-1">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFolder(f.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    folder === f.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: Conversations */}
        <div className="flex min-h-0 flex-col border-r">
          <div className="shrink-0 border-b p-3 font-semibold">Conversations</div>
          <ScrollArea className="min-h-0 flex-1">

            {(conversations.data ?? []).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-muted",
                  activeId === c.id && "bg-muted",
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={c.user_avatar_url ?? undefined}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    alt={c.user_name ?? "User"}
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                    {getInitials(c.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">
                      {displayName(c)}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {c.last_message_preview ?? "—"}
                    </span>
                    {c.source === "comment" && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        Comment
                      </Badge>
                    )}
                  </div>
                </div>
                {c.unread_count > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))}
            {conversations.data && conversations.data.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Active chat */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {!active ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between border-b p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={active.user_avatar_url ?? undefined}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      alt={active.user_name ?? "User"}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                      {getInitials(active.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {displayName(active)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {active.source === "comment"
                        ? "Page comment thread"
                        : "Messenger DM"}
                      <details className="group">
                        <summary className="cursor-pointer text-primary hover:underline list-none">
                          Edit name
                        </summary>
                        <div className="absolute z-20 mt-1 flex items-center gap-2 rounded-md border bg-popover p-2 shadow-md">
                          <Input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            placeholder="Facebook name"
                            className="h-7 w-48 text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={saveName.isPending || nameDraft.trim() === (active.user_name ?? "")}
                            onClick={() => saveName.mutate()}
                          >
                            Save
                          </Button>
                        </div>
                      </details>
                    </div>
                  </div>

                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-xs">AI auto-reply</span>
                  <Switch
                    checked={
                      active.ai_enabled === null ? true : active.ai_enabled
                    }
                    onCheckedChange={(v) => toggleAi.mutate(v)}
                  />
                </div>
              </div>

              {active.fb_user_id ? (
                <div className="flex shrink-0 items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-muted-foreground">
                    Recipient PSID detected
                  </span>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
                    {active.fb_user_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => {
                      navigator.clipboard.writeText(active.fb_user_id);
                      toast.success("PSID copied");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-2 border-b bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  No recipient PSID detected. Start a Messenger conversation
                  to get one.
                </div>
              )}


              {active.source === "comment" && (
                <details className="shrink-0 border-b bg-muted/30">
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground hover:bg-muted/60">
                    <FileText className="h-3.5 w-3.5" />
                    Detected post context (used by AI)
                  </summary>
                  <div className="p-3 pt-0">

                  {postContext.isLoading ? (
                    <div className="text-xs text-muted-foreground">Loading post…</div>
                  ) : postContext.data?.ok ? (
                    <div className="flex gap-3 rounded-lg border bg-card p-3">
                      {postContext.data.post.imageUrl && (
                        <img
                          src={postContext.data.post.imageUrl}
                          alt="Post banner"
                          className="h-20 w-20 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="line-clamp-3 text-xs text-foreground">
                          {postContext.data.post.message ??
                            postContext.data.post.story ??
                            "(no caption)"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <code className="rounded bg-muted px-1 py-0.5 font-mono">
                            {postContext.data.post.id}
                          </code>
                          {postContext.data.post.permalink && (
                            <a
                              href={postContext.data.post.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open on Facebook
                            </a>
                          )}
                          {postContext.data.post.imageUrl && (
                            <a
                              href={postContext.data.post.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Banner image
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {(postContext.data as any)?.reason ?? "No post detected"}
                    </div>
                  )}
                  </div>
                </details>
              )}


              <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 bg-muted/30 p-4">
                <div className="mx-auto max-w-2xl space-y-2">
                  {(messages.data ?? []).map((m: any) => {
                    const isOut = m.direction === "out";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex animate-fade-in",
                          isOut ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                            isOut
                              ? m.sender === "ai"
                                ? "bg-primary/15 text-foreground"
                                : "bg-primary text-primary-foreground"
                              : "bg-card border",
                          )}
                        >
                          {displayMessageText(m)}
                          <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                            {m.sender === "ai" && <Bot className="h-3 w-3" />}
                            {m.sender === "human" && <User className="h-3 w-3" />}
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                </div>
              </ScrollArea>

              <form
                className="flex shrink-0 items-center gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim()) send.mutate(input.trim());
                }}
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    active.source === "comment"
                      ? "Reply to comment..."
                      : "Type a message..."
                  }
                />
                <Button type="submit" disabled={!input.trim() || send.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}