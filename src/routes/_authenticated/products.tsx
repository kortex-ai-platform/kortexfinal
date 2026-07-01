import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";

import {
  listProductsAdmin,
  upsertProduct,
  deleteProduct,
} from "@/lib/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const productsQuery = queryOptions({
  queryKey: ["admin-products"],
  queryFn: () => listProductsAdmin(),
});

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — kortex Ai" }] }),
  component: ProductsAdmin,
});

type ProductRow = Awaited<ReturnType<typeof listProductsAdmin>>[number];

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  slug: "",
  description: "",
  features: "",
  price: 0,
  stock: 0,
  status: "draft" as "draft" | "active",
  gallery: [] as string[],
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ProductsAdmin() {
  const { data = [], isLoading } = useQuery(productsQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const upsert = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(p: ProductRow) {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      features: p.features ?? "",
      price: Number(p.price),
      stock: p.stock,
      status: p.status,
      gallery: p.gallery ?? [],
    });
    setOpen(true);
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: signed, error: sErr } = await supabase.storage
          .from("product-images")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (sErr) throw sErr;
        urls.push(signed.signedUrl);
      }
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await upsert({
        data: {
          id: form.id,
          name: form.name,
          slug: form.slug || slugify(form.name),
          description: form.description,
          features: form.features,
          price: Number(form.price),
          stock: Number(form.stock),
          status: form.status,
          gallery: form.gallery,
        },
      });
      toast.success("Product saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Products</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.id ? f.slug : slugify(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Features</Label>
                <Textarea
                  rows={3}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                />
              </div>
              <div>
                <Label>Price (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as "draft" | "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Images</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.gallery.map((url, i) => (
                    <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, gallery: form.gallery.filter((_, j) => j !== i) })
                        }
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted/40">
                    {uploading ? <span className="text-xs">...</span> : <Upload className="h-5 w-5" />}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload(e.target.files)}
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.name}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No products yet — create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {p.gallery?.[0] && (
                          <img src={p.gallery[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                    <TableCell>৳ {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}