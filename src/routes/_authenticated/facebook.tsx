import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Copy,
  Link2,
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  ExternalLink,
  RefreshCw,
  XCircle,
  Facebook,
  Sparkles,
  Shield,
  MessageSquare,
  Settings2,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  disconnectFbPage,
  getFbWebhookInfo,
  listFbPages,
  subscribeFbPage,
  verifyFbPageToken,
  checkFbPagePermissions,
  updateFbPageToken,
  updateFbPageAppSecret,
} from "@/lib/fb-pages.functions";
import { getFbSettings, updateFbSettings } from "@/lib/fb-settings.functions";
import {
  connectAndSubscribeFbPage,
  getFbSetupStatus,
  sendFbTestMessage,
} from "@/lib/fb-setup.functions";
import { getFbOAuthUrl } from "@/lib/fb-oauth.functions";
import { getBranding, upsertBranding, getGlobalWebhookConfig } from "@/lib/branding.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/facebook")({
  head: () => ({ meta: [{ title: "Facebook Integration — kortex Ai" }] }),
  component: FacebookPage,
});

function copy(s: string) {
  navigator.clipboard.writeText(s);
  toast.success("Copied");
}

const PERMS_FOR_LINK = [
  "pages_show_list",
  "pages_messaging",
  "pages_read_engagement",
  "pages_manage_engagement",
  "pages_read_user_content",
  "pages_manage_metadata",
].join(",");

export function FacebookPage() {
  const qc = useQueryClient();
  const webhookFn = useServerFn(getFbWebhookInfo);
  const pagesFn = useServerFn(listFbPages);
  const settingsFn = useServerFn(getFbSettings);
  const connectFn = useServerFn(connectAndSubscribeFbPage);
  const subscribeFn = useServerFn(subscribeFbPage);
  const disconnectFn = useServerFn(disconnectFbPage);
  const updateSettingsFn = useServerFn(updateFbSettings);
  const verifyFn = useServerFn(verifyFbPageToken);
  const statusFn = useServerFn(getFbSetupStatus);
  const testFn = useServerFn(sendFbTestMessage);
  const permsFn = useServerFn(checkFbPagePermissions);
  const updateTokenFn = useServerFn(updateFbPageToken);
  const updateAppSecretFn = useServerFn(updateFbPageAppSecret);
  const brandingFn = useServerFn(getBranding);
  const saveBrandingFn = useServerFn(upsertBranding);
  const globalWebhookFn = useServerFn(getGlobalWebhookConfig);

  const wh = useQuery({ queryKey: ["fb-webhook"], queryFn: () => webhookFn() });
  const branding = useQuery({ queryKey: ["branding"], queryFn: () => brandingFn() });
  const globalWebhook = useQuery({
    queryKey: ["fb-global-webhook"],
    queryFn: () => globalWebhookFn(),
  });
  const isAdminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: u.user.id,
        _role: "admin",
      });
      return Boolean(data);
    },
  });
  const isAdmin = isAdminQ.data === true;
  const pages = useQuery({ queryKey: ["fb-pages"], queryFn: () => pagesFn() });
  const settings = useQuery({ queryKey: ["fb-settings"], queryFn: () => settingsFn() });
  const status = useQuery({
    queryKey: ["fb-setup-status"],
    queryFn: () => statusFn(),
    refetchInterval: 15000,
  });
  const perms = useQuery({
    queryKey: ["fb-perms-check"],
    queryFn: () => permsFn(),
    enabled: false,
  });

  const [pageId, setPageId] = useState("");
  const [pageToken, setPageToken] = useState("");
  const [verified, setVerified] = useState<null | {
    pageId: string;
    pageName: string;
    category: string | null;
    followers: number | null;
    link: string | null;
    subscribed: boolean;
  }>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [globalAi, setGlobalAi] = useState(true);
  const [delay, setDelay] = useState(1500);
  const [humanize, setHumanize] = useState(true);
  const [stripMd, setStripMd] = useState(true);
  const [commentMax, setCommentMax] = useState(3);
  const [msgrLen, setMsgrLen] = useState<"auto" | "short" | "detailed">("auto");
  const [modEnabled, setModEnabled] = useState(false);
  const [modAction, setModAction] = useState<"hide" | "delete">("hide");
  const [modThreshold, setModThreshold] = useState(3);
  const [modDuration, setModDuration] = useState<"permanent" | "24h" | "7d">("permanent");
  const [modMatch, setModMatch] = useState<number>(80);
  const [badWordsText, setBadWordsText] = useState("");
  const [whitelistText, setWhitelistText] = useState("");
  const [testPsid, setTestPsid] = useState("");
  const [testText, setTestText] = useState("Hello from kortex Ai 👋");

  useEffect(() => {
    if (settings.data) {
      setPrompt(settings.data.ai_system_prompt ?? "");
      setGlobalAi(settings.data.ai_global_enabled);
      setDelay(settings.data.reply_delay_ms);
      setHumanize((settings.data as any).humanize_enabled ?? true);
      setStripMd((settings.data as any).strip_markdown ?? true);
      setCommentMax(Number((settings.data as any).comment_max_lines ?? 3));
      setMsgrLen(((settings.data as any).messenger_length ?? "auto") as any);
      setModEnabled(Boolean((settings.data as any).moderation_enabled));
      setModAction(((settings.data as any).moderation_action ?? "hide") as any);
      setModThreshold(Number((settings.data as any).moderation_block_threshold ?? 3));
      setModDuration(((settings.data as any).moderation_block_duration ?? "permanent") as any);
      setModMatch(Number((settings.data as any).moderation_match_threshold ?? 80));
      setBadWordsText(((settings.data as any).bad_words ?? []).join(", "));
      setWhitelistText(((settings.data as any).whitelist_words ?? []).join(", "));
    }
  }, [settings.data]);

  const rawOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const PUBLISHED_ORIGIN = "https://ai-messenger-magic.lovable.app";
  const isPreview = /lovableproject\.com|preview--/i.test(rawOrigin);
  const origin = isPreview ? PUBLISHED_ORIGIN : rawOrigin;
  // Hard-coded production webhook config — identical to admin / main website.
  // User panel always shows these exact values (no edit, no fallback).
  const HARDCODED_WEBHOOK_BASE = "https://ai-messenger-magic.lovable.app";
  const HARDCODED_VERIFY_TOKEN = "kortex.business.admin";

  // Admin can override via their own branding row; every other user sees
  // the hard-coded production webhook (read-only, always).
  const effectiveBase = isAdmin
    ? branding.data?.webhook_base_url || HARDCODED_WEBHOOK_BASE
    : HARDCODED_WEBHOOK_BASE;
  const webhookBase = (effectiveBase || "").replace(/\/+$/, "") || HARDCODED_WEBHOOK_BASE;
  const webhookUrl = `${webhookBase}/api/public/fb/webhook`;
  const verifyToken = isAdmin
    ? branding.data?.webhook_verify_token || HARDCODED_VERIFY_TOKEN
    : HARDCODED_VERIFY_TOKEN;

  const oauthStartFn = useServerFn(getFbOAuthUrl);
  const oauthStart = useMutation({
    mutationFn: () => oauthStartFn({ data: { origin } }),
    onSuccess: (res: any) => {
      if (res?.url) window.location.href = res.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not start Facebook login"),
  });

  // Handle OAuth return
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("fb_oauth");
    if (!r) return;
    if (r === "success") {
      toast.success(`Connected! ${sp.get("saved") ?? 0} page(s), ${sp.get("subscribed") ?? 0} subscribed.`);
      qc.invalidateQueries({ queryKey: ["fb-pages"] });
      qc.invalidateQueries({ queryKey: ["fb-setup-status"] });
    } else {
      toast.error(sp.get("msg") ?? "Facebook connection failed");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [qc]);


  const verify = useMutation({
    mutationFn: (v: { pageId: string; pageAccessToken: string }) => verifyFn({ data: v }),
    onMutate: () => {
      setVerified(null);
      setVerifyError(null);
    },
    onSuccess: (res: any) => {
      if (res.ok) {
        setVerified(res);
        toast.success(`Verified: ${res.pageName}`);
      } else {
        setVerifyError(res.error);
        toast.error(res.error);
      }
    },
    onError: (e: any) => {
      setVerifyError(e?.message ?? "Verification failed");
      toast.error(e?.message ?? "Verification failed");
    },
  });

  const connect = useMutation({
    mutationFn: (v: { pageId: string; pageAccessToken: string }) => connectFn({ data: v }),
    onSuccess: (res: any) => {
      if (res.subscribed) toast.success(`Connected & subscribed: ${res.pageName}`);
      else toast.warning(`Connected: ${res.pageName} — webhook subscribe failed: ${res.subscribeError ?? ""}`);
      setPageId("");
      setPageToken("");
      setVerified(null);
      setVerifyError(null);
      qc.invalidateQueries({ queryKey: ["fb-pages"] });
      qc.invalidateQueries({ queryKey: ["fb-setup-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const subscribe = useMutation({
    mutationFn: (id: string) => subscribeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Webhook subscribed");
      qc.invalidateQueries({ queryKey: ["fb-pages"] });
      qc.invalidateQueries({ queryKey: ["fb-setup-status"] });
      perms.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const updateToken = useMutation({
    mutationFn: (v: { id: string; pageAccessToken: string }) => updateTokenFn({ data: v }),
    onSuccess: (res: any) => {
      if (res.resubscribed) toast.success("Token updated ও webhook subscribed ✅");
      else toast.warning(`Token updated, কিন্তু subscribe ব্যর্থ: ${res.subscribeError ?? ""}`);
      qc.invalidateQueries({ queryKey: ["fb-pages"] });
      qc.invalidateQueries({ queryKey: ["fb-setup-status"] });
      perms.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Token update failed"),
  });

  const [appSecretDrafts, setAppSecretDrafts] = useState<Record<string, string>>({});
  const updateAppSecret = useMutation({
    mutationFn: (v: { id: string; appSecret: string }) => updateAppSecretFn({ data: v }),
    onSuccess: (_r, vars) => {
      toast.success("App Secret saved ✅");
      setAppSecretDrafts((d) => ({ ...d, [vars.id]: "" }));
      qc.invalidateQueries({ queryKey: ["fb-pages"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });


  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["fb-pages"] });
      qc.invalidateQueries({ queryKey: ["fb-setup-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const saveSettings = useMutation({
    mutationFn: () =>
      updateSettingsFn({
        data: {
          ai_global_enabled: globalAi,
          ai_system_prompt: prompt,
          reply_delay_ms: delay,
          humanize_enabled: humanize,
          strip_markdown: stripMd,
          comment_max_lines: commentMax,
          messenger_length: msgrLen,
          moderation_enabled: modEnabled,
          moderation_action: modAction,
          moderation_block_threshold: modThreshold,
          moderation_block_duration: modDuration,
          moderation_match_threshold: modMatch,
          bad_words: badWordsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
          whitelist_words: whitelistText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["fb-setup-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const testMsg = useMutation({
    mutationFn: (v: { pageId: string; recipientPsid: string; text: string }) => testFn({ data: v }),
    onSuccess: (res: any) => {
      if (res.ok) toast.success("Test message sent!");
      else toast.error(res.error);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const s = status.data;
  const connected = (s?.pageCount ?? 0) > 0;
  const subscribed = (s?.subscribedCount ?? 0) > 0;
  const aiReady = !!(s?.aiEnabled && s?.hasPrompt && (s?.env.hasAiProvider || s?.env.hasLovableAi));
  const envReady = !!(s?.env.hasAppSecret && s?.env.hasVerifyToken && s?.env.hasAppId);
  const milestones = [envReady, connected, subscribed, aiReady];
  const doneCount = milestones.filter(Boolean).length;
  const pct = (doneCount / milestones.length) * 100;

  const explorerUrl = `https://developers.facebook.com/tools/explorer/?method=GET&path=me%2Faccounts&permissions=${PERMS_FOR_LINK}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#1877F2]/10 via-background to-primary/5 p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#1877F2]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-lg shadow-[#1877F2]/30">
              <Facebook className="h-7 w-7" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold sm:text-3xl">Meta Business Suite</h1>
                {connected && subscribed && (
                  <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                    <CheckCircle2 className="h-3 w-3" /> Live
                  </Badge>
                )}
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                Facebook Page connect করুন — Messenger ও Comment-এ AI দিয়ে ২৪/৭ গ্রাহককে উত্তর দিন।
              </p>
            </div>
          </div>
          <div className="min-w-[180px] rounded-2xl border bg-background/70 p-4 backdrop-blur">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Setup progress</span>
              <span className="text-lg font-bold tabular-nums">
                {doneCount}<span className="text-muted-foreground">/{milestones.length}</span>
              </span>
            </div>
            <Progress value={pct} className="mt-2 h-1.5" />
            <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
              {[
                { ok: envReady, label: "Env" },
                { ok: connected, label: "Page" },
                { ok: subscribed, label: "Hook" },
                { ok: aiReady, label: "AI" },
              ].map((m) => (
                <div key={m.label} className={cn("flex flex-col items-center gap-0.5", m.ok ? "text-emerald-600" : "text-muted-foreground/60")}>
                  {m.ok ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-current" />}
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* One-click Business Login (lazychat-style) */}
      <Card className="rounded-2xl border-[#1877F2]/30 bg-gradient-to-br from-[#1877F2]/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white">
                <Facebook className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Connect with Business</h2>
                </div>
                <p className="max-w-md text-sm text-muted-foreground">
                  Facebook popup-এ Business portfolio + Page select করুন → permissions approve করুন → এক click-এ connected। Manual Page ID / Token লাগবে না।
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="gap-2 bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
              onClick={() => oauthStart.mutate()}
              disabled={oauthStart.isPending}
            >
              {oauthStart.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="h-4 w-4" />
              )}
              Continue with Facebook
            </Button>
          </div>

          {/* 4-step flow preview */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: 1, title: "Business portfolio", desc: "যে business connect করবেন সেটা select করুন।" },
              { n: 2, title: "Choose Facebook Page", desc: "যে Page-এ AI reply চান সেটা select করুন।" },
              { n: 3, title: "Review permissions", desc: "Messenger, Comment, Page data access approve করুন।" },
              { n: 4, title: "Done!", desc: "Page connected, webhook auto-subscribed, AI ready।" },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border bg-background/60 p-3 backdrop-blur">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2]/10 text-xs font-bold text-[#1877F2]">
                  {s.n}
                </div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or connect manually</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Tabs defaultValue="connect" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="connect" className="gap-2">
            <Link2 className="h-4 w-4" /> Connect
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" /> AI Reply
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-2">
            <Shield className="h-4 w-4" /> Moderation
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Test
          </TabsTrigger>
        </TabsList>

        {/* ============== CONNECT TAB ============== */}
        <TabsContent value="connect" className="space-y-4">
          {/* Connected pages */}
          {(pages.data?.length ?? 0) > 0 && (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Connected Pages</span>
                  <Badge variant="secondary">{pages.data?.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(pages.data ?? []).map((p) => (
                  <div key={p.id} className="space-y-2 rounded-xl border p-3 transition-colors hover:bg-muted/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2]">
                          <Facebook className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{p.page_name}</div>
                          <div className="text-xs text-muted-foreground">ID: {p.page_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.subscribed ? (
                          <Badge variant="secondary" className="gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">Not subscribed</Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={() => subscribe.mutate(p.id)} disabled={subscribe.isPending}>
                          <Power className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => disconnect.mutate(p.id)} disabled={disconnect.isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Per-page Meta App Secret */}
                    <div className="rounded-lg border bg-muted/30 p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label className="text-xs font-medium">Meta App Secret</Label>
                        {(p as any).has_app_secret ? (
                          <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Saved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600">Not set</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={(p as any).has_app_secret ? "•••••••••• (saved — paste a new one to replace)" : "Meta App → Settings → Basic → App Secret"}
                          value={appSecretDrafts[p.id] ?? ""}
                          onChange={(e) => setAppSecretDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => updateAppSecret.mutate({ id: p.id, appSecret: (appSecretDrafts[p.id] ?? "").trim() })}
                          disabled={updateAppSecret.isPending || !(appSecretDrafts[p.id] ?? "").trim()}
                        >
                          Save
                        </Button>
                        {(p as any).has_app_secret && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateAppSecret.mutate({ id: p.id, appSecret: "" })}
                            disabled={updateAppSecret.isPending}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        প্রত্যেক client-এর Meta App-এর আলাদা App Secret এখানে দিন — webhook signature verify করতে এটাই use হবে।
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Connect new page — main action */}
          <Card className="rounded-2xl border-primary/30 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                {(pages.data?.length ?? 0) > 0 ? "Add another Page" : "Connect your Page"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Page ID + Access Token দিন — আমরা verify করে এক click-এ webhook subscribe করব।
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
                <span className="font-medium">Token নেই?</span>
                <span className="text-muted-foreground">Graph API Explorer-এ ৬টা permission preselected করা আছে —</span>
                <Button asChild size="sm" variant="default" className="h-7">
                  <a href={explorerUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" /> Get Token
                  </a>
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Page ID</Label>
                  <Input
                    value={pageId}
                    onChange={(e) => { setPageId(e.target.value); setVerified(null); setVerifyError(null); }}
                    placeholder="123456789012345"
                  />
                </div>
                <div>
                  <Label className="text-xs">Page Access Token</Label>
                  <Input
                    value={pageToken}
                    onChange={(e) => { setPageToken(e.target.value); setVerified(null); setVerifyError(null); }}
                    placeholder="EAAB..."
                    type="password"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => verify.mutate({ pageId, pageAccessToken: pageToken })}
                  disabled={verify.isPending || !pageId || !pageToken}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {verify.isPending ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  onClick={() => connect.mutate({ pageId, pageAccessToken: pageToken })}
                  disabled={connect.isPending || !verified}
                  title={!verified ? "Verify first" : undefined}
                >
                  {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                  Connect & Subscribe
                </Button>
              </div>

              {verifyError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">Verification failed</div>
                    <div className="opacity-80">{verifyError}</div>
                  </div>
                </div>
              )}

              {verified && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> {verified.pageName} — ready to connect
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    ID: {verified.pageId}
                    {verified.category && ` · ${verified.category}`}
                    {verified.followers !== null && ` · ${verified.followers.toLocaleString()} followers`}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook (collapsed by default) */}
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="webhook" className="rounded-2xl border bg-card px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Webhook config (Meta Console-এ paste করার জন্য)
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {isAdmin ? (
                  <>
                    <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-[11px] text-blue-700 dark:text-blue-300">
                      💡 Admin: নিচে নিজের domain (যেমন <b>https://codex.business</b>) ও নিজের Verify Token দিয়ে Save করুন — Meta Console-এ এই value-গুলোই paste করতে হবে।
                    </div>
                    <WebhookConfigEditor
                      initialBase={branding.data?.webhook_base_url ?? ""}
                      initialToken={branding.data?.webhook_verify_token ?? ""}
                      onSave={async (base, token) => {
                        await saveBrandingFn({
                          data: {
                            brand_name: branding.data?.brand_name ?? "",
                            phone: branding.data?.phone ?? "",
                            website: branding.data?.website ?? "",
                            webhook_base_url: base,
                            webhook_verify_token: token,
                          },
                        });
                        await qc.invalidateQueries({ queryKey: ["branding"] });
                        await qc.invalidateQueries({ queryKey: ["fb-global-webhook"] });
                        toast.success("Webhook config saved ✅");
                      }}
                    />
                  </>
                ) : (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-[11px] text-emerald-700 dark:text-emerald-300">
                    ✅ নিচের Callback URL ও Verify Token — Meta Console-এ paste করুন। এগুলো platform admin দ্বারা configure করা; আপনাকে edit করতে হবে না।
                  </div>
                )}
                <div>
                  <Label className="text-xs">Callback URL (live)</Label>
                  <div className="mt-1 flex gap-2">
                    <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(webhookUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Verify Token (live)</Label>
                  <div className="mt-1 flex gap-2">
                    <Input readOnly value={verifyToken} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(verifyToken)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Subscribe fields: <code>messages</code>, <code>messaging_postbacks</code>, <code>feed</code>
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="perms" className="rounded-2xl border bg-card px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Permission status checker
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4 text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Live verify করে দেখাবে কোন permission enabled আছে।</p>
                  <Button size="sm" variant="outline" onClick={() => perms.refetch()} disabled={perms.isFetching || (pages.data?.length ?? 0) === 0}>
                    {perms.isFetching ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                    {perms.data ? "Re-check" : "Check now"}
                  </Button>
                </div>
                {perms.data?.pages.map((p) => (
                  <div key={p.id} className="space-y-2 rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{p.page_name}</div>
                      {p.tokenValid ? (
                        p.ok ? (
                          <Badge variant="secondary" className="gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> All set</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> Missing perms</Badge>
                        )
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Token invalid</Badge>
                      )}
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {p.permissions.map((perm) => (
                        <div key={perm.key} className={cn("flex items-start gap-2 rounded-md border p-2", perm.granted ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                          {perm.granted ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                          <div>
                            <div className="font-mono text-[11px]">{perm.label}</div>
                            <div className="text-[10px] text-muted-foreground">{perm.purpose}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!p.ok && p.tokenValid && (
                      <ReconnectWizard
                        pageId={p.page_id}
                        pageName={p.page_name}
                        missing={p.permissions.filter((x) => !x.granted).map((x) => x.key)}
                        onSubmit={(token) => updateToken.mutate({ id: p.id, pageAccessToken: token })}
                        submitting={updateToken.isPending}
                      />
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="help" className="rounded-2xl border bg-card px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  কীভাবে Meta App ও Token তৈরি করব?
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4 text-xs text-muted-foreground">
                <Step n={1} title="Meta App তৈরি করুন">
                  developers.facebook.com → My Apps → Create App → <strong>Business</strong> type → Messenger + Webhooks product add করুন।
                </Step>
                <Step n={2} title="Permission request করুন">
                  App Review → Permissions and Features → প্রতিটায় "Request Advanced Access":
                  <div className="mt-1 flex flex-wrap gap-1">
                    {["pages_messaging", "pages_show_list", "pages_read_engagement", "pages_manage_engagement", "pages_read_user_content", "pages_manage_metadata"].map((p) => (
                      <Badge key={p} variant="outline" className="font-mono text-[10px]">{p}</Badge>
                    ))}
                  </div>
                </Step>
                <Step n={3} title="Webhook configure">
                  উপরের "Webhook config" সেকশন থেকে Callback URL ও Verify Token copy করে Meta Console-এ paste করুন। Subscribe fields: <code>messages</code>, <code>messaging_postbacks</code>, <code>feed</code>।
                </Step>
                <Step n={4} title="Page Access Token নিন">
                  "Get Token" button-এ ক্লিক করে Graph API Explorer খুলুন → Generate Access Token → আপনার Page select করুন → token copy করুন।
                </Step>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ============== AI TAB ============== */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">Global AI auto-reply</div>
                  <div className="text-xs text-muted-foreground">সব conversation-এ default — chat-প্রতি override available</div>
                </div>
                <Switch checked={globalAi} onCheckedChange={setGlobalAi} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <Label className="text-xs font-medium">Humanize replies</Label>
                    <p className="text-[11px] text-muted-foreground">বন্ধুর মতো বাংলা টোন</p>
                  </div>
                  <Switch checked={humanize} onCheckedChange={setHumanize} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <Label className="text-xs font-medium">Strip markdown</Label>
                    <p className="text-[11px] text-muted-foreground">**bold**, ###, bullet remove</p>
                  </div>
                  <Switch checked={stripMd} onCheckedChange={setStripMd} />
                </div>
                <div>
                  <Label className="text-xs">Reply delay (ms)</Label>
                  <Input type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value) || 0)} min={0} max={10000} />
                </div>
                <div>
                  <Label className="text-xs">Comment reply max lines</Label>
                  <Input type="number" min={1} max={10} value={commentMax} onChange={(e) => setCommentMax(Math.max(1, Math.min(10, Number(e.target.value) || 3)))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Messenger reply length</Label>
                  <Select value={msgrLen} onValueChange={(v) => setMsgrLen(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (context অনুযায়ী)</SelectItem>
                      <SelectItem value="short">Short (১-২ লাইন)</SelectItem>
                      <SelectItem value="detailed">Detailed (৪-৭ লাইন)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">System prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                  placeholder={`তুমি [ব্র্যান্ডের নাম] এর কাস্টমার সাপোর্ট। বন্ধুর মতো সহজ বাংলায় উত্তর দাও।\nডেলিভারি: ঢাকা ৬০৳, বাইরে ১২০৳।\nঅর্ডার নিতে চাইলে নাম, ফোন, ঠিকানা চাও।`}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Active products top 20 auto inject হয় — prompt-এ আবার সব price লেখা লাগবে না।
                </p>
              </div>

              <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="w-full sm:w-auto">
                {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save AI settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== MODERATION TAB ============== */}
        <TabsContent value="moderation" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" /> Comment Moderation
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                গালি/বাজে কথা auto hide/delete। বারবার করলে page থেকে block। শুধু public comments-এ কাজ করে।
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">Enable bad-word moderation</div>
                  <div className="text-xs text-muted-foreground">Off থাকলে কোনো comment moderate হবে না</div>
                </div>
                <Switch checked={modEnabled} onCheckedChange={setModEnabled} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Action</Label>
                  <Select value={modAction} onValueChange={(v) => setModAction(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hide">Hide</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Block after</Label>
                  <Input type="number" min={1} max={10} value={modThreshold} onChange={(e) => setModThreshold(Math.max(1, Math.min(10, Number(e.target.value) || 3)))} />
                </div>
                <div>
                  <Label className="text-xs">Block duration</Label>
                  <Select value={modDuration} onValueChange={(v) => setModDuration(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Match strictness — {modMatch}% {modMatch >= 100 ? "(exact only)" : modMatch >= 80 ? "(strict fuzzy)" : "(loose fuzzy)"}</Label>
                <Select value={String(modMatch)} onValueChange={(v) => setModMatch(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50% — loose (typo/variant catch)</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="80">80% — recommended</SelectItem>
                    <SelectItem value="90">90% — strict</SelectItem>
                    <SelectItem value="100">100% — exact substring only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">কম % = বেশি match (typo সহ ধরবে), বেশি % = কঠোর।</p>
              </div>

              <div>
                <Label className="text-xs">Bad words (comma বা newline separated)</Label>
                <Textarea rows={4} value={badWordsText} onChange={(e) => setBadWordsText(e.target.value)} placeholder="যেমন: fuck, idiot, ..." className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Whitelist (ignore substring)</Label>
                <Textarea rows={2} value={whitelistText} onChange={(e) => setWhitelistText(e.target.value)} placeholder="brand name..." className="text-xs" />
              </div>

              <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? "Saving..." : "Save moderation"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== TEST TAB ============== */}
        <TabsContent value="test" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Send a test message</CardTitle>
              <p className="text-xs text-muted-foreground">
                আপনার personal account থেকে Page-এ message পাঠান, /chats থেকে PSID copy করে এখানে paste করুন।
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(s?.messageCount ?? 0) > 0 && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-600">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  {s?.messageCount} message(s) received — webhook + AI loop working!
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">From Page</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={pageId || (pages.data?.[0]?.page_id ?? "")}
                    onChange={(e) => setPageId(e.target.value)}
                  >
                    {(pages.data ?? []).map((p) => (
                      <option key={p.id} value={p.page_id}>{p.page_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Recipient PSID</Label>
                  <Input value={testPsid} onChange={(e) => setTestPsid(e.target.value)} placeholder="123456789012345" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Input value={testText} onChange={(e) => setTestText(e.target.value)} />
              </div>
              <Button
                onClick={() => testMsg.mutate({ pageId: pageId || (pages.data?.[0]?.page_id ?? ""), recipientPsid: testPsid, text: testText })}
                disabled={testMsg.isPending || !testPsid || !testText || (pages.data?.length ?? 0) === 0}
              >
                {testMsg.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send test message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{n}</div>
      <div className="flex-1 space-y-1">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="text-[11px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function ReconnectWizard({
  pageId,
  pageName,
  missing,
  onSubmit,
  submitting,
}: {
  pageId: string;
  pageName: string;
  missing: string[];
  onSubmit: (token: string) => void;
  submitting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const explorerUrl = `https://developers.facebook.com/tools/explorer/?method=GET&path=${encodeURIComponent(`${pageId}?fields=id,name`)}&permissions=${PERMS_FOR_LINK}`;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-amber-700 dark:text-amber-400"
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          Token regenerate করুন ({missing.length} missing)
        </span>
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs">
          <Button asChild size="sm" variant="outline">
            <a href={explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-3 w-3" /> Open Graph API Explorer ({pageName})
            </a>
          </Button>
          <Textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={3}
            className="font-mono text-[11px]"
            placeholder="New Page Access Token (EAAB...)"
          />
          <Button size="sm" onClick={() => onSubmit(token.trim())} disabled={submitting || token.trim().length < 20}>
            {submitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
            Update token
          </Button>
        </div>
      )}
    </div>
  );
}

function WebhookConfigEditor({
  initialBase,
  initialToken,
  onSave,
}: {
  initialBase: string;
  initialToken: string;
  onSave: (base: string, token: string) => Promise<void>;
}) {
  const [base, setBase] = useState(initialBase);
  const [token, setToken] = useState(initialToken);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setBase(initialBase);
    setToken(initialToken);
  }, [initialBase, initialToken]);
  const handle = async () => {
    setSaving(true);
    try {
      await onSave(base.trim(), token.trim());
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed (admin only)");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="grid gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label className="text-xs">Your domain (Webhook base URL)</Label>
        <Input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="https://codex.business"
          className="mt-1 font-mono text-xs"
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs">Verify Token (you choose)</Label>
        <Input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="my-secret-verify-token"
          className="mt-1 font-mono text-xs"
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button size="sm" onClick={handle} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
          Save webhook config
        </Button>
      </div>
    </div>
  );
}
