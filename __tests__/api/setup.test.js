/**
 * @jest-environment node
 */
import { POST } from "@/app/api/setup/route"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: jest.fn(),
      create: jest.fn(),
    },
    tag: {
      create: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth-utils", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed-password"),
}))

const { prisma } = require("@/lib/prisma")

describe("POST /api/setup", () => {
  beforeEach(() => jest.clearAllMocks())

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

  it("creates the admin user and returns success on valid request", async () => {
    prisma.user.count.mockResolvedValue(0)
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
    })
    prisma.tag.create.mockResolvedValue({ id: "tag-1" })

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "admin@test.com", password: "password123" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.user.create).toHaveBeenCalledWith(
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
    prisma.user.create.mockResolvedValue({ id: "user-1" })
    prisma.tag.create.mockResolvedValue({ id: "tag-1" })

    const req = new Request("http://localhost/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin", email: "admin@test.com", password: "password123" }),
    })

    await POST(req)

    // Food(1) + Groceries(2) + Eating Out(3)
    // Transport(4) + Petrol(5) + Public Transport(6)
    // Utilities(7) + Entertainment(8) + Misc(9)
    expect(prisma.tag.create).toHaveBeenCalledTimes(9)
  })
})
