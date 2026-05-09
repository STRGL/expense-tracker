import { computeBatchStats, scoreRow } from "@/lib/confidence-scorer"

describe("computeBatchStats", () => {
  it("returns zero stats for empty input", () => {
    const stats = computeBatchStats([])
    expect(stats.mean).toBe(0)
    expect(stats.stdDev).toBe(0)
    expect(stats.dominantYear).toBeNull()
  })

  it("computes mean correctly from positive amounts", () => {
    const rows = [{ amount: 10, date: null }, { amount: 20, date: null }, { amount: 30, date: null }]
    expect(computeBatchStats(rows).mean).toBe(20)
  })

  it("uses absolute values so credits do not skew the mean", () => {
    // Without abs: mean = (10 + 20 - 15) / 3 = 5
    // With abs:    mean = (10 + 20 + 15) / 3 = 15
    const rows = [{ amount: 10, date: null }, { amount: 20, date: null }, { amount: -15, date: null }]
    expect(computeBatchStats(rows).mean).toBeCloseTo(15)
  })

  it("ignores zero amounts in stats calculation", () => {
    const rows = [{ amount: 10, date: null }, { amount: 20, date: null }, { amount: 0, date: null }]
    expect(computeBatchStats(rows).mean).toBeCloseTo(15)
  })

  it("identifies the dominant year from dates", () => {
    const rows = [
      { amount: 10, date: new Date("2026-01-01") },
      { amount: 20, date: new Date("2026-02-01") },
      { amount: 30, date: new Date("2025-01-01") },
    ]
    expect(computeBatchStats(rows).dominantYear).toBe(2026)
  })

  it("ignores non-Date and null values in dates", () => {
    const rows = [
      { amount: 10, date: null },
      { amount: 20, date: new Date("2026-03-01") },
    ]
    expect(computeBatchStats(rows).dominantYear).toBe(2026)
  })
})

describe("scoreRow", () => {
  const stats = { mean: 50, stdDev: 10, dominantYear: 2026 }

  it("returns green for a normal row with good merchant match", () => {
    const row = { amount: 50, date: new Date("2026-01-15"), isDuplicate: false }
    expect(scoreRow(row, stats, 0.1).level).toBe("green")
  })

  it("returns amber for low-confidence merchant match", () => {
    const row = { amount: 50, date: new Date("2026-01-15"), isDuplicate: false }
    expect(scoreRow(row, stats, 0.6).level).toBe("amber")
  })

  it("returns amber for an amount somewhat outside the batch average", () => {
    const row = { amount: 75, date: new Date("2026-01-15"), isDuplicate: false }
    const result = scoreRow(row, stats, 0.1)
    expect(result.level).toBe("amber")
    expect(result.reasons).toContain("amount_high")
  })

  it("returns red for a date in the wrong year", () => {
    const row = { amount: 50, date: new Date("2025-01-15"), isDuplicate: false }
    const result = scoreRow(row, stats, 0.1)
    expect(result.level).toBe("red")
    expect(result.reasons).toContain("date_wrong_year")
  })

  it("returns red for a statistical amount outlier (>3 std devs)", () => {
    const row = { amount: 200, date: new Date("2026-01-15"), isDuplicate: false }
    const result = scoreRow(row, stats, 0.1)
    expect(result.level).toBe("red")
    expect(result.reasons).toContain("amount_outlier")
  })

  it("returns red for a duplicate", () => {
    const row = { amount: 50, date: new Date("2026-01-15"), isDuplicate: true }
    const result = scoreRow(row, stats, 0.1)
    expect(result.level).toBe("red")
    expect(result.reasons).toContain("duplicate")
  })

  it("returns red when date failed to parse", () => {
    const row = { amount: 50, date: null, isDuplicate: false }
    expect(scoreRow(row, stats, 0.1).level).toBe("red")
  })

  it("ignores fuseScore of null (no aliases to match against)", () => {
    const row = { amount: 50, date: new Date("2026-01-15"), isDuplicate: false }
    expect(scoreRow(row, stats, null).level).toBe("green")
  })

  it("scores a credit (negative amount) the same as a debit of equal size", () => {
    const debit  = { amount:  75, date: new Date("2026-01-15"), isDuplicate: false }
    const credit = { amount: -75, date: new Date("2026-01-15"), isDuplicate: false }
    expect(scoreRow(debit, stats, null).level).toBe(scoreRow(credit, stats, null).level)
  })

  it("flags a large credit as an outlier the same as a large debit", () => {
    const row = { amount: -200, date: new Date("2026-01-15"), isDuplicate: false }
    const result = scoreRow(row, stats, null)
    expect(result.level).toBe("red")
    expect(result.reasons).toContain("amount_outlier")
  })
})
