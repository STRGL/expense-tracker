// app/(authenticated)/settings/RuleManager.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface TagOption {
  id: string
  name: string
  colour: string
  parentId: string | null
  children?: TagOption[]
}

interface RuleRow {
  id: string
  merchantPattern: string
  tagId: string
  isShared: boolean
  tag: { id: string; name: string; colour: string } | null
}

type DialogMode = "create" | "edit"

interface DialogState {
  mode: DialogMode
  rule?: RuleRow
}

interface FormState {
  merchantPattern: string
  tagId: string
  isShared: boolean
}

export default function RuleManager() {
  const [rules, setRules] = useState<RuleRow[]>([])
  const [allTags, setAllTags] = useState<TagOption[]>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [form, setForm] = useState<FormState>({ merchantPattern: "", tagId: "", isShared: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    load()
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tree: TagOption[]) => {
        const flat: TagOption[] = []
        for (const parent of tree) {
          flat.push(parent)
          for (const child of parent.children ?? []) flat.push(child)
        }
        setAllTags(flat)
      })
  }, [])

  async function load() {
    const res = await fetch("/api/rules")
    setRules(await res.json())
  }

  function openCreate() {
    setForm({ merchantPattern: "", tagId: "", isShared: false })
    setDialog({ mode: "create" })
    setError("")
  }

  function openEdit(rule: RuleRow) {
    setForm({ merchantPattern: rule.merchantPattern, tagId: rule.tagId, isShared: rule.isShared })
    setDialog({ mode: "edit", rule })
    setError("")
  }

  async function handleSave() {
    if (!dialog) return
    setSaving(true)
    setError("")
    const url = dialog.mode === "edit" ? `/api/rules/${dialog.rule!.id}` : "/api/rules"
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
    await fetch(`/api/rules/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Auto-assign tags to imported transactions by merchant pattern.
        </p>
        <Button size="sm" onClick={openCreate}>Add rule</Button>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground">No rules yet.</p>
      )}

      <div className="divide-y border rounded-md">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-mono">{r.merchantPattern}</p>
              <span className="text-muted-foreground text-xs">→</span>
              <div className="flex items-center gap-1.5">
                {r.tag && (
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: r.tag.colour }}
                  />
                )}
                <p className="text-sm">{r.tag?.name ?? r.tagId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r.isShared
                ? <Badge variant="secondary" className="text-xs">Shared</Badge>
                : <Badge variant="outline" className="text-xs">Private</Badge>}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(r)}>Edit</Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDelete(r.id)}
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
            <DialogTitle>{dialog?.mode === "edit" ? "Edit rule" : "Add rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Merchant pattern</Label>
              <Input
                value={form.merchantPattern}
                onChange={(e) => setForm({ ...form, merchantPattern: e.target.value })}
                placeholder="e.g. TESCO"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign tag</Label>
              <Select value={form.tagId} onValueChange={(v) => setForm({ ...form, tagId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.colour }} />
                        <span>{t.parentId ? "  " : ""}{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ruleShared"
                type="checkbox"
                checked={form.isShared}
                onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="ruleShared" className="font-normal cursor-pointer">
                Shared (visible to all users)
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.merchantPattern.trim() || !form.tagId}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
