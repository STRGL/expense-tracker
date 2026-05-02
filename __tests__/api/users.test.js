/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/users/route"
import { PUT, DELETE } from "@/app/api/users/[id]/route"
import { PUT as PUT_PASSWORD } from "@/app/api/users/[id]/password/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock("@/lib/auth-utils", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed"),
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")

const adminSession = { user: { id: "admin1", role: "admin" } }
const userSession = { user: { id: "u1", role: "user" } }

describe("GET /api/users (admin only)", () => {
  beforeEach(() => jest.clearAllMocks())
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })
  it("returns 403 for non-admin users", async () => {
    auth.mockResolvedValue(userSession)
    const res = await GET()
    expect(res.status).toBe(403)
  })
  it("returns all users for admin", async () => {
    auth.mockResolvedValue(adminSession)
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Alice", email: "alice@test.com", role: "user", isActive: true },
    ])
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
  })
})

describe("POST /api/users (admin only)", () => {
  beforeEach(() => jest.clearAllMocks())
  it("returns 403 for non-admin users", async () => {
    auth.mockResolvedValue(userSession)
    const req = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "bob@test.com", password: "password123" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
  it("returns 409 when email already in use", async () => {
    auth.mockResolvedValue(adminSession)
    prisma.user.findUnique.mockResolvedValue({ id: "existing" })
    const req = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "existing@test.com", password: "password123" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
  it("creates a user and returns 201 for admin", async () => {
    auth.mockResolvedValue(adminSession)
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: "u2", name: "Bob", email: "bob@test.com", role: "user", isActive: true })
    const req = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "bob@test.com", password: "password123" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe("PUT /api/users/[id] (admin only)", () => {
  beforeEach(() => jest.clearAllMocks())
  it("updates user details", async () => {
    auth.mockResolvedValue(adminSession)
    prisma.user.update.mockResolvedValue({ id: "u1", name: "Updated", email: "a@test.com", role: "user", isActive: true })
    const req = new Request("http://localhost/api/users/u1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "u1" }) })
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/users/[id] (admin only — deactivates)", () => {
  beforeEach(() => jest.clearAllMocks())
  it("deactivates user (sets isActive false)", async () => {
    auth.mockResolvedValue(adminSession)
    prisma.user.update.mockResolvedValue({ id: "u1", isActive: false })
    const req = new Request("http://localhost/api/users/u1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "u1" }) })
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })
})

describe("PUT /api/users/[id]/password (admin only)", () => {
  beforeEach(() => jest.clearAllMocks())
  it("resets password", async () => {
    auth.mockResolvedValue(adminSession)
    prisma.user.update.mockResolvedValue({ id: "u1" })
    const req = new Request("http://localhost/api/users/u1/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "newpassword123" }),
    })
    const res = await PUT_PASSWORD(req, { params: Promise.resolve({ id: "u1" }) })
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "hashed" } })
    )
  })
})
