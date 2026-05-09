/**
 * @jest-environment node
 */
import { PUT, DELETE } from "@/app/api/imports/[id]/rows/bulk/route"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    importBatch: { findUnique: jest.fn() },
    importRow: { updateMany: jest.fn() },
  },
}))

const { auth } = require("@/auth")
const { prisma } = require("@/lib/prisma")
const session = { user: { id: "u1", role: "user" } }

describe("Bulk Import Row APIs", () => {
  beforeEach(() => jest.clearAllMocks())

  describe("PUT /api/imports/[id]/rows/bulk", () => {
    it("updates multiple rows with new tag", async () => {
      auth.mockResolvedValue(session)
      prisma.importBatch.findUnique.mockResolvedValue({ id: "b1", uploadedById: "u1" })
      prisma.importRow.updateMany.mockResolvedValue({ count: 2 })

      const req = new Request("http://localhost/api/imports/b1/rows/bulk", {
        method: "PUT",
        body: JSON.stringify({ rowIds: ["r1", "r2"], data: { tagId: "t1" } }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: "b1" }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.count).toBe(2)
      expect(prisma.importRow.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tagId: "t1" }
        })
      )
    })
  })

  describe("DELETE /api/imports/[id]/rows/bulk", () => {
    it("marks multiple rows as skipped", async () => {
      auth.mockResolvedValue(session)
      prisma.importBatch.findUnique.mockResolvedValue({ id: "b1", uploadedById: "u1" })
      prisma.importRow.updateMany.mockResolvedValue({ count: 3 })

      const req = new Request("http://localhost/api/imports/b1/rows/bulk", {
        method: "DELETE",
        body: JSON.stringify({ rowIds: ["r1", "r2", "r3"] }),
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: "b1" }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.count).toBe(3)
      expect(prisma.importRow.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "skipped" }
        })
      )
    })
  })
})
