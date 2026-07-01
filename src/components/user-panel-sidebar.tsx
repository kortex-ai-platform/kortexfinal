import { Link, useRouterState } from "@tanstack/react-router";
import {
  Facebook,
  Brain,
  Sparkles,
  Server,
  MessageSquare,
  MessageCircle,
  Package,
  ShoppingBag,
  Settings,
  Bot,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { to: string; label: string; icon: typeof Facebook };

const setup: Item[] = [
  { to: "/app/facebook", label: "Facebook Connect", icon: Facebook },
  { to: "/app/whatsapp", label: "WhatsApp Connect", icon: MessageCircle },
  { to: "/app/brand-memory", label: "Brand Memory", icon: Brain },
];

const ai: Item[] = [
  { to: "/app/ai-settings", label: "AI Settings", icon: Sparkles },
  { to: "/app/providers", label: "AI Providers", icon: Server },
];

const work: Item[] = [
  { to: "/app/chats", label: "Messages", icon: MessageSquare },
  { to: "/app/ecommerce", label: "E-commerce", icon: ShoppingBag },
];

const account: Item[] = [
  { to: "/app/settings", label: "Workspace", icon: Settings },
];

export function UserPanelSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const renderGroup = (label: string, items: Item[]) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
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
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/app" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">kortex Ai</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                User Panel
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Setup", setup)}
        {renderGroup("AI", ai)}
        {renderGroup("Workspace", work)}
        {renderGroup("Account", account)}
      </SidebarContent>
    </Sidebar>
  );
}
