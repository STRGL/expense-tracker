// components/layout/Header.js
import Breadcrumbs from "./Breadcrumbs"
import NotificationBell from "./NotificationBell"
import SearchBar from "./SearchBar"

export default function Header() {
  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4 shrink-0">
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2">
        <SearchBar />
        <NotificationBell />
      </div>
    </header>
  )
}
