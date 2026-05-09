import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth-utils"
import { requireAdmin } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

const USER_SELECT = { id: true, name: true, email: true, role: true, isActive: true, wage: true, createdAt: true }

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: "asc" } })
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error
  const { name, email, password } = await request.json()
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash, role: "user" },
    select: USER_SELECT,
  })
  return NextResponse.json(user, { status: 201 })
}
