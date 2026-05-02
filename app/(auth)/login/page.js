// app/(auth)/login/page.js
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LoginForm from "./LoginForm"

export const metadata = { title: "Sign in — Expense Tracker" }

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  // Fresh install: no users yet — send to setup
  const userCount = await prisma.user.count()
  if (userCount === 0) redirect("/setup")

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <LoginForm />
    </div>
  )
}
