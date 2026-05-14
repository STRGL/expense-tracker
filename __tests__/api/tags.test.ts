/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/tags/route"
import { PUT, DELETE } from "@/app/api/tags/[id]/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
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
const flatTags = [
  { id: "t1", name: "Food", parentId: null, colour: "#f97316", isShared: true, createdById: "u1" },
  { id: "t2", name: "Groceries", parentId: "t1", colour: "#fb923c", isShared: true, createdById: "u1" },
]

describe("GET /api/tags", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns a tag tree", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.findMany.mockResolvedValue(flatTags)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].children).toHaveLength(1)
    expect(body[0].children[0].name).toBe("Groceries")
  })
})

describe("POST /api/tags", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 400 when name is missing", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colour: "#fff" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates a tag and returns 201", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.create.mockResolvedValue({ id: "t3", name: "Entertainment", parentId: null })
    const req = new Request("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Entertainment", colour: "#ec4899", isShared: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Entertainment", createdById: "u1" }) })
    )
  })

  it("returns 400 when parentId points to a non-top-level tag (grandchild prevention)", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.findUnique.mockResolvedValue({ id: "t2", parentId: "t1" })
    const req = new Request("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Deep", parentId: "t2" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe("PUT /api/tags/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 403 when user does not own the tag", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.findUnique.mockResolvedValue({ id: "t1", createdById: "other-user" })
    const req = new Request("http://localhost/api/tags/t1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(403)
  })

  it("updates the tag when user owns it", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.findUnique.mockResolvedValue({ id: "t1", createdById: "u1" })
    prisma.tag.update.mockResolvedValue({ id: "t1", name: "Renamed" })
    const req = new Request("http://localhost/api/tags/t1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/tags/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "user" })
  })

  it("returns 403 when user does not own the tag", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.findUnique.mockResolvedValue({ id: "t1", createdById: "other-user" })
    const req = new Request("http://localhost/api/tags/t1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(403)
  })

  it("deletes the tag when user owns it", async () => {
    auth.mockResolvedValue(session)
    prisma.tag.findUnique.mockResolvedValue({ id: "t1", createdById: "u1" })
    prisma.tag.delete.mockResolvedValue({ id: "t1" })
    const req = new Request("http://localhost/api/tags/t1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "t1" }) })
    expect(res.status).toBe(200)
  })
})
