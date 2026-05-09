import Spinner from "@/components/ui/Spinner"

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner className="h-6 w-6" />
    </div>
  )
}
