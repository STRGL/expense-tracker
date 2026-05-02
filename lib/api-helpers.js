// lib/api-helpers.js
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function requireAuth() {
  const session = await auth()
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) }
  }
  return { session, error: null }
}

export async function requireAdmin() {
  const session = await auth()
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) }
  }
  if (session.user.role !== "admin") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { session, error: null }
}
