import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({
  ssr: false,
  beforeLoad: async () => {
    // Check if user has any connected FB page in their workspace.
    // If not, send them through onboarding; otherwise straight to Facebook.
    const { data: pages } = await supabase
      .from("fb_pages")
      .select("id")
      .limit(1);
    if (!pages || pages.length === 0) {
      throw redirect({ to: "/app/onboarding" });
    }
    throw redirect({ to: "/app/facebook" });
  },
  component: () => null,
});
