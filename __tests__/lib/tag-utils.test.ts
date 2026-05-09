import type { Tag } from "@prisma/client"
import { buildTagTree } from "@/lib/tag-utils"

type MinimalTag = Pick<Tag, "id" | "name" | "parentId">

describe("buildTagTree", () => {
  it("returns empty array for empty input", () => {
    expect(buildTagTree([])).toEqual([])
  })

  it("returns top-level tags with empty children array", () => {
    const tags: MinimalTag[] = [
      { id: "1", name: "Food", parentId: null },
      { id: "2", name: "Transport", parentId: null },
    ]
    const result = buildTagTree(tags as Tag[])
    expect(result).toHaveLength(2)
    expect(result[0].children).toEqual([])
    expect(result[1].children).toEqual([])
  })

  it("nests children under their parent", () => {
    const tags: MinimalTag[] = [
      { id: "1", name: "Food", parentId: null },
      { id: "2", name: "Groceries", parentId: "1" },
      { id: "3", name: "Eating Out", parentId: "1" },
    ]
    const result = buildTagTree(tags as Tag[])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children.map(c => c.id)).toEqual(expect.arrayContaining(["2", "3"]))
  })

  it("places orphaned children (unknown parentId) at root level", () => {
    const tags: MinimalTag[] = [
      { id: "2", name: "Groceries", parentId: "nonexistent" },
    ]
    const result = buildTagTree(tags as Tag[])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("handles mixed top-level and nested tags", () => {
    const tags: MinimalTag[] = [
      { id: "1", name: "Food", parentId: null },
      { id: "2", name: "Groceries", parentId: "1" },
      { id: "3", name: "Utilities", parentId: null },
    ]
    const result = buildTagTree(tags as Tag[])
    expect(result).toHaveLength(2)
    const food = result.find(t => t.id === "1")
    expect(food!.children).toHaveLength(1)
    const utilities = result.find(t => t.id === "3")
    expect(utilities!.children).toHaveLength(0)
  })
})
