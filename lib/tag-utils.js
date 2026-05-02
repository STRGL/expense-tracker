export function buildTagTree(tags) {
  const byId = Object.fromEntries(tags.map((t) => [t.id, { ...t, children: [] }]))
  const roots = []

  for (const tag of Object.values(byId)) {
    if (tag.parentId && byId[tag.parentId]) {
      byId[tag.parentId].children.push(tag)
    } else {
      roots.push(tag)
    }
  }

  return roots
}
