import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — kortex Ai" },
      { name: "description", content: "Sign in to the kortex Ai admin dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupAllowed, setSignupAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if any user exists. If user_roles has any admin, signup is locked.
    // We can't read auth.users; use a count on user_roles (admins only) via anon? No - it requires auth.
    // Heuristic: try a public RPC. Simpler: attempt signup, server trigger will block second one.
    // We surface a "first time?" hint and rely on trigger for hard lock.
    setSignupAllowed(true);
  }, []);

  async function routeAfterAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: ok } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    navigate({ to: ok ? "/dashboard" : "/app" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const redirectUrl = `${window.location.origin}/app`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) {
          if (error.message.toLowerCase().includes("signup is locked")) {
            toast.error(t("auth.locked"));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created. Signing in…");
          const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!signErr) await routeAfterAuth();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
        else await routeAfterAuth();
      }
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-primary blur-[140px]" />
      </div>
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <span className="font-display font-semibold">kortex Ai</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 py-10">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "signup" ? t("auth.firstTime") : t("auth.locked")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading
                  ? "…"
                  : mode === "signin"
                    ? t("auth.signIn")
                    : t("auth.signUp")}
              </Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const res = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (res.error) toast.error(res.error.message ?? "Google sign-in failed");
                  else if (!res.redirected) await routeAfterAuth();

                }}
              >
                Continue with Google
              </Button>
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                {mode === "signin"
                  ? "First time setup? Create the admin account."
                  : "Already have an account? Sign in."}
              </button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}