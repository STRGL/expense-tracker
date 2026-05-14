/**
 * @jest-environment node
 */
import { apiFetch, ApiError } from "@/lib/api-client"

function mockResponse({
  ok,
  status = 200,
  statusText = "",
  body = "",
}: {
  ok: boolean
  status?: number
  statusText?: string
  body?: string
}): Response {
  return {
    ok,
    status,
    statusText,
    text: async () => body,
  } as Response
}

describe("apiFetch", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  it("returns parsed JSON on 2xx", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ ok: true, status: 200, body: JSON.stringify({ id: "abc" }) }),
    )
    const result = await apiFetch<{ id: string }>("/api/x")
    expect(result).toEqual({ id: "abc" })
  })

  it("returns undefined for 2xx with empty body (e.g. 204)", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ ok: true, status: 204, body: "" }),
    )
    const result = await apiFetch<void>("/api/x")
    expect(result).toBeUndefined()
  })

  it("throws ApiError with body.error on 4xx with JSON error body", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        body: JSON.stringify({ error: "csvText is required" }),
      }),
    )
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "csvText is required",
    })
  })

  it("throws ApiError with HTML body excerpt on 5xx with HTML page", async () => {
    const html = "<!DOCTYPE html><html><body>Server error: something went wrong with Prisma...</body></html>"
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ ok: false, status: 500, statusText: "Internal Server Error", body: html }),
    )
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
    })
    await expect(apiFetch("/api/x")).rejects.toThrow(/Server error/)
  })

  it("throws ApiError with status text on 5xx with empty body (regression for today's bug)", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ ok: false, status: 500, statusText: "Internal Server Error", body: "" }),
    )
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "500 Internal Server Error",
    })
  })

  it("throws ApiError with bare status when statusText is missing too", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ ok: false, status: 503, statusText: "", body: "" }),
    )
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "503 Request failed",
    })
  })

  it("propagates network errors as-is", async () => {
    const networkError = new TypeError("Failed to fetch")
    ;(global.fetch as jest.Mock).mockRejectedValue(networkError)
    await expect(apiFetch("/api/x")).rejects.toBe(networkError)
  })

  it("exposes the parsed body on the error for callers that need it", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        ok: false,
        status: 422,
        body: JSON.stringify({ error: "validation", fields: ["date"] }),
      }),
    )
    try {
      await apiFetch("/api/x")
      throw new Error("should not reach")
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).body).toEqual({ error: "validation", fields: ["date"] })
    }
  })

  it("passes init through to fetch", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ ok: true, status: 201, body: JSON.stringify({ id: "x" }) }),
    )
    await apiFetch("/api/x", { method: "POST", body: "hello" })
    expect(global.fetch).toHaveBeenCalledWith("/api/x", { method: "POST", body: "hello" })
  })
})
