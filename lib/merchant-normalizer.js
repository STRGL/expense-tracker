export function normalizeMerchant(raw) {
  if (!raw) return ""
  let s = raw.toString().toUpperCase().trim()

  // Strip ISO dates: 2026-05-01
  s = s.replace(/\d{4}[-\/]\d{2}[-\/]\d{2}/g, "")
  // Strip DMY/MDY dates: 01/05/2026, 01-05-26
  s = s.replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, "")
  // Strip currency amounts: £23.45, $100, €9.99
  s = s.replace(/[£$€]\s*\d+[.,]?\d*/g, "")
  // Strip decimal numbers: 99.99
  s = s.replace(/\b\d+[.,]\d{2}\b/g, "")
  // Strip long reference codes: 8+ alphanumeric chars
  s = s.replace(/\b[A-Z0-9]{8,}\b/g, "")
  // Strip standalone 4+ digit numbers
  s = s.replace(/\b\d{4,}\b/g, "")
  // Clean noise punctuation (keep * as it's a common bank separator)
  s = s.replace(/[#&@!_\\|<>{}[\]]/g, " ")
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim()

  return s
}
