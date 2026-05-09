/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/aliases/route"
import { PUT, DELETE } from "@/app/api/aliases/[id]/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    merchantAlias: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("GET /api/aliases", () => {
  beforeEach(() => jest.clearAllMocks())
  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })
  it("returns shared and own private aliases", async () => {
    auth.mockResolvedValue(session)
    prisma.merchantAlias.findMany.mockResolvedValue([
      { id: "a1", rawName: "AMZN", niceName: "Amazon", isShared: true, createdById: "u2" },
      { id: "a2", rawName: "TESCO", niceName: "Tesco", isShared: false, createdById: "u1" },
    ])
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
  })
})

describe("POST /api/aliases", () => {
  beforeEach(() => jest.clearAllMocks())
  it("returns 400 when rawName or niceName is missing", async () => {
    auth.mockResolvedValue(session)
    const req = new Request("http://localhost/api/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawName: "AMZN" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
  it("creates an alias and returns 201", async () => {
    auth.mockResolvedValue(session)
    prisma.merchantAlias.create.mockResolvedValue({ id: "a3", rawName: "AMZN", niceName: "Amazon" })
    const req = new Request("http://localhost/api/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawName: "AMZN", niceName: "Amazon", isShared: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe("PUT /api/aliases/[id]", () => {
  beforeEach(() => jest.clearAllMocks())
  it("returns 403 when user does not own the alias", async () => {
    auth.mockResolvedValue(session)
    prisma.merchantAlias.findUnique.mockResolvedValue({ id: "a1", createdById: "other" })
    const req = new Request("http://localhost/api/aliases/a1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niceName: "Updated" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "a1" }) })
    expect(res.status).toBe(403)
  })
  it("updates alias when owner", async () => {
    auth.mockResolvedValue(session)
    prisma.merchantAlias.findUnique.mockResolvedValue({ id: "a1", createdById: "u1" })
    prisma.merchantAlias.update.mockResolvedValue({ id: "a1", niceName: "Updated" })
    const req = new Request("http://localhost/api/aliases/a1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niceName: "Updated" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "a1" }) })
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/aliases/[id]", () => {
  beforeEach(() => jest.clearAllMocks())
  it("deletes alias when owner", async () => {
    auth.mockResolvedValue(session)
    prisma.merchantAlias.findUnique.mockResolvedValue({ id: "a1", createdById: "u1" })
    prisma.merchantAlias.delete.mockResolvedValue({ id: "a1" })
    const req = new Request("http://localhost/api/aliases/a1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "a1" }) })
    expect(res.status).toBe(200)
  })
})
