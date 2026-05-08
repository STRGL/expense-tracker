export type DashboardWidgetType =
  | "summary_cards"
  | "spend_by_tag"
  | "spend_over_time"
  | "tag_trends_increase"
  | "tag_trends_decrease"
  | "top_merchants"
  | "top_transactions"

export interface DashboardWidget {
  id: string
  type: DashboardWidgetType
  chartType?: "donut" | "bar"
}

export type DashboardConfig = DashboardWidget[]
