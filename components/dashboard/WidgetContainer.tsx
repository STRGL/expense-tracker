interface Props {
  title: string
  empty: boolean
  insufficient: boolean
  children: React.ReactNode
}

export default function WidgetContainer({ title, empty, insufficient, children }: Props) {
  return (
    <div className="flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 border-b shrink-0 bg-muted/20">
        <h3 className="text-sm font-semibold tracking-tight text-card-foreground">{title}</h3>
      </div>
      <div className="p-5 flex flex-col flex-1">
        {insufficient ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">
              Not enough data yet — add transactions from more periods to see this.
            </p>
          </div>
        ) : empty ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">No transactions in this period.</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
