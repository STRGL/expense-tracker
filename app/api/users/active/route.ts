// app/api/users/active/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, wage: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}
