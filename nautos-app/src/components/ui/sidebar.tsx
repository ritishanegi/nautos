"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Ship,
  BarChart3,
  LogOut,
  Waves,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/query", label: "Ask AI", icon: MessageSquareText },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/vessels", label: "Fleet", icon: Ship },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-16 border-b border-sidebar-border px-4", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
            <Waves className="size-4 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-sidebar-foreground truncate">
              NAUTOS <span className="text-sidebar-primary">AI</span>
            </span>
          )}
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full size-10 mb-2 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(false)}
          >
            <ChevronLeft className="size-4 rotate-180" />
          </Button>
        )}
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn("size-[18px] shrink-0", active && "text-sidebar-primary")} />
              {!collapsed && item.label}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Footer */}
      <div className="p-3">
        <Separator className="mb-3 bg-sidebar-border" />
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full size-10 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={handleLogout}
              >
                <LogOut className="size-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Sign Out</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground h-10 px-3"
            onClick={handleLogout}
          >
            <LogOut className="size-[18px]" />
            Sign Out
          </Button>
        )}
      </div>
    </aside>
  );
}
