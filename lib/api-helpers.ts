import { NextResponse } from "next/server"
import { auth } from "@/auth"
import type { Session } from "next-auth"

type AuthSuccess = { session: Session; error: null }
type AuthError = { session: null; error: NextResponse }

export async function requireAuth(): Promise<AuthSuccess | AuthError> {
  const session = await auth()
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) }
  }
  return { session, error: null }
}

export async function requireAdmin(): Promise<AuthSuccess | AuthError> {
  const session = await auth()
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) }
  }
  if (session.user.role !== "admin") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { session, error: null }
}
