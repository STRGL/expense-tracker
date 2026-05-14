import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import TransactionForm from "@/components/transactions/TransactionForm"

function mockFetch(opts: { acknowledgedSplitWarning?: boolean } = {}) {
  return jest.fn((url: string) => {
    if (url === "/api/aliases") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url === "/api/users/active") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: "me", name: "Me", hasWage: false },
            { id: "other", name: "Other", hasWage: false },
          ]),
      })
    }
    if (url === "/api/profile") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "me",
            wage: null,
            hasAcknowledgedSplitWarning: opts.acknowledgedSplitWarning ?? true,
          }),
      })
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

  test("displays the original raw merchant name (read-only) when editing an aliased transaction", async () => {
    const initial = {
      id: "txn1",
      date: "2026-04-01T00:00:00.000Z",
      merchantRaw: "TESCO STORES 1234",
      merchantName: "Tesco",
      totalAmount: -50,
      notes: null,
      splits: [{ userId: "me", amount: -50, splitMethod: "equal", tagId: null }],
    }
    render(<TransactionForm initial={initial} currentUserId="me" />)
    expect(screen.getByLabelText(/Original merchant name/i)).toHaveTextContent("TESCO STORES 1234")
  })

  test("does not show original line when raw equals current merchant name", async () => {
    const initial = {
      id: "txn1",
      date: "2026-04-01T00:00:00.000Z",
      merchantRaw: "Tesco",
      merchantName: "Tesco",
      totalAmount: -50,
      notes: null,
      splits: [{ userId: "me", amount: -50, splitMethod: "equal", tagId: null }],
    }
    render(<TransactionForm initial={initial} currentUserId="me" />)
    expect(screen.queryByLabelText(/Original merchant name/i)).not.toBeInTheDocument()
  })

  test("preserves merchantRaw on submit when the user only edits merchantName", async () => {
    const initial = {
      id: "txn1",
      date: "2026-04-01T00:00:00.000Z",
      merchantRaw: "TESCO STORES 1234",
      merchantName: "Tesco",
      totalAmount: -50,
      notes: null,
      splits: [{ userId: "me", amount: -50, splitMethod: "equal", tagId: null }],
    }
    render(<TransactionForm initial={initial} currentUserId="me" />)

    const merchantInput = screen.getByLabelText(/^Merchant$/i)
    fireEvent.change(merchantInput, { target: { value: "Tesco Express" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as jest.Mock
      const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")
      const body = JSON.parse(putCall![1].body)
      expect(body.merchantRaw).toBe("TESCO STORES 1234")
      expect(body.merchantName).toBe("Tesco Express")
    })
  })

  test("does not pop the split-warning modal when editing if the user has previously acknowledged it", async () => {
    global.fetch = mockFetch({ acknowledgedSplitWarning: true }) as unknown as typeof fetch
    const initial = {
      id: "txn1",
      date: "2026-04-01T00:00:00.000Z",
      merchantRaw: "Tesco",
      merchantName: "Tesco",
      totalAmount: -50,
      notes: null,
      splits: [
        { userId: "me", amount: -25, splitMethod: "equal", tagId: null },
        { userId: "other", amount: -25, splitMethod: "equal", tagId: null },
      ],
    }
    render(<TransactionForm initial={initial} currentUserId="me" />)

    await waitFor(() => {
      expect((global.fetch as unknown as jest.Mock).mock.calls.some(([url]) => url === "/api/profile")).toBe(true)
    })

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const putCall = (global.fetch as unknown as jest.Mock).mock.calls.find(([, init]) => init?.method === "PUT")
      expect(putCall).toBeDefined()
    })
    expect(screen.queryByText(/Before you split/i)).not.toBeInTheDocument()
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
