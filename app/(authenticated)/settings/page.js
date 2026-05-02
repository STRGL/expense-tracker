export const dynamic = "force-dynamic"
export const metadata = { title: "Settings — Expense Tracker" }

import SettingsTabs from "./SettingsTabs"

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile, tags, and import preferences.
        </p>
      </div>
      <SettingsTabs />
    </div>
  )
}
