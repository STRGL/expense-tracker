import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

const USER_SELECT = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  const { name, email, role } = await request.json()
  const data: Prisma.UserUpdateInput = {}
  if (name?.trim()) data.name = name.trim()
  if (email?.trim()) data.email = email.trim().toLowerCase()
  if (role && ["admin", "user"].includes(role)) data.role = role
  const user = await prisma.user.update({ where: { id }, data, select: USER_SELECT })
  return NextResponse.json(user)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
