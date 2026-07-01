import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranding, upsertBranding } from "@/lib/branding.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — kortex Ai" }] }),
  component: SettingsPage,
});

export function SettingsPage() {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const get = useServerFn(getBranding);
  const save = useServerFn(upsertBranding);
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => get(),
  });
  const [brand, setBrand] = useState({ brand_name: "", phone: "", website: "" });
  const [brandSaving, setBrandSaving] = useState(false);
  useEffect(() => {
    if (branding) setBrand(branding);
  }, [branding]);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBrandSaving(true);
    try {
      await save({ data: brand });
      toast.success("Branding saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBrandSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setPw("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Brand details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Auto-injected into generated Facebook posts. Only these three fields are
            ever shown publicly.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveBranding} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand name</Label>
              <Input
                id="brand-name"
                value={brand.brand_name}
                onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })}
                placeholder="Homemade Gadget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-phone">Phone</Label>
              <Input
                id="brand-phone"
                value={brand.phone}
                onChange={(e) => setBrand({ ...brand, phone: e.target.value })}
                placeholder="017XXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-website">Website</Label>
              <Input
                id="brand-website"
                value={brand.website}
                onChange={(e) => setBrand({ ...brand, website: e.target.value })}
                placeholder="www.example.com"
              />
            </div>
            <Button type="submit" disabled={brandSaving}>
              {brandSaving ? "Saving…" : "Save branding"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                minLength={6}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}