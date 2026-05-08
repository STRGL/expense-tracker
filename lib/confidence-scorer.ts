import type { ConfidenceLevel, ConfidenceReason } from "@/types/imports"

export interface BatchStats {
  mean: number
  stdDev: number
  dominantYear: number | null
}

interface RowInput {
  amount: number | null
  date: Date | null
  isDuplicate: boolean
}

interface ScoreResult {
  level: ConfidenceLevel
  reasons: ConfidenceReason[]
}

const RED_REASONS: ConfidenceReason[] = [
  "date_parse_failed",
  "amount_parse_failed",
  "date_wrong_year",
  "amount_outlier",
  "duplicate",
  "dual_amount_values",
]

export function computeBatchStats(
  rows: Array<{ amount: number; date: Date | null }>
): BatchStats {
  const absAmounts = rows
    .map(r => r.amount)
    .filter((a): a is number => typeof a === "number" && !isNaN(a) && a !== 0)
    .map(a => Math.abs(a))
  const dates = rows
    .map(r => r.date)
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))

  const mean = absAmounts.length
    ? absAmounts.reduce((s, a) => s + a, 0) / absAmounts.length
    : 0
  const stdDev = absAmounts.length > 1
    ? Math.sqrt(absAmounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / absAmounts.length)
    : 0

  const yearCounts: Record<number, number> = {}
  for (const d of dates) {
    const y = d.getFullYear()
    yearCounts[y] = (yearCounts[y] ?? 0) + 1
  }
  const dominantYear = Object.keys(yearCounts).length
    ? parseInt(Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0][0])
    : null

  return { mean, stdDev, dominantYear }
}

export function scoreRow(
  row: RowInput,
  batchStats: BatchStats,
  fuseScore: number | null
): ScoreResult {
  const reasons: ConfidenceReason[] = []

  if (!row.date || !(row.date instanceof Date) || isNaN(row.date.getTime())) {
    reasons.push("date_parse_failed")
  } else if (batchStats.dominantYear !== null && row.date.getFullYear() !== batchStats.dominantYear) {
    reasons.push("date_wrong_year")
  }

  if (row.amount == null || isNaN(row.amount)) {
    reasons.push("amount_parse_failed")
  } else if (batchStats.stdDev > 0) {
    const z = Math.abs(Math.abs(row.amount) - batchStats.mean) / batchStats.stdDev
    if (z > 3) reasons.push("amount_outlier")
    else if (z > 2) reasons.push("amount_high")
  }

  if (fuseScore !== null && fuseScore > 0.4) reasons.push("low_confidence_merchant")
  if (row.isDuplicate) reasons.push("duplicate")

  if (reasons.some(r => RED_REASONS.includes(r))) return { level: "red", reasons }
  if (reasons.length > 0) return { level: "amber", reasons }
  return { level: "green", reasons: [] }
}
