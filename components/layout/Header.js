// components/layout/Header.js
import Breadcrumbs from "./Breadcrumbs"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import NotificationBell from "./NotificationBell"

export default function Header() {
  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4 shrink-0">
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search transactions..."
            className="pl-8 h-9 text-sm"
            readOnly
          />
        </div>

        <NotificationBell />
      </div>
    </header>
  )
}
