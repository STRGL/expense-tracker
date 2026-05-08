import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ unread })
}
