/**
 * @jest-environment node
 */
import { requireAuth, requireAdmin } from "@/lib/api-helpers"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}))

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const mockAuth = auth as jest.Mock
const mockFindUnique = prisma.user.findUnique as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe("requireAuth", () => {
  it("returns the session when the user exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "user" } })
    mockFindUnique.mockResolvedValue({ id: "u1" })
    const { session, error } = await requireAuth()
    expect(error).toBeNull()
    expect(session?.user.id).toBe("u1")
  })

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null)
    const { session, error } = await requireAuth()
    expect(session).toBeNull()
    expect(error?.status).toBe(401)
    const body = await error!.json()
    expect(body.error).toBe("Unauthorised")
  })

  it("returns 401 with 'Session expired' when session exists but user row is gone", async () => {
    mockAuth.mockResolvedValue({ user: { id: "stale", role: "user" } })
    mockFindUnique.mockResolvedValue(null)
    const { session, error } = await requireAuth()
    expect(session).toBeNull()
    expect(error?.status).toBe(401)
    const body = await error!.json()
    expect(body.error).toMatch(/session/i)
  })
})

describe("requireAdmin", () => {
  it("returns the session when the user exists and is admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } })
    mockFindUnique.mockResolvedValue({ id: "u1", role: "admin" })
    const { session, error } = await requireAdmin()
    expect(error).toBeNull()
    expect(session?.user.role).toBe("admin")
  })

  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null)
    const { error } = await requireAdmin()
    expect(error?.status).toBe(401)
  })

  it("returns 401 when session exists but user row is gone", async () => {
    mockAuth.mockResolvedValue({ user: { id: "stale", role: "admin" } })
    mockFindUnique.mockResolvedValue(null)
    const { error } = await requireAdmin()
    expect(error?.status).toBe(401)
  })

  it("returns 403 when user exists but is not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "user" } })
    mockFindUnique.mockResolvedValue({ id: "u1", role: "user" })
    const { error } = await requireAdmin()
    expect(error?.status).toBe(403)
  })
})
