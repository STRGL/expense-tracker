import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  className?: string
}

export default function Spinner({ className }: Props) {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className={cn("h-5 w-5 animate-spin text-muted-foreground", className)} />
    </div>
  )
}
