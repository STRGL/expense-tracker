import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function PUT(request, { params }) {
  const { session, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  await prisma.notification.update({
    where: { id, userId: session.user.id },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
