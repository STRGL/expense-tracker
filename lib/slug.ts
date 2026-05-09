export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function generateUserSlugs(users: { id: string; name: string }[]): Map<string, string> {
  const baseSlugs = users.map(u => ({ id: u.id, base: toSlug(u.name) }))
  const seen = new Map<string, string[]>()
  for (const { id, base } of baseSlugs) {
    if (!seen.has(base)) seen.set(base, [])
    seen.get(base)!.push(id)
  }
  const map = new Map<string, string>()
  for (const [base, ids] of seen) {
    ids.forEach((id, i) => map.set(id, i === 0 ? base : `${base}-${i}`))
  }
  return map
}

export function slugToDisplayName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}
