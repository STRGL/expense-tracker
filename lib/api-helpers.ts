import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

type AuthSuccess = { session: Session; error: null }
type AuthError = { session: null; error: NextResponse }

function unauthorised(message = "Unauthorised"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export async function requireAuth(): Promise<AuthSuccess | AuthError> {
  const session = await auth()
  if (!session) return { session: null, error: unauthorised() }
  const exists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })
  if (!exists) return { session: null, error: unauthorised("Session expired, please log in again") }
  return { session, error: null }
}

export async function requireAdmin(): Promise<AuthSuccess | AuthError> {
  const session = await auth()
  if (!session) return { session: null, error: unauthorised() }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })
  if (!user) return { session: null, error: unauthorised("Session expired, please log in again") }
  if (user.role !== "admin") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { session, error: null }
}
