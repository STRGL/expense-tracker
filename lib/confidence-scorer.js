export function computeBatchStats(rows) {
  const amounts = rows.map(r => r.amount).filter(a => typeof a === "number" && !isNaN(a))
  const dates = rows.map(r => r.date).filter(d => d instanceof Date && !isNaN(d.getTime()))

  const mean = amounts.length
    ? amounts.reduce((s, a) => s + a, 0) / amounts.length
    : 0
  const stdDev = amounts.length > 1
    ? Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length)
    : 0

  const yearCounts = {}
  for (const d of dates) {
    const y = d.getFullYear()
    yearCounts[y] = (yearCounts[y] ?? 0) + 1
  }
  const dominantYear = Object.keys(yearCounts).length
    ? parseInt(Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0][0])
    : null

  return { mean, stdDev, dominantYear }
}

export function scoreRow(row, batchStats, fuseScore) {
  const reasons = []

  if (!row.date || !(row.date instanceof Date) || isNaN(row.date.getTime())) {
    reasons.push("date_parse_failed")
  } else if (batchStats.dominantYear !== null && row.date.getFullYear() !== batchStats.dominantYear) {
    reasons.push("date_wrong_year")
  }

  if (row.amount == null || isNaN(row.amount)) {
    reasons.push("amount_parse_failed")
  } else if (batchStats.stdDev > 0) {
    const z = Math.abs(row.amount - batchStats.mean) / batchStats.stdDev
    if (z > 3) reasons.push("amount_outlier")
    else if (z > 2) reasons.push("amount_high")
  }

  if (fuseScore !== null && fuseScore > 0.4) reasons.push("low_confidence_merchant")
  if (row.isDuplicate) reasons.push("duplicate")

  const RED = ["date_parse_failed", "amount_parse_failed", "date_wrong_year", "amount_outlier", "duplicate"]
  if (reasons.some(r => RED.includes(r))) return { level: "red", reasons }
  if (reasons.length > 0) return { level: "amber", reasons }
  return { level: "green", reasons: [] }
}
