import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/dashboard" });
    return { user: data.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="ml-2 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                ADMIN MODE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  User Dashboard
                </Link>
              </Button>
              <ThemeToggle />
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
