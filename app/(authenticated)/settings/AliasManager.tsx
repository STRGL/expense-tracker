"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface AliasRow {
  id: string
  rawName: string
  niceName: string
  isShared: boolean
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; alias: AliasRow }

interface FormState {
  rawName: string
  niceName: string
  isShared: boolean
}

export default function AliasManager() {
  const [aliases, setAliases] = useState<AliasRow[]>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [form, setForm] = useState<FormState>({ rawName: "", niceName: "", isShared: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { void load() }, [])

  async function load() {
    const res = await fetch("/api/aliases")
    setAliases(await res.json())
  }

  function openCreate() {
    setForm({ rawName: "", niceName: "", isShared: false })
    setDialog({ mode: "create" })
    setError("")
  }

  function openEdit(alias: AliasRow) {
    setForm({ rawName: alias.rawName, niceName: alias.niceName, isShared: alias.isShared })
    setDialog({ mode: "edit", alias })
    setError("")
  }

  async function handleSave() {
    if (!dialog) return
    setSaving(true)
    setError("")
    const url = dialog.mode === "edit" ? `/api/aliases/${dialog.alias.id}` : "/api/aliases"
    const method = dialog.mode === "edit" ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Failed"); return }
    setDialog(null)
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/aliases/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map raw bank merchant strings to human-friendly names.
        </p>
        <Button size="sm" onClick={openCreate}>Add alias</Button>
      </div>

      {aliases.length === 0 && (
        <p className="text-sm text-muted-foreground">No aliases yet.</p>
      )}

      <div className="divide-y border rounded-md">
        {aliases.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-mono text-muted-foreground">{a.rawName}</p>
              <p className="text-sm font-medium">{a.niceName}</p>
            </div>
            <div className="flex items-center gap-2">
              {a.isShared
                ? <Badge variant="secondary" className="text-xs">Shared</Badge>
                : <Badge variant="outline" className="text-xs">Private</Badge>}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(a)}>Edit</Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDelete(a.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit alias" : "Add alias"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Bank string (raw name)</Label>
              <Input
                value={form.rawName}
                onChange={(e) => setForm({ ...form, rawName: e.target.value })}
                placeholder="e.g. AMZN MKTP UK"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nice name</Label>
              <Input
                value={form.niceName}
                onChange={(e) => setForm({ ...form, niceName: e.target.value })}
                placeholder="e.g. Amazon"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="aliasShared"
                type="checkbox"
                checked={form.isShared}
                onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="aliasShared" className="font-normal cursor-pointer">
                Shared (visible to all users)
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.rawName.trim() || !form.niceName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
