import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle2, Plus } from "lucide-react";

import {
  listPrompts,
  upsertPrompt,
  deletePrompt,
  setActivePrompt,
} from "@/lib/prompts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/prompts")({
  head: () => ({ meta: [{ title: "Prompt Manager — kortex Ai" }] }),
  component: PromptsPage,
});

type PromptRow = {
  id: string;
  name: string;
  language: "en" | "bn" | "both";
  content: string;
  is_active: boolean;
  updated_at: string;
};

function PromptsPage() {
  const [items, setItems] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromptRow | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"en" | "bn" | "both">("both");
  const [content, setContent] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const rows = (await listPrompts()) as PromptRow[];
      setItems(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setEditing(null);
    setName("");
    setLanguage("both");
    setContent(
      "You are a Facebook sales assistant. Always answer in Bangla. Try to collect customer order details politely.",
    );
    setOpen(true);
  }

  function startEdit(p: PromptRow) {
    setEditing(p);
    setName(p.name);
    setLanguage(p.language);
    setContent(p.content);
    setOpen(true);
  }

  async function save() {
    try {
      await upsertPrompt({
        data: { id: editing?.id, name, language, content },
      });
      toast.success("Prompt saved");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function activate(id: string) {
    try {
      await setActivePrompt({ data: { id } });
      toast.success("Active prompt updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this prompt?")) return;
    try {
      await deletePrompt({ data: { id } });
      toast.success("Prompt deleted");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Prompt Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell the AI how to talk, what to sell, and what info to collect.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}>
              <Plus className="h-4 w-4" /> New prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit prompt" : "New prompt"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "bn" | "both")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">Bangla</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No prompts yet. Create one to power your AI replies.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Card key={p.id} className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant="secondary" className="uppercase">
                    {p.language}
                  </Badge>
                  {p.is_active && (
                    <Badge className="gap-1 bg-primary text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {!p.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => activate(p.id)}>
                      Activate
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{p.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}