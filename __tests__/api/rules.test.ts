/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/rules/route"
import { PUT, DELETE } from "@/app/api/rules/[id]/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    importRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("GET /api/rules", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })
  it("returns shared and own private rules", async () => {
    auth.mockResolvedValue(session)
    prisma.importRule.findMany.mockResolvedValue([
      { id: "r1", merchantPattern: "TESCO", tagId: "t1", isShared: true, createdById: "u2" },
    ])
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
  })
})

describe("POST /api/rules", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })
  it("returns 400 when merchantPattern or tagId is missing", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantPattern: "TESCO" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
  it("creates a rule and returns 201", async () => {
    auth.mockResolvedValue(session)
    prisma.importRule.create.mockResolvedValue({ id: "r2", merchantPattern: "TESCO", tagId: "t1" })
    const req = new Request("http://localhost/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantPattern: "TESCO", tagId: "t1", isShared: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe("DELETE /api/rules/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })
  it("returns 403 when user does not own the rule", async () => {
    auth.mockResolvedValue(session)
    prisma.importRule.findUnique.mockResolvedValue({ id: "r1", createdById: "other" })
    const req = new Request("http://localhost/api/rules/r1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "r1" }) })
    expect(res.status).toBe(403)
  })
})
