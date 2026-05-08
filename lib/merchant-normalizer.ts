export function normalizeMerchant(raw: string): string {
  if (!raw) return ""
  let s = raw.toString().toUpperCase().trim()
  s = s.replace(/\d{4}[-\/]\d{2}[-\/]\d{2}/g, "")
  s = s.replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, "")
  s = s.replace(/[£$€]\s*\d+[.,]?\d*/g, "")
  s = s.replace(/\b\d+[.,]\d{2}\b/g, "")
  s = s.replace(/\b[A-Z0-9]{8,}\b/g, "")
  s = s.replace(/\b\d{4,}\b/g, "")
  s = s.replace(/[#&@!_\\|<>{}[\]]/g, " ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}
