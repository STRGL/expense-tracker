/**
 * @jest-environment node
 */
import { toLocalISODate } from "@/lib/utils"

describe("toLocalISODate", () => {
  test("formats a Date as YYYY-MM-DD using local timezone components", () => {
    const d = new Date(2026, 3, 1)
    expect(toLocalISODate(d)).toBe("2026-04-01")
  })

  test("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5)
    expect(toLocalISODate(d)).toBe("2026-01-05")
  })

  test("returns the local calendar date, not the UTC date, at a TZ boundary", () => {
    const d = new Date(2026, 3, 1, 0, 0, 0)
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    expect(toLocalISODate(d)).toBe(localDate)
    expect(toLocalISODate(d)).toBe("2026-04-01")
  })
})
