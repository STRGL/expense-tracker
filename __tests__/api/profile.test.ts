/**
 * @jest-environment node
 */
import { GET, PUT } from "@/app/api/profile/route"

const mockUser = {
  id: "u1", name: "Alice", email: "alice@test.com",
  wage: 50000, role: "user", themeAccent: "blue",
}

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock("@/lib/auth-utils", () => ({
  hashPassword: jest.fn().mockResolvedValue("new-hash"),
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")

describe("GET /api/profile", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns the current user profile", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    prisma.user.findUnique.mockResolvedValue(mockUser)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.email).toBe("alice@test.com")
    expect(body.passwordHash).toBeUndefined()
  })

  it("returns themeAccent in the profile", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    prisma.user.findUnique.mockResolvedValue(mockUser)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.themeAccent).toBe("blue")
  })
})

describe("PUT /api/profile", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob" }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it("updates the user name", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    prisma.user.update.mockResolvedValue({ ...mockUser, name: "Alice Updated" })
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice Updated" }),
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Alice Updated" }) })
    )
  })

  it("returns 400 when password is shorter than 8 characters", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "short" }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it("hashes password when updating", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    prisma.user.update.mockResolvedValue(mockUser)
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "newpassword123" }),
    })
    await PUT(req)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: "new-hash" }) })
    )
  })

  it("updates themeAccent when valid", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    prisma.user.update.mockResolvedValue({ ...mockUser, themeAccent: "violet" })
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeAccent: "violet" }),
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.themeAccent).toBe("violet")
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { themeAccent: "violet" } })
    )
  })

  it("returns 400 for an invalid accent value", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } })
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeAccent: "chartreuse" }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })
})
