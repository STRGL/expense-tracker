"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { apiFetch, ApiError } from "@/lib/api-client"

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; user: UserRow }
  | { mode: "password"; user: UserRow }

interface FormState {
  name?: string
  email?: string
  password?: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { void load() }, [])

  async function load() {
    try {
      const data = await apiFetch<UserRow[]>("/api/users")
      setUsers(data)
    } catch {
      // silently fail — list stays at previous state
    }
  }

  function openCreate() {
    setForm({ name: "", email: "", password: "" })
    setDialog({ mode: "create" })
    setError("")
  }

  function openEdit(user: UserRow) {
    setForm({ name: user.name, email: user.email })
    setDialog({ mode: "edit", user })
    setError("")
  }

  function openPassword(user: UserRow) {
    setForm({ password: "" })
    setDialog({ mode: "password", user })
    setError("")
  }

  async function handleSave() {
    if (!dialog) return
    setSaving(true)
    setError("")
    let url: string
    let method: string

    if (dialog.mode === "create") {
      url = "/api/users"
      method = "POST"
    } else if (dialog.mode === "edit") {
      url = `/api/users/${dialog.user.id}`
      method = "PUT"
    } else {
      url = `/api/users/${dialog.user.id}/password`
      method = "PUT"
    }

    try {
      await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setDialog(null)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(user: UserRow) {
    if (!confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return
    await fetch(`/api/users/${user.id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>Create user</Button>
      </div>

      <div className="border rounded-md divide-y">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{u.name}</p>
                {u.role === "admin" && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                {!u.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(u)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openPassword(u)}>
                Reset password
              </Button>
              {u.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDeactivate(u)}
                >
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "create" && "Create user"}
              {dialog?.mode === "edit" && `Edit ${dialog.user.name}`}
              {dialog?.mode === "password" && `Reset password for ${dialog.user.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {(dialog?.mode === "create" || dialog?.mode === "edit") && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    id="user-name"
                    name="name"
                    autoComplete="name"
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </>
            )}

            {(dialog?.mode === "create" || dialog?.mode === "password") && (
              <div className="space-y-1.5">
                <Label htmlFor="user-password">Password</Label>
                <Input
                  id="user-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password ?? ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>
            )}

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
