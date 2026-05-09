// app/(authenticated)/settings/TagManager.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const PRESET_COLOURS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
]

interface ColourPickerProps {
  value: string
  onChange: (colour: string) => void
}

function ColourPicker({ value, onChange }: ColourPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESET_COLOURS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? "black" : "transparent",
          }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
        title="Custom colour"
      />
    </div>
  )
}

interface TagChild {
  id: string
  name: string
  colour: string
  isShared: boolean
  parentId: string | null
}

interface TagParent extends TagChild {
  children: TagChild[]
}

type DialogMode = "create" | "edit"

interface DialogState {
  mode: DialogMode
  tag?: TagChild | TagParent
}

interface FormState {
  name: string
  colour: string
  isShared: boolean
  parentId?: string | null
}

export default function TagManager() {
  const [tree, setTree] = useState<TagParent[]>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [form, setForm] = useState<FormState>({ name: "", colour: "#6b7280", isShared: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { loadTags() }, [])

  async function loadTags() {
    const res = await fetch("/api/tags")
    const data = await res.json()
    setTree(data)
  }

  function openCreate(parentId: string | null = null) {
    setForm({ name: "", colour: "#6b7280", isShared: false, parentId })
    setDialog({ mode: "create" })
    setError("")
  }

  function openEdit(tag: TagChild | TagParent) {
    setForm({ name: tag.name, colour: tag.colour, isShared: tag.isShared })
    setDialog({ mode: "edit", tag })
    setError("")
  }

  async function handleSave() {
    if (!dialog) return
    setSaving(true)
    setError("")
    const url = dialog.mode === "edit" ? `/api/tags/${dialog.tag!.id}` : "/api/tags"
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
    loadTags()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tag? It will be removed from any transactions that use it.")) return
    await fetch(`/api/tags/${id}`, { method: "DELETE" })
    loadTags()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Shared tags are visible to all users. Private tags are yours only.
        </p>
        <Button size="sm" onClick={() => openCreate()}>Add category</Button>
      </div>

      {tree.length === 0 && (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      )}

      {tree.map((parent) => (
        <Card key={parent.id}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: parent.colour }}
                />
                <CardTitle className="text-sm font-medium">{parent.name}</CardTitle>
                {parent.isShared ? (
                  <Badge variant="secondary" className="text-xs">Shared</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Private</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openCreate(parent.id)}>
                  + Subcategory
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(parent)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDelete(parent.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          {parent.children.length > 0 && (
            <CardContent className="pt-0 pb-3 px-4">
              <div className="space-y-1 pl-5 border-l ml-1.5">
                {parent.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: child.colour }}
                      />
                      <span className="text-sm">{child.name}</span>
                      {child.isShared ? (
                        <Badge variant="secondary" className="text-xs">Shared</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(child)}>Edit</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(child.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Edit tag" : form.parentId ? "Add subcategory" : "Add category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Groceries"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <ColourPicker value={form.colour} onChange={(c: string) => setForm({ ...form, colour: c })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isShared"
                type="checkbox"
                checked={form.isShared}
                onChange={(e) => setForm({ ...form, isShared: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isShared" className="font-normal cursor-pointer">
                Shared (visible to all users)
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
