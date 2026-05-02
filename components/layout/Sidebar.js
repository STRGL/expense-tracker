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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/imports", label: "Import", icon: Upload },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
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
          "flex flex-col h-full border-r bg-background transition-all duration-200 shrink-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className={cn("flex items-center h-14 border-b px-3", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight">Expense Tracker</span>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-2 px-1.5 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}

          {isAdmin && (
            <>
              <div className={cn("my-2 border-t", collapsed && "mx-1")} />
              {ADMIN_ITEMS.map((item) => (
                <NavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
              ))}
            </>
          )}
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
        "hover:bg-accent hover:text-accent-foreground",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
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
