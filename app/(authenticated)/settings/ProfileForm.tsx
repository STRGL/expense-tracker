"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { ACCENT_THEMES, ACCENT_SWATCHES } from "@/lib/accent-themes"
import type { AccentThemeKey } from "@/lib/accent-themes"

interface Profile {
  id: string
  name: string
  email: string
  wage: number | null
  themeAccent: string | null
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [accent, setAccent] = useState<AccentThemeKey>("blue")
  const [accentSaved, setAccentSaved] = useState(false)
  const [accentError, setAccentError] = useState("")
  const accentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data)
        setAccent((data.themeAccent ?? "blue") as AccentThemeKey)
      })
  }, [])

  useEffect(() => {
    return () => {
      if (accentTimerRef.current) clearTimeout(accentTimerRef.current)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    const formData = new FormData(e.currentTarget)
    const body: Record<string, string | number | null> = {}
    const name = formData.get("name")
    const email = formData.get("email")
    const password = formData.get("password")
    const wage = formData.get("wage")
    if (name) body.name = name as string
    if (email) body.email = email as string
    if (password) body.password = password as string
    if (wage !== "") body.wage = wage === "" ? null : Number(wage)

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setProfile(data)
      setMessage("Profile updated.")
      ;(e.target as HTMLFormElement).reset()
    } else {
      setMessage(data.error ?? "Update failed.")
    }
  }

  async function handleAccentChange(name: AccentThemeKey) {
    setAccent(name)
    setAccentError("")
    const vars = ACCENT_THEMES[name] ?? ACCENT_THEMES.blue
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value)
    }
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeAccent: name }),
      })
      if (!res.ok) {
        fetch("/api/profile").then(r => r.json()).then((data: Profile) => {
          const revertKey = (data.themeAccent ?? "blue") as AccentThemeKey
          setAccent(revertKey)
          const revertVars = ACCENT_THEMES[revertKey] ?? ACCENT_THEMES.blue
          for (const [key, value] of Object.entries(revertVars)) {
            document.documentElement.style.setProperty(key, value)
          }
        })
        setAccentError("Failed to save accent colour.")
        return
      }
    } catch {
      setAccentError("Failed to save accent colour.")
      return
    }
    setAccentSaved(true)
    if (accentTimerRef.current) clearTimeout(accentTimerRef.current)
    accentTimerRef.current = setTimeout(() => setAccentSaved(false), 2000)
  }

  if (!profile) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Update your name, email, and annual wage.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={profile.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={profile.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wage">
                Annual wage <span className="text-muted-foreground text-xs">(used for proportional splits)</span>
              </Label>
              <Input
                id="wage"
                name="wage"
                type="number"
                min="0"
                step="0.01"
                defaultValue={profile.wage ?? ""}
                placeholder="Leave blank to clear"
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current password"
                minLength={8}
              />
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose your accent colour for buttons and charts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_SWATCHES.map(({ name, label, colour }) => (
              <button
                key={name}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={accent === name}
                onClick={() => handleAccentChange(name)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer",
                  accent === name && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                )}
                style={{ backgroundColor: colour }}
              />
            ))}
          </div>
          {accentSaved && (
            <p className="text-xs text-muted-foreground mt-3">Accent colour saved.</p>
          )}
          {accentError && (
            <p className="text-xs text-destructive mt-3">{accentError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
