"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function ProfileForm() {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    const formData = new FormData(e.target)
    const body = {}
    const name = formData.get("name")
    const email = formData.get("email")
    const password = formData.get("password")
    const wage = formData.get("wage")
    if (name) body.name = name
    if (email) body.email = email
    if (password) body.password = password
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
      e.target.reset()
    } else {
      setMessage(data.error ?? "Update failed.")
    }
  }

  if (!profile) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Update your name, email, and monthly wage.</CardDescription>
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
                Monthly wage <span className="text-muted-foreground text-xs">(used for proportional splits)</span>
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
    </div>
  )
}
