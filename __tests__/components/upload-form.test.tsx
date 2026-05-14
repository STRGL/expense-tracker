import "@testing-library/jest-dom"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import UploadForm from "@/components/imports/UploadForm"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function csvFile(text: string, name = "statement.csv"): File {
  return new File([text], name, { type: "text/csv" })
}

async function pickFile(text: string) {
  const fileInput = document.getElementById("file") as HTMLInputElement
  fireEvent.change(fileInput, { target: { files: [csvFile(text)] } })
  await waitFor(() => {
    expect(screen.getByText(/Map columns/i)).toBeInTheDocument()
  })
}

describe("UploadForm", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  it("surfaces a useful error when the server returns 500 with an empty body (regression for today's bug)", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "",
    })

    render(<UploadForm />)
    await pickFile("Date,Merchant,Amount\n01/01/2026,Test,10.00\n")

    fireEvent.click(screen.getByRole("button", { name: /Process import/i }))

    await waitFor(() => {
      expect(screen.getByText(/500 Internal Server Error/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /Processing/i })).not.toBeInTheDocument()
  })

  it("surfaces the server's error message when the response is JSON", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ error: "csvText is required" }),
    })

    render(<UploadForm />)
    await pickFile("Date,Merchant,Amount\n01/01/2026,Test,10.00\n")

    fireEvent.click(screen.getByRole("button", { name: /Process import/i }))

    await waitFor(() => {
      expect(screen.getByText(/csvText is required/i)).toBeInTheDocument()
    })
  })
})
