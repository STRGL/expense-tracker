export const dynamic = "force-dynamic"
export const metadata = { title: "Settings — Expense Tracker" }

import SettingsTabs from "./SettingsTabs"
import pkg from "../../../package.json"

export default function SettingsPage() {
  return (
    <div className="relative space-y-6 max-w-3xl pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile, tags, and import preferences.
        </p>
      </div>
      <SettingsTabs />
      <p
        className="absolute bottom-0 right-0 text-xs text-muted-foreground/60 font-mono tabular-nums"
        aria-label="App version"
      >
        v{pkg.version}
      </p>
    </div>
  )
}
