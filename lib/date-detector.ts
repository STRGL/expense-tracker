const DMY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/
const ISO = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/

export type DateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY"

export function detectDateFormat(samples: string[]): DateFormat | null {
  const valid = samples.map(s => s?.toString().trim()).filter(Boolean)
  if (!valid.length) return null
  if (valid.every(s => ISO.test(s))) return "YYYY-MM-DD"
  if (!valid.every(s => DMY.test(s))) return null
  for (const s of valid) {
    const m = s.match(DMY)
    if (m && parseInt(m[1]) > 12) return "DD/MM/YYYY"
  }
  for (const s of valid) {
    const m = s.match(DMY)
    if (m && parseInt(m[2]) > 12) return "MM/DD/YYYY"
  }
  return "DD/MM/YYYY"
}

export function parseDate(str: string, format: DateFormat): Date | null {
  if (!str || !format) return null
  const s = str.toString().trim()
  if (format === "YYYY-MM-DD") {
    const m = s.match(ISO)
    if (!m) return null
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
    return isNaN(d.getTime()) ? null : d
  }
  const m = s.match(DMY)
  if (!m) return null
  const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])
  if (format === "DD/MM/YYYY") {
    const d = new Date(year, parseInt(m[2]) - 1, parseInt(m[1]))
    return isNaN(d.getTime()) ? null : d
  }
  if (format === "MM/DD/YYYY") {
    const d = new Date(year, parseInt(m[1]) - 1, parseInt(m[2]))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
