export type ConfidenceLevel = "green" | "amber" | "red"

export type ConfidenceReason =
  | "date_parse_failed"
  | "date_wrong_year"
  | "amount_parse_failed"
  | "amount_outlier"
  | "amount_high"
  | "low_confidence_merchant"
  | "duplicate"
  | "dual_amount_values"

export interface ImportRowRawData {
  [column: string]: string
}
