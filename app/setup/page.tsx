import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SetupForm from "./SetupForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Setup — Expense Tracker" }

export default async function SetupPage() {
  const userCount = await prisma.user.count()
  if (userCount > 0) redirect("/login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <SetupForm />
    </div>
  )
}
