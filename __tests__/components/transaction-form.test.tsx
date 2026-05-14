import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import TransactionForm from "@/components/transactions/TransactionForm"

function mockFetch() {
  return jest.fn((url: string) => {
    if (url === "/api/aliases") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url === "/api/users/active") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: "me", name: "Me" }]) })
    }
    if (url === "/api/profile") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "me", wage: null, hasAcknowledgedSplitWarning: true }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "txn1" }) })
  })
}

describe("TransactionForm sign handling", () => {
  beforeEach(() => {
    global.fetch = mockFetch() as unknown as typeof fetch
  })

  test("preserves negative totalAmount when editing an existing debit transaction", async () => {
    const initial = {
      id: "txn1",
      date: "2026-05-01",
      merchantRaw: "Tesco",
      merchantName: "Tesco",
      totalAmount: -50,
      notes: null,
      splits: [{ userId: "me", amount: -50, splitMethod: "equal", tagId: null }],
    }

    render(<TransactionForm initial={initial} currentUserId="me" />)

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as jest.Mock
      const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")
      expect(putCall).toBeDefined()
      const body = JSON.parse(putCall![1].body)
      expect(body.totalAmount).toBe(-50)
      expect(body.splits[0].amount).toBe(-50)
    })
  })

  test("preserves the date when editing without touching the date input", async () => {
    const initial = {
      id: "txn1",
      date: "2026-03-01T00:00:00.000Z",
      merchantRaw: "Tesco",
      merchantName: "Tesco",
      totalAmount: -50,
      notes: null,
      splits: [{ userId: "me", amount: -50, splitMethod: "equal", tagId: null }],
    }

    render(<TransactionForm initial={initial} currentUserId="me" />)

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as jest.Mock
      const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")
      expect(putCall).toBeDefined()
      const body = JSON.parse(putCall![1].body)
      expect(body.date).toBe("2026-03-01")
    })
  })
})
