import { computeDateRange, navigatePeriod, isAtCurrentMonth } from "@/lib/period-utils"

describe("computeDateRange — monthly", () => {
  it("returns correct date range for April 2026 (month index 3)", () => {
    const { dateFrom, dateTo, label } = computeDateRange("monthly", 2026, 3)
    expect(dateFrom.getFullYear()).toBe(2026)
    expect(dateFrom.getMonth()).toBe(3)
    expect(dateFrom.getDate()).toBe(1)
    expect(dateTo.getFullYear()).toBe(2026)
    expect(dateTo.getMonth()).toBe(3)
    expect(dateTo.getDate()).toBe(30)
    expect(label).toBe("April 2026")
  })

  it("handles December correctly (no month 12 overflow)", () => {
    const { dateFrom, dateTo } = computeDateRange("monthly", 2026, 11)
    expect(dateTo.getMonth()).toBe(11)
    expect(dateTo.getDate()).toBe(31)
  })
})

describe("computeDateRange — quarterly", () => {
  it("returns Q1 2026 for month 0 (January)", () => {
    const { dateFrom, dateTo, label } = computeDateRange("quarterly", 2026, 0)
    expect(dateFrom.getMonth()).toBe(0)
    expect(dateTo.getMonth()).toBe(2)
    expect(label).toBe("Q1 2026")
  })

  it("returns Q2 2026 for month 4 (May)", () => {
    const { dateFrom, dateTo, label } = computeDateRange("quarterly", 2026, 4)
    expect(dateFrom.getMonth()).toBe(3)
    expect(dateTo.getMonth()).toBe(5)
    expect(label).toBe("Q2 2026")
  })
})

describe("computeDateRange — yearly", () => {
  it("spans Jan 1 to Dec 31", () => {
    const { dateFrom, dateTo, label } = computeDateRange("yearly", 2026, 0)
    expect(dateFrom.getMonth()).toBe(0)
    expect(dateFrom.getDate()).toBe(1)
    expect(dateTo.getMonth()).toBe(11)
    expect(dateTo.getDate()).toBe(31)
    expect(label).toBe("2026")
  })
})

describe("navigatePeriod", () => {
  it("advances one month forward", () => {
    const result = navigatePeriod("monthly", 2026, 3, 1)
    expect(result).toEqual({ year: 2026, month: 4 })
  })

  it("wraps year when advancing past December", () => {
    const result = navigatePeriod("monthly", 2026, 11, 1)
    expect(result).toEqual({ year: 2027, month: 0 })
  })

  it("wraps year when going back from January", () => {
    const result = navigatePeriod("monthly", 2026, 0, -1)
    expect(result).toEqual({ year: 2025, month: 11 })
  })

  it("advances one quarter forward", () => {
    const result = navigatePeriod("quarterly", 2026, 0, 1)
    expect(result).toEqual({ year: 2026, month: 3 })
  })

  it("advances one year forward", () => {
    const result = navigatePeriod("yearly", 2026, 0, 1)
    expect(result).toEqual({ year: 2027, month: 0 })
  })
})

describe("isAtCurrentMonth", () => {
  it("returns true when the year/month matches today", () => {
    const now = new Date()
    expect(isAtCurrentMonth("monthly", now.getFullYear(), now.getMonth())).toBe(true)
  })

  it("returns false for a past month", () => {
    expect(isAtCurrentMonth("monthly", 2020, 0)).toBe(false)
  })
})
