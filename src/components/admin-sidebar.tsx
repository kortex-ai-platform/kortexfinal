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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-destructive text-destructive-foreground">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">Super Admin</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Control Panel</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.to} className="flex items-center gap-2">
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
