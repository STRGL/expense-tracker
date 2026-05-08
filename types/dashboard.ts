export type DashboardWidgetType =
  | "summary"
  | "spend-by-tag"
  | "spend-over-time"
  | "top-transactions"
  | "top-merchants"
  | "tag-trends"

export interface DashboardWidget {
  id: string
  type: DashboardWidgetType
}

export type DashboardConfig = DashboardWidget[]
