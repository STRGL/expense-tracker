/**
 * @jest-environment node
 */
import { GET, PUT } from "@/app/api/notifications/route"
import { GET as GET_COUNT } from "@/app/api/notifications/count/route"
import { PUT as PUT_ONE } from "@/app/api/notifications/[id]/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    splitSuggestion: {
      findFirst: jest.fn(),
    },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("GET /api/notifications", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns notifications for the current user", async () => {
    auth.mockResolvedValue(session)
    prisma.notification.findMany.mockResolvedValue([
      { id: "n1", type: "split_created", read: false, createdAt: new Date(), transaction: { id: "tx1", merchantName: "Tesco", totalAmount: 50, date: new Date() } },
    ])
    prisma.splitSuggestion.findFirst.mockResolvedValue(null)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe("n1")
  })
})

describe("PUT /api/notifications (mark all read)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await PUT()
    expect(res.status).toBe(401)
  })

  it("marks all notifications as read", async () => {
    auth.mockResolvedValue(session)
    prisma.notification.updateMany.mockResolvedValue({ count: 3 })
    const res = await PUT()
    expect(res.status).toBe(200)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "u1", read: false }) })
    )
  })
})

describe("GET /api/notifications/count", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    auth.mockResolvedValue(null)
    const res = await GET_COUNT()
    expect(res.status).toBe(401)
  })

  it("returns unread count", async () => {
    auth.mockResolvedValue(session)
    prisma.notification.count.mockResolvedValue(5)
    const res = await GET_COUNT()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.unread).toBe(5)
  })
})

describe("PUT /api/notifications/[id] (mark one read)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("marks the notification as read", async () => {
    auth.mockResolvedValue(session)
    prisma.notification.update.mockResolvedValue({ id: "n1", read: true })
    const req = new Request("http://localhost/api/notifications/n1", { method: "PUT" })
    const res = await PUT_ONE(req, { params: Promise.resolve({ id: "n1" }) })
    expect(res.status).toBe(200)
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { read: true } })
    )
  })
})
