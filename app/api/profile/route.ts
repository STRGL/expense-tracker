// app/api/profile/route.js
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth-utils"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

const VALID_ACCENTS = ["blue", "violet", "green", "orange", "rose", "red", "yellow", "zinc"]

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, wage: true, role: true, themeAccent: true, hasAcknowledgedSplitWarning: true },
  })

  return NextResponse.json(user)
}

export async function PUT(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { name, email, password, wage, themeAccent, hasAcknowledgedSplitWarning } = await request.json()
  const data: Prisma.UserUpdateInput = {}

  if (name?.trim()) data.name = name.trim()
  if (email?.trim()) data.email = email.trim().toLowerCase()
  if (wage !== undefined) data.wage = wage === "" || wage === null ? null : Number(wage)
  if (password !== undefined) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    data.passwordHash = await hashPassword(password)
  }
  if (themeAccent !== undefined) {
    if (!VALID_ACCENTS.includes(themeAccent)) {
      return NextResponse.json({ error: "Invalid accent colour" }, { status: 400 })
    }
    data.themeAccent = themeAccent
  }
  if (hasAcknowledgedSplitWarning === true) {
    data.hasAcknowledgedSplitWarning = true
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, wage: true, role: true, themeAccent: true, hasAcknowledgedSplitWarning: true },
  })

  return NextResponse.json(user)
}
