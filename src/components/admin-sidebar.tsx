import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Shield, Building2, CreditCard, Brain,
  Activity, UserSquare2, Workflow, ScrollText, BarChart3,
  HeartPulse, Flag, Megaphone, LifeBuoy,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const groups: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Master Admin",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/clients", label: "Users", icon: Users },
      { to: "/admin/tenants", label: "Organizations", icon: Building2 },
      { to: "/admin/billing", label: "Billing", icon: CreditCard },
      { to: "/admin/ai-models", label: "AI Providers", icon: Brain },
      { to: "/admin/api-logs", label: "API Logs", icon: ScrollText },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/system-health", label: "System Health", icon: HeartPulse },
      { to: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
      { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { to: "/admin/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/crm", label: "CRM Customers", icon: UserSquare2 },
      { to: "/admin/automation-view", label: "Automation", icon: Workflow },
      { to: "/admin/monitoring", label: "Monitoring & Logs", icon: Activity },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <Link to="/admin" className="flex min-h-10 items-center gap-3 px-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-sm font-semibold leading-none">Super Admin</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Control Panel</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1 py-3">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-9 rounded-md data-[active=true]:border data-[active=true]:border-sidebar-primary/15 data-[active=true]:bg-sidebar-primary/10 data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary">
                        <Link to={item.to} className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
