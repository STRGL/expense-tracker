/**
 * @jest-environment node
 */
import {
  toLocalISODate,
  parseCalendarDate,
  formatCalendarDate,
  toCalendarDateInTZ,
} from "@/lib/date"

describe("toLocalISODate", () => {
  it("formats a Date as YYYY-MM-DD using local TZ", () => {
    const d = new Date(2026, 3, 1)
    expect(toLocalISODate(d)).toBe("2026-04-01")
  })

  it("zero-pads single-digit months and days", () => {
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})

describe("parseCalendarDate", () => {
  it("returns UTC midnight for a YYYY-MM-DD string", () => {
    const d = parseCalendarDate("2026-04-01")
    expect(d.toISOString()).toBe("2026-04-01T00:00:00.000Z")
  })

  it("throws on invalid input", () => {
    expect(() => parseCalendarDate("not-a-date")).toThrow()
    expect(() => parseCalendarDate("2026/04/01")).toThrow()
    expect(() => parseCalendarDate("")).toThrow()
  })
})

describe("formatCalendarDate", () => {
  it("renders a UTC-midnight Date as DD MMM YYYY regardless of viewer TZ", () => {
    const d = parseCalendarDate("2026-04-01")
    expect(formatCalendarDate(d)).toBe("01 Apr 2026")
  })

  it("accepts an ISO string", () => {
    expect(formatCalendarDate("2026-04-01T00:00:00.000Z")).toBe("01 Apr 2026")
  })
})

describe("toCalendarDateInTZ", () => {
  it("returns the local calendar date in Europe/London for a BST-summer instant", () => {
    expect(toCalendarDateInTZ("2026-03-31T23:00:00.000Z", "Europe/London")).toBe("2026-04-01")
  })

  it("returns the local calendar date in Europe/London for a GMT-winter instant", () => {
    expect(toCalendarDateInTZ("2026-01-15T00:00:00.000Z", "Europe/London")).toBe("2026-01-15")
  })

  it("defaults to Europe/London when no TZ given", () => {
    expect(toCalendarDateInTZ("2026-03-31T23:00:00.000Z")).toBe("2026-04-01")
  })
})
