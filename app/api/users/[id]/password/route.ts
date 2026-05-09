import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth-utils"
import { requireAdmin } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  const { password } = await request.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }
  const passwordHash = await hashPassword(password)
  await prisma.user.update({ where: { id }, data: { passwordHash } })
  return NextResponse.json({ success: true })
}
