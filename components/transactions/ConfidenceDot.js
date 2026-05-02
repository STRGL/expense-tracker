const COLOURS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
}

export default function ConfidenceDot({ level }) {
  if (!level) return null
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: COLOURS[level] ?? "#6b7280" }}
      title={`Confidence: ${level}`}
    />
  )
}
