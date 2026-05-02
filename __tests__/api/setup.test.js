/**
 * @jest-environment node
 */
import { POST } from "@/app/api/setup/route"

const mockUserCreate = jest.fn()
const mockTagCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        user: { create: mockUserCreate },
        tag: { create: mockTagCreate },
      })
    ),
  },
}))

jest.mock("@/lib/auth-utils", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed-password"),
}))

const { prisma } = require("@/lib/prisma")

describe("POST /api/setup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUserCreate.mockResolvedValue({ id: "user-1", name: "Admin", email: "admin@test.com", role: "admin" })
    mockTagCreate.mockResolvedValue({ id: "tag-1" })
  })

  it("returns 403 when users already exist", async () => {
    prisma.user.count.mockResolvedValue(1)

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "a@test.com", password: "password123" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe("Setup already completed")
  })

  it("returns 400 when required fields are missing", async () => {
    prisma.user.count.mockResolvedValue(0)

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("All fields required")
  })

  it("returns 400 when password is shorter than 8 characters", async () => {
    prisma.user.count.mockResolvedValue(0)

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "a@test.com", password: "short" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("Password must be at least 8 characters")
  })

  it("returns 400 for invalid email format", async () => {
    prisma.user.count.mockResolvedValue(0)

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "notanemail", password: "password123" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("Invalid email address")
  })

  it("creates the admin user and returns success on valid request", async () => {
    prisma.user.count.mockResolvedValue(0)

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "admin@test.com", password: "password123" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "admin@test.com",
          role: "admin",
          passwordHash: "hashed-password",
        }),
      })
    )
  })

  it("creates 9 default tags (5 parent + 4 children) on valid request", async () => {
    prisma.user.count.mockResolvedValue(0)

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "admin@test.com", password: "password123" }),
    })

    await POST(req)

    expect(mockTagCreate).toHaveBeenCalledTimes(9)
  })
})
