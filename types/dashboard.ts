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
  chartType?: "donut" | "bar" | "line"
}

export interface DashboardConfig {
  widgets: DashboardWidget[]
}

export interface DashboardSummary {
  totalSpend: number
  biggestTransaction: { amount: number; merchantName: string; date: string } | null
  mostUsedTag: { name: string; colour: string; count: number } | null
}

export interface SpendByTagItem {
  tagId: string | null
  tagName: string
  colour: string
  parentId: string | null
  amount: number
}

export interface SpendOverTimeItem {
  period: string
  amount: number
}

export interface TagTrendItem {
  tagId: string
  tagName: string
  colour: string
  previousAmount: number
  currentAmount: number
  change: number | null
}

export interface TopMerchantItem {
  merchantName: string
  amount: number
}

export interface TopTransactionItem {
  id: string
  date: string
  merchantName: string
  myAmount: number
  myTag: { name: string; colour: string } | null
}

export interface DashboardData {
  summary: DashboardSummary
  spendByTag: SpendByTagItem[]
  spendOverTime: SpendOverTimeItem[]
  tagTrends: { increases: TagTrendItem[]; decreases: TagTrendItem[] }
  topMerchants: TopMerchantItem[]
  topTransactions: TopTransactionItem[]
}
