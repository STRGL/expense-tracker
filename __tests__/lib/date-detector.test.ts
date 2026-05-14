import { detectDateFormat, parseDate, type DateFormat } from "@/lib/date-detector"

describe("detectDateFormat", () => {
  it("returns null for empty input", () => {
    expect(detectDateFormat([])).toBeNull()
    expect(detectDateFormat([null as unknown as string, ""])).toBeNull()
  })

  it("detects YYYY-MM-DD format", () => {
    expect(detectDateFormat(["2026-01-15", "2026-02-28"])).toBe("YYYY-MM-DD")
  })

  it("detects DD/MM/YYYY when any first part exceeds 12", () => {
    expect(detectDateFormat(["15/01/2026", "03/02/2026"])).toBe("DD/MM/YYYY")
  })

  it("detects MM/DD/YYYY when any second part exceeds 12", () => {
    expect(detectDateFormat(["01/15/2026", "03/02/2026"])).toBe("MM/DD/YYYY")
  })

  it("defaults to DD/MM/YYYY when ambiguous (all parts ≤ 12)", () => {
    expect(detectDateFormat(["01/02/2026", "03/04/2026"])).toBe("DD/MM/YYYY")
  })

  it("handles hyphen separators", () => {
    expect(detectDateFormat(["15-01-2026", "03-02-2026"])).toBe("DD/MM/YYYY")
  })
})

describe("parseDate", () => {
  it("returns null for null/empty input", () => {
    expect(parseDate(null as unknown as string, "DD/MM/YYYY")).toBeNull()
    expect(parseDate("", "DD/MM/YYYY")).toBeNull()
    expect(parseDate("01/01/2026", null as unknown as DateFormat)).toBeNull()
  })

  it("parses DD/MM/YYYY as UTC midnight", () => {
    const d = parseDate("15/03/2026", "DD/MM/YYYY")
    expect(d).toBeInstanceOf(Date)
    expect(d!.toISOString()).toBe("2026-03-15T00:00:00.000Z")
  })

  it("parses MM/DD/YYYY as UTC midnight", () => {
    const d = parseDate("03/15/2026", "MM/DD/YYYY")
    expect(d!.toISOString()).toBe("2026-03-15T00:00:00.000Z")
  })

  it("parses YYYY-MM-DD as UTC midnight", () => {
    const d = parseDate("2026-03-15", "YYYY-MM-DD")
    expect(d!.toISOString()).toBe("2026-03-15T00:00:00.000Z")
  })

  it("returns UTC midnight even for BST-summer dates that would shift under local TZ", () => {
    // On a Europe/London host, `new Date(2026, 5, 15)` (June 15) is BST = UTC+1, so
    // local midnight = 2026-06-14T23:00:00.000Z. UTC midnight is 2026-06-15T00:00:00.000Z.
    // This test fails if parseDate ever regresses to local-TZ Date construction.
    const dmy = parseDate("15/06/2026", "DD/MM/YYYY")
    expect(dmy!.toISOString()).toBe("2026-06-15T00:00:00.000Z")

    const mdy = parseDate("06/15/2026", "MM/DD/YYYY")
    expect(mdy!.toISOString()).toBe("2026-06-15T00:00:00.000Z")

    const iso = parseDate("2026-06-15", "YYYY-MM-DD")
    expect(iso!.toISOString()).toBe("2026-06-15T00:00:00.000Z")
  })

  it("returns null for invalid date string", () => {
    expect(parseDate("not-a-date", "DD/MM/YYYY")).toBeNull()
  })
})
