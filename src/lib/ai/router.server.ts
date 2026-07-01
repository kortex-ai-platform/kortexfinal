import { AdapterFailure, getAdapter } from "./adapters.server";
import type { AdapterResult, AnyPayload, Category, MessageType, ProviderRow, RequestStatus } from "./types";

interface Sb {
  from: (t: string) => any;
}

async function loadProviders(
  supabase: Sb,
  category: Category,
  workspaceId?: string | null,
): Promise<ProviderRow[]> {
  let query = supabase
    .from("ai_providers")
    .select("*")
    .eq("category", category)
    .eq("enabled", true)
    .order("is_primary", { ascending: false })
    .order("priority", { ascending: true })
    .order("weight", { ascending: false });

  // Platform providers are shared globally with workspace_id = NULL.
  // Workspace-scoped providers still work as overrides for that workspace.
  if (workspaceId) {
    query = query.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProviderRow[];
}

async function recordHealth(
  supabase: Sb,
  provider: ProviderRow,
  ok: boolean,
  responseMs: number,
  error?: string,
) {
  const { data: cur } = await supabase
    .from("ai_provider_health")
    .select("avg_response_ms,success_count,failure_count,consecutive_failures")
    .eq("provider_id", provider.id)
    .maybeSingle();

  const success = Number(cur?.success_count ?? 0);
  const failure = Number(cur?.failure_count ?? 0);
  const total = success + failure;
  const prevAvg = Number(cur?.avg_response_ms ?? 0);
  const newAvg = Math.round((prevAvg * total + responseMs) / Math.max(total + 1, 1));
  const consec = ok ? 0 : Number(cur?.consecutive_failures ?? 0) + 1;
  const status = ok
    ? "online"
    : consec >= 3
      ? "offline"
      : "error";

  await supabase
    .from("ai_provider_health")
    .upsert(
      {
        provider_id: provider.id,
        status,
        avg_response_ms: newAvg,
        success_count: success + (ok ? 1 : 0),
        failure_count: failure + (ok ? 0 : 1),
        consecutive_failures: consec,
        last_success_at: ok ? new Date().toISOString() : cur ? undefined : null,
        last_failure_at: ok ? undefined : new Date().toISOString(),
        last_error: ok ? null : error?.slice(0, 500) ?? null,
      },
      { onConflict: "provider_id" },
    );
}

async function writeLog(
  supabase: Sb,
  row: {
    category: Category;
    message_type: MessageType;
    provider_id: string | null;
    provider_name: string | null;
    attempt: number;
    failover_from: string | null;
    status: RequestStatus;
    response_ms: number;
    error_code?: string | null;
    error_message?: string | null;
    prompt_preview?: string | null;
    workspace_id?: string | null;
  },
) {
  await supabase.from("ai_request_logs").insert(row);
}

export interface RouteResult extends AdapterResult {
  providerId: string;
  providerName: string;
  attempts: number;
  failovers: string[];
  responseMs: number;
}

export async function aiRoute(
  supabase: Sb,
  args: { category: Category; messageType?: MessageType; payload: AnyPayload; workspaceId?: string | null },
): Promise<RouteResult> {
  const providers = await loadProviders(supabase, args.category, args.workspaceId);
  if (providers.length === 0) {
    throw new Error(`No enabled providers for category "${args.category}"`);
  }
  const messageType: MessageType = args.messageType ?? (args.category as MessageType);
  const promptPreview = ((args.payload as any).prompt || (args.payload as any).input || "")
    .toString()
    .slice(0, 200);

  let lastError: AdapterFailure | null = null;
  let prev: ProviderRow | null = null;
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const adapter = getAdapter(p.vendor);
    const t0 = Date.now();
    try {
      const result = await adapter.call(p, args.payload);
      const ms = Date.now() - t0;
      await Promise.allSettled([
        recordHealth(supabase, p, true, ms),
        writeLog(supabase, {
          category: args.category,
          message_type: messageType,
          provider_id: p.id,
          provider_name: p.name,
          attempt: i + 1,
          failover_from: prev?.id ?? null,
          status: "success",
          response_ms: ms,
          prompt_preview: promptPreview,
          workspace_id: args.workspaceId ?? null,
        }),
      ]);
      return {
        ...result,
        providerId: p.id,
        providerName: p.name,
        attempts: i + 1,
        failovers: providers.slice(0, i).map((x) => x.name),
        responseMs: ms,
      };
    } catch (e) {
      const ms = Date.now() - t0;
      const fail =
        e instanceof AdapterFailure
          ? e
          : new AdapterFailure({ status: "api_error", message: String((e as any)?.message ?? e) });
      lastError = fail;
      await Promise.allSettled([
        recordHealth(supabase, p, false, ms, fail.err.message),
        writeLog(supabase, {
          category: args.category,
          message_type: messageType,
          provider_id: p.id,
          provider_name: p.name,
          attempt: i + 1,
          failover_from: prev?.id ?? null,
          status: fail.err.status,
          response_ms: ms,
          error_code: fail.err.code ?? null,
          error_message: fail.err.message,
          prompt_preview: promptPreview,
          workspace_id: args.workspaceId ?? null,
        }),
      ]);
      prev = p;
    }
  }
  throw new Error(
    `All ${providers.length} providers failed for "${args.category}". Last error: ${lastError?.err.message ?? "unknown"}`,
  );
}

export async function pingProviderById(supabase: Sb, id: string) {
  const { data, error } = await supabase
    .from("ai_providers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "Provider not found");
  const p = data as ProviderRow;
  const adapter = getAdapter(p.vendor);
  const t0 = Date.now();
  try {
    await adapter.ping(p);
    await recordHealth(supabase, p, true, Date.now() - t0);
    return { ok: true, responseMs: Date.now() - t0 };
  } catch (e) {
    const fail =
      e instanceof AdapterFailure
        ? e
        : new AdapterFailure({ status: "api_error", message: String((e as any)?.message ?? e) });
    await recordHealth(supabase, p, false, Date.now() - t0, fail.err.message);
    return { ok: false, message: fail.err.message };
  }
}