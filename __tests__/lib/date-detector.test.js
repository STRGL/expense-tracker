import { detectDateFormat, parseDate } from "@/lib/date-detector"

describe("detectDateFormat", () => {
  it("returns null for empty input", () => {
    expect(detectDateFormat([])).toBeNull()
    expect(detectDateFormat([null, ""])).toBeNull()
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
    expect(parseDate(null, "DD/MM/YYYY")).toBeNull()
    expect(parseDate("", "DD/MM/YYYY")).toBeNull()
    expect(parseDate("01/01/2026", null)).toBeNull()
  })

  it("parses DD/MM/YYYY correctly", () => {
    const d = parseDate("15/03/2026", "DD/MM/YYYY")
    expect(d).toBeInstanceOf(Date)
    expect(d.getDate()).toBe(15)
    expect(d.getMonth()).toBe(2)
    expect(d.getFullYear()).toBe(2026)
  })

  it("parses MM/DD/YYYY correctly", () => {
    const d = parseDate("03/15/2026", "MM/DD/YYYY")
    expect(d).toBeInstanceOf(Date)
    expect(d.getDate()).toBe(15)
    expect(d.getMonth()).toBe(2)
    expect(d.getFullYear()).toBe(2026)
  })

  it("parses YYYY-MM-DD correctly", () => {
    const d = parseDate("2026-03-15", "YYYY-MM-DD")
    expect(d).toBeInstanceOf(Date)
    expect(d.getDate()).toBe(15)
    expect(d.getMonth()).toBe(2)
    expect(d.getFullYear()).toBe(2026)
  })

  it("returns null for invalid date string", () => {
    expect(parseDate("not-a-date", "DD/MM/YYYY")).toBeNull()
  })
})
