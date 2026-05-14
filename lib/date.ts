export const HOUSEHOLD_TZ = "Europe/London"

export function toLocalISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseCalendarDate(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) throw new Error(`Invalid calendar date: ${s}`)
  const year = parseInt(m[1])
  const month = parseInt(m[2]) - 1
  const day = parseInt(m[3])
  const d = new Date(Date.UTC(year, month, day))
  if (isNaN(d.getTime())) throw new Error(`Invalid calendar date: ${s}`)
  return d
}

export function formatCalendarDate(
  d: Date | string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  }).format(date)
}

export function toCalendarDateInTZ(
  d: Date | string,
  tz: string = HOUSEHOLD_TZ,
): string {
  const date = typeof d === "string" ? new Date(d) : d
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find(p => p.type === "year")?.value
  const month = parts.find(p => p.type === "month")?.value
  const day = parts.find(p => p.type === "day")?.value
  return `${year}-${month}-${day}`
}
