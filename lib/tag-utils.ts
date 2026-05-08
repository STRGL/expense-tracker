import type { Tag } from "@prisma/client"

export interface TagWithChildren extends Tag {
  children: TagWithChildren[]
}

export function buildTagTree(tags: Tag[]): TagWithChildren[] {
  const byId: Record<string, TagWithChildren> = Object.fromEntries(
    tags.map(t => [t.id, { ...t, children: [] }])
  )
  const roots: TagWithChildren[] = []
  for (const tag of Object.values(byId)) {
    if (tag.parentId && byId[tag.parentId]) {
      byId[tag.parentId].children.push(tag)
    } else {
      roots.push(tag)
    }
  }
  return roots
}
