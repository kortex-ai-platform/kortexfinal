import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  MessageSquare,
  Sparkles,
  Facebook,
  FileText,
  ImageIcon,
  Workflow,
  BarChart3,
  Settings,
  Bot,
  Server,
  ScrollText,
  Megaphone,
  Brain,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useT, type TKey } from "@/lib/i18n";

type Item = { to: string; labelKey: TKey; icon: typeof LayoutDashboard };

const items: Item[] = [
  { to: "/dashboard", labelKey: "sidebar.overview", icon: LayoutDashboard },
  { to: "/products", labelKey: "sidebar.products", icon: Package },
  { to: "/orders", labelKey: "sidebar.orders", icon: ShoppingBag },
  { to: "/chats", labelKey: "sidebar.chats", icon: MessageSquare },
  { to: "/providers", labelKey: "sidebar.providers", icon: Server },
  { to: "/ai-settings", labelKey: "sidebar.ai", icon: Sparkles },
  { to: "/logs", labelKey: "sidebar.logs", icon: ScrollText },
  { to: "/facebook", labelKey: "sidebar.facebook", icon: Facebook },
  { to: "/fb-post-generator", labelKey: "sidebar.fbPostGen", icon: Megaphone },
  { to: "/brand-memory", labelKey: "sidebar.brandMemory", icon: Brain },
  { to: "/prompts", labelKey: "sidebar.prompts", icon: FileText },
  { to: "/images", labelKey: "sidebar.images", icon: ImageIcon },
  { to: "/automation", labelKey: "sidebar.automation", icon: Workflow },
  { to: "/analytics", labelKey: "sidebar.analytics", icon: BarChart3 },
  { to: "/settings", labelKey: "sidebar.settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">kortex Ai</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{t(item.labelKey)}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}