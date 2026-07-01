import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listMyWhatsapp,
  connectMyWhatsappAccount,
  deleteMyWhatsappAccount,
  addMyWhatsappNumber,
  deleteMyWhatsappNumber,
} from "@/lib/user-whatsapp.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  MessageCircle,
  ExternalLink,
  Copy,
  CheckCircle2,
  Circle,
  Info,
  Phone,
} from "lucide-react";

const WEBHOOK_URL = "https://ai-messenger-magic.lovable.app/api/public/wa/webhook";
const VERIFY_TOKEN = "kortex.business.admin";

export const Route = createFileRoute("/app/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp Connect — kortex Ai" }] }),
  component: WhatsAppPage,
});

function copy(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} কপি করা হয়েছে`));
}

function WhatsAppPage() {
  const list = useServerFn(listMyWhatsapp);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-wa"], queryFn: () => list() });
  const refetch = () => qc.invalidateQueries({ queryKey: ["my-wa"] });

  const delAccFn = useServerFn(deleteMyWhatsappAccount);
  const delNumFn = useServerFn(deleteMyWhatsappNumber);
  const delAcc = useMutation({
    mutationFn: (id: string) => delAccFn({ data: { id } }),
    onSuccess: () => { toast.success("Account সরানো হয়েছে"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delNum = useMutation({
    mutationFn: (id: string) => delNumFn({ data: { id } }),
    onSuccess: () => { toast.success("Number সরানো হয়েছে"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const accounts = data?.accounts ?? [];
  const numbers = data?.numbers ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-green-500/10 p-2 text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">WhatsApp Connect</h1>
          <p className="text-sm text-muted-foreground">
            আপনার WhatsApp Business number কে AI-এর সাথে যুক্ত করুন — customer message
            আসলে AI নিজে থেকেই reply দিবে।
          </p>
        </div>
      </div>

      {/* Setup guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">কিভাবে connect করবেন — ৪টা সহজ ধাপ</CardTitle>
          <CardDescription>
            নিচের ধাপগুলো follow করলে ৫-১০ মিনিটে WhatsApp AI reply চালু হয়ে যাবে।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Step
            n={1}
            title="Meta Business-এ WhatsApp Business Account (WABA) তৈরি করুন"
            body={
              <>
                <a
                  href="https://business.facebook.com/wa/manage/home/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  business.facebook.com/wa/manage <ExternalLink className="h-3 w-3" />
                </a>{" "}
                — এখানে গিয়ে আপনার business-এর জন্য একটা WhatsApp Business Account তৈরি
                করুন এবং একটা phone number verify করে যুক্ত করুন। আগে থেকে থাকলে skip করুন।
              </>
            }
          />
          <Step
            n={2}
            title="Permanent Access Token generate করুন (System User)"
            body={
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Meta Business Suite → <b>Settings → Business Settings → Users → System Users</b></li>
                <li>নতুন System User বানান (role: Admin), তারপর <b>Generate New Token</b></li>
                <li>App select করুন, permissions দিন: <code className="rounded bg-muted px-1">whatsapp_business_messaging</code> ও <code className="rounded bg-muted px-1">whatsapp_business_management</code></li>
                <li>Token টা <b>Never expires</b> রেখে generate করে copy করে রাখুন</li>
              </ol>
            }
          />
          <Step
            n={3}
            title="WABA-এ Webhook subscribe করুন"
            body={
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Meta App Dashboard → <b>WhatsApp → Configuration → Webhooks</b>-এ গিয়ে
                  নিচের তথ্য বসান এবং <b>messages</b> field-এ subscribe করুন:
                </p>
                <CopyRow label="Callback URL" value={WEBHOOK_URL} />
                <CopyRow label="Verify Token" value={VERIFY_TOKEN} />
                <p className="text-xs text-muted-foreground">
                  Verify করার পর WABA-এর পাশে <b>Subscribe</b> button click করুন —
                  এতে করে customer message আপনার AI-এর কাছে পৌঁছাবে।
                </p>
              </div>
            }
          />
          <Step
            n={4}
            title="নিচের form পূরণ করে account + number connect করুন"
            body={
              <p className="text-muted-foreground">
                <b>WABA ID</b> এবং <b>Phone Number ID</b> Meta-র WhatsApp Manager-এর
                phone number-এর পাশে <b>API Setup</b>-এ পাবেন। ঐ দুটো ID এবং উপরে
                বানানো access token বসিয়ে নিচে <b>Connect</b> করুন।
              </p>
            }
          />
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <StatusRow
            done={accounts.length > 0}
            label="WABA account যুক্ত করা হয়েছে"
          />
          <StatusRow
            done={numbers.length > 0}
            label="Phone number যুক্ত করা হয়েছে"
          />
          <StatusRow
            done={accounts.some((a: any) => a.is_connected)}
            label="Access token active"
          />
          <StatusRow
            done={accounts.length > 0 && numbers.length > 0 && accounts.some((a: any) => a.is_connected)}
            label="AI auto-reply চালু"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <AccountDialog onSaved={refetch} />
        <NumberDialog accounts={accounts} onSaved={refetch} />
      </div>

      {/* Accounts list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">আপনার WABA accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              এখনও কোনো WABA account যুক্ত করা হয়নি। উপরে <b>Connect WABA</b> click করুন।
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      <Badge variant={a.is_connected ? "default" : "secondary"}>
                        {a.is_connected ? "Connected" : "Token missing"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">WABA ID: {a.waba_id}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm(`"${a.name}" delete করবেন?`) && delAcc.mutate(a.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Numbers list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phone numbers</CardTitle>
        </CardHeader>
        <CardContent>
          {numbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              কোনো number যুক্ত নেই। WABA account তৈরির পর <b>Add phone number</b> button ব্যবহার করুন।
            </p>
          ) : (
            <div className="space-y-2">
              {numbers.map((n: any) => (
                <div key={n.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{n.display_phone_number}</div>
                      <p className="text-xs text-muted-foreground">
                        {n.verified_name || "—"} • ID: {n.phone_number_id}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm("Number delete করবেন?") && delNum.mutate(n.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>টিপস</AlertTitle>
        <AlertDescription className="text-xs">
          Access token এবং WABA ID শুধু আপনার workspace-এ save হয় — অন্য কোনো client দেখতে পাবে না।
          Token change হলে account remove করে আবার add করুন।
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-medium">{title}</p>
        <div className="text-sm">{body}</div>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-xs">{value}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => copy(value, label)}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function AccountDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [token, setToken] = useState("");
  const save = useServerFn(connectMyWhatsappAccount);
  const mut = useMutation({
    mutationFn: () => save({ data: { name, waba_id: wabaId, business_id: businessId || undefined, access_token: token || undefined } }),
    onSuccess: () => {
      toast.success("WABA account যুক্ত হয়েছে");
      setOpen(false);
      setName(""); setWabaId(""); setBusinessId(""); setToken("");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MessageCircle className="mr-2 h-4 w-4" /> Connect WABA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp Business Account যুক্ত করুন</DialogTitle>
          <DialogDescription>
            Meta Business Suite থেকে WABA ID এবং permanent access token নিয়ে বসান।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Business name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: Kochran Academy" />
          </div>
          <div>
            <Label>WABA ID</Label>
            <Input value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="12-15 digit numeric ID" />
            <p className="mt-1 text-xs text-muted-foreground">WhatsApp Manager → Account tools → API Setup-এ পাবেন।</p>
          </div>
          <div>
            <Label>Business ID (optional)</Label>
            <Input value={businessId} onChange={(e) => setBusinessId(e.target.value)} />
          </div>
          <div>
            <Label>Permanent Access Token</Label>
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB..." />
            <p className="mt-1 text-xs text-muted-foreground">System User token — never expires সহ generate করুন।</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!name || !wabaId || mut.isPending}>
            {mut.isPending ? "Saving…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberDialog({ accounts, onSaved }: { accounts: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [pnId, setPnId] = useState("");
  const [display, setDisplay] = useState("");
  const [verified, setVerified] = useState("");
  const save = useServerFn(addMyWhatsappNumber);
  const mut = useMutation({
    mutationFn: () => save({ data: { whatsapp_account_id: accountId, phone_number_id: pnId, display_phone_number: display, verified_name: verified || undefined } }),
    onSuccess: () => {
      toast.success("Phone number যুক্ত হয়েছে");
      setOpen(false);
      setPnId(""); setDisplay(""); setVerified("");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={accounts.length === 0}>
          <Phone className="mr-2 h-4 w-4" /> Add phone number
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp phone number যুক্ত করুন</DialogTitle>
          <DialogDescription>
            Meta WhatsApp Manager-এর API Setup section থেকে Phone Number ID কপি করে বসান।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>WABA account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Phone Number ID</Label>
            <Input value={pnId} onChange={(e) => setPnId(e.target.value)} placeholder="123456789012345" />
            <p className="mt-1 text-xs text-muted-foreground">
              ⚠️ এটা display number নয় — Meta-র numeric ID। WhatsApp Manager → Phone numbers → API Setup।
            </p>
          </div>
          <div>
            <Label>Display number</Label>
            <Input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="+880 1XXXXXXXXX" />
          </div>
          <div>
            <Label>Verified name (optional)</Label>
            <Input value={verified} onChange={(e) => setVerified(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!accountId || !pnId || !display || mut.isPending}>
            {mut.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
