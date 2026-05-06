// components/layout/Sidebar.js
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Search,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/imports",      label: "Import",       icon: Upload },
  { href: "/search",       label: "Search",       icon: Search },
]

const BOTTOM_ITEMS = [
  { href: "/settings",     label: "Settings",     icon: Settings },
]

const ADMIN_ITEMS = [
  { href: "/admin", label: "User Management", icon: Users },
]

export default function Sidebar({ collapsed, onToggle, isAdmin }) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-full border-r bg-sidebar transition-all duration-200 shrink-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className={cn(
          "flex items-center h-14 border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
              <h1 className="font-semibold text-sm tracking-tight text-sidebar-foreground">
                Expense Tracker
              </h1>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-2 px-1.5 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        <nav className="py-2 px-1.5 space-y-0.5 border-t border-sidebar-border">
          {isAdmin && ADMIN_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  )
}

function NavItem({ item, pathname, collapsed }) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
