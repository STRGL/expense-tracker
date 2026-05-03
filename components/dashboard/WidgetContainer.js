export default function WidgetContainer({ title, empty, insufficient, children }) {
  return (
    <div className="h-full flex flex-col bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b shrink-0">
        <p className="text-sm font-medium text-card-foreground">{title}</p>
      </div>
      <div className="flex-1 overflow-auto p-4 flex flex-col">
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
