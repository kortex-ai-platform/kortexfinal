import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Mail,
  Phone,
  Calendar,
  Search,
  ChevronRight,
} from "lucide-react";

import {
  listClients,
  upsertClient,
  deleteClient,
  setClientStatus,
  listClientOptions,
} from "@/lib/clients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/clients")({
  head: () => ({ meta: [{ title: "Clients — kortex Ai Admin" }] }),
  component: ClientsPage,
});

type Status = "active" | "paused" | "expired" | "cancelled";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  services: string[];
  credentials: Record<string, any>;
  fb_page_id: string | null;
  ai_provider_id: string | null;
  started_at: string;
  expires_at: string | null;
  status: Status;
  monthly_fee: number | null;
  created_at: string;
  updated_at: string;
};

type Options = {
  fb_pages: { page_id: string; page_name: string }[];
  ai_providers: { id: string; name: string; vendor: string }[];
};

const SERVICE_OPTIONS = [
  "FB Automation",
  "AI Auto-Reply",
  "Comment Moderation",
  "FB Post Generator",
  "Image Generator",
  "Online Shop",
  "Order Management",
  "Analytics",
] as const;

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  expired: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  cancelled: "bg-muted text-muted-foreground",
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

function daysLeft(s: string | null | undefined): number | null {
  if (!s) return null;
  const d = new Date(s).getTime() - Date.now();
  return Math.ceil(d / 86_400_000);
}

function effectiveStatus(c: ClientRow): Status {
  if (c.status === "cancelled" || c.status === "paused") return c.status;
  const left = daysLeft(c.expires_at);
  if (left !== null && left < 0) return "expired";
  return "active";
}

const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  services: [] as string[],
  fb_page_id: "",
  ai_provider_id: "",
  started_at: "",
  expires_at: "",
  status: "active" as Status,
  monthly_fee: "" as string,
  cred_fb_access_note: "",
  cred_ai_provider_name: "",
  cred_extra: "",
};

function ClientsPage() {
  const [items, setItems] = useState<ClientRow[]>([]);
  const [opts, setOpts] = useState<Options>({ fb_pages: [], ai_providers: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [rows, o] = await Promise.all([listClients(), listClientOptions()]);
      setItems(rows as ClientRow[]);
      setOpts(o as Options);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      const eff = effectiveStatus(c);
      if (statusFilter !== "all" && eff !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    let active = 0,
      expiring = 0,
      expired = 0;
    let mrr = 0;
    for (const c of items) {
      const eff = effectiveStatus(c);
      if (eff === "active") active++;
      if (eff === "expired") expired++;
      const left = daysLeft(c.expires_at);
      if (eff === "active" && left !== null && left <= 7) expiring++;
      if (eff === "active" && c.monthly_fee) mrr += Number(c.monthly_fee);
    }
    return { total, active, expiring, expired, mrr };
  }, [items]);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  }

  function openEdit(c: ClientRow) {
    setForm({
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      notes: c.notes ?? "",
      services: c.services ?? [],
      fb_page_id: c.fb_page_id ?? "",
      ai_provider_id: c.ai_provider_id ?? "",
      started_at: c.started_at ? c.started_at.slice(0, 10) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      status: c.status,
      monthly_fee: c.monthly_fee != null ? String(c.monthly_fee) : "",
      cred_fb_access_note: c.credentials?.fb_access_note ?? "",
      cred_ai_provider_name: c.credentials?.ai_provider_name ?? "",
      cred_extra: c.credentials?.extra ?? "",
    });
    setDetail(null);
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name দরকার");
      return;
    }
    setSaving(true);
    try {
      const fbName =
        opts.fb_pages.find((p) => p.page_id === form.fb_page_id)?.page_name ?? null;
      const aiName =
        opts.ai_providers.find((p) => p.id === form.ai_provider_id)?.name ?? null;
      await upsertClient({
        data: {
          id: form.id,
          name: form.name.trim(),
          email: form.email,
          phone: form.phone,
          company: form.company,
          notes: form.notes,
          services: form.services,
          fb_page_id: form.fb_page_id,
          ai_provider_id: form.ai_provider_id || null,
          started_at: form.started_at
            ? new Date(form.started_at).toISOString()
            : new Date().toISOString(),
          expires_at: form.expires_at
            ? new Date(form.expires_at).toISOString()
            : "",
          status: form.status,
          monthly_fee:
            form.monthly_fee.trim() === "" ? null : Number(form.monthly_fee),
          credentials: {
            fb_page_name: fbName,
            ai_provider_name: aiName,
            fb_access_note: form.cred_fb_access_note,
            extra: form.cred_extra,
          },
        },
      });
      toast.success(form.id ? "Client updated" : "Client added");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: ClientRow) {
    if (!confirm(`Delete client "${c.name}"?`)) return;
    try {
      await deleteClient({ data: { id: c.id } });
      toast.success("Client deleted");
      setDetail(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function changeStatus(c: ClientRow, status: Status) {
    try {
      await setClientStatus({ data: { id: c.id, status } });
      toast.success("Status updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function toggleService(s: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s)
        ? f.services.filter((x) => x !== s)
        : [...f.services, s],
    }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Super admin panel — সব client এর profile, service, credentials ও
            duration এক জায়গায়।
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> New client
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Total" value={stats.total} />
        <StatCard
          icon={Users}
          label="Active"
          value={stats.active}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Calendar}
          label="Expiring ≤7d"
          value={stats.expiring}
          tone="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Building2}
          label="MRR"
          value={`৳${stats.mrr.toLocaleString()}`}
        />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name, email, company…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as any)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              No clients yet. Click "New client" to add one.
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {filtered.map((c) => {
                const eff = effectiveStatus(c);
                const left = daysLeft(c.expires_at);
                return (
                  <button
                    key={c.id}
                    onClick={() => setDetail(c)}
                    className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{c.name}</span>
                        {c.company && (
                          <span className="truncate text-xs text-muted-foreground">
                            · {c.company}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {c.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(c.expires_at) === "—"
                            ? "No expiry"
                            : `Expires ${fmtDate(c.expires_at)}`}
                          {left !== null && eff === "active" && left <= 14 && (
                            <span
                              className={
                                left <= 3
                                  ? "ml-1 text-rose-500"
                                  : "ml-1 text-amber-500"
                              }
                            >
                              ({left}d left)
                            </span>
                          )}
                        </span>
                      </div>
                      {c.services.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.services.slice(0, 4).map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              {s}
                            </Badge>
                          ))}
                          {c.services.length > 4 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              +{c.services.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge className={`capitalize ${STATUS_STYLES[eff]}`}>
                      {eff}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detail.name}
                  <Badge
                    className={`capitalize ${STATUS_STYLES[effectiveStatus(detail)]}`}
                  >
                    {effectiveStatus(detail)}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {detail.company && (
                  <Row label="Company" value={detail.company} />
                )}
                {detail.email && <Row label="Email" value={detail.email} />}
                {detail.phone && <Row label="Phone" value={detail.phone} />}

                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                    Duration
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div>{fmtDate(detail.started_at)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Expires</div>
                      <div>
                        {fmtDate(detail.expires_at)}
                        {(() => {
                          const left = daysLeft(detail.expires_at);
                          if (left === null) return null;
                          return (
                            <span
                              className={`ml-1 text-xs ${
                                left < 0
                                  ? "text-rose-500"
                                  : left <= 7
                                    ? "text-amber-500"
                                    : "text-muted-foreground"
                              }`}
                            >
                              ({left < 0 ? `${-left}d ago` : `${left}d left`})
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {detail.monthly_fee != null && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Monthly fee: </span>
                      ৳{Number(detail.monthly_fee).toLocaleString()}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                    Services / Systems
                  </div>
                  {detail.services.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detail.services.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                    Credentials
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <Row
                      label="FB Page"
                      value={
                        detail.credentials?.fb_page_name ||
                        detail.fb_page_id ||
                        "—"
                      }
                    />
                    <Row
                      label="AI Provider"
                      value={detail.credentials?.ai_provider_name || "—"}
                    />
                    {detail.credentials?.fb_access_note && (
                      <Row
                        label="FB Note"
                        value={detail.credentials.fb_access_note}
                      />
                    )}
                    {detail.credentials?.extra && (
                      <Row label="Extra" value={detail.credentials.extra} />
                    )}
                  </div>
                </div>

                {detail.notes && (
                  <div>
                    <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
                      Notes
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {detail.notes}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={() => openEdit(detail)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  {effectiveStatus(detail) === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus(detail, "paused")}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus(detail, "active")}
                    >
                      Resume
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(detail)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit / Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit client" : "New client"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Company">
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Services / Systems">
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
                {SERVICE_OPTIONS.map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={form.services.includes(s)}
                      onCheckedChange={() => toggleService(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="FB Page">
                <Select
                  value={form.fb_page_id || "__none"}
                  onValueChange={(v) =>
                    setForm({ ...form, fb_page_id: v === "__none" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— None —</SelectItem>
                    {opts.fb_pages.map((p) => (
                      <SelectItem key={p.page_id} value={p.page_id}>
                        {p.page_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="AI Provider">
                <Select
                  value={form.ai_provider_id || "__none"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      ai_provider_id: v === "__none" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— None —</SelectItem>
                    {opts.ai_providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.vendor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Started">
                <Input
                  type="date"
                  value={form.started_at}
                  onChange={(e) =>
                    setForm({ ...form, started_at: e.target.value })
                  }
                />
              </Field>
              <Field label="Expires">
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm({ ...form, expires_at: e.target.value })
                  }
                />
              </Field>
              <Field label="Monthly fee (৳)">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.monthly_fee}
                  onChange={(e) =>
                    setForm({ ...form, monthly_fee: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as Status })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="FB access note (optional)">
              <Input
                placeholder="e.g. Page admin via owner FB account"
                value={form.cred_fb_access_note}
                onChange={(e) =>
                  setForm({ ...form, cred_fb_access_note: e.target.value })
                }
              />
            </Field>
            <Field label="Other credentials / setup notes">
              <Textarea
                rows={2}
                placeholder="Any non-secret reference info"
                value={form.cred_extra}
                onChange={(e) =>
                  setForm({ ...form, cred_extra: e.target.value })
                }
              />
            </Field>

            <Field label="Notes">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-xl font-semibold ${tone ?? ""}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
