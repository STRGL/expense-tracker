// app/api/profile/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth-utils"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, wage: true, role: true },
  })

  return NextResponse.json(user)
}

export async function PUT(request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { name, email, password, wage } = await request.json()
  const data = {}

  if (name?.trim()) data.name = name.trim()
  if (email?.trim()) data.email = email.trim().toLowerCase()
  if (wage !== undefined) data.wage = wage === "" || wage === null ? null : Number(wage)
  if (password !== undefined) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    data.passwordHash = await hashPassword(password)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, wage: true, role: true },
  })

  return NextResponse.json(user)
}
