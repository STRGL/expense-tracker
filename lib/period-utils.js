export function getDefaultPeriod() {
  const now = new Date()
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  return { preset: "monthly", year, month }
}

export function computeDateRange(preset, year, month) {
  if (preset === "monthly") {
    return {
      dateFrom: new Date(year, month, 1),
      dateTo: new Date(year, month + 1, 0, 23, 59, 59, 999),
      label: new Date(year, month, 1).toLocaleDateString("en-GB", {
        month: "long", year: "numeric",
      }),
    }
  }
  if (preset === "quarterly") {
    const quarter = Math.floor(month / 3)
    return {
      dateFrom: new Date(year, quarter * 3, 1),
      dateTo: new Date(year, quarter * 3 + 3, 0, 23, 59, 59, 999),
      label: `Q${quarter + 1} ${year}`,
    }
  }
  if (preset === "yearly") {
    return {
      dateFrom: new Date(year, 0, 1),
      dateTo: new Date(year, 11, 31, 23, 59, 59, 999),
      label: String(year),
    }
  }
  return null
}

export function navigatePeriod(preset, year, month, direction) {
  if (preset === "monthly") {
    const d = new Date(year, month + direction, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  }
  if (preset === "quarterly") {
    const quarter = Math.floor(month / 3) + direction
    if (quarter < 0) return { year: year - 1, month: 9 }
    if (quarter > 3) return { year: year + 1, month: 0 }
    return { year, month: quarter * 3 }
  }
  if (preset === "yearly") {
    return { year: year + direction, month: 0 }
  }
  return { year, month }
}

export function isAtCurrentMonth(preset, year, month) {
  const now = new Date()
  if (preset === "monthly") return year === now.getFullYear() && month === now.getMonth()
  if (preset === "quarterly") {
    return year === now.getFullYear() && Math.floor(month / 3) === Math.floor(now.getMonth() / 3)
  }
  if (preset === "yearly") return year === now.getFullYear()
  return false
}
