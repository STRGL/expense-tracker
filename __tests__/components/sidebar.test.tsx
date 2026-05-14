import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import Sidebar from "@/components/layout/Sidebar"

const mockSignOut = jest.fn()

jest.mock("next-auth/react", () => ({
  signOut: (opts: unknown) => mockSignOut(opts),
}))

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

describe("Sidebar logout", () => {
  beforeEach(() => {
    mockSignOut.mockClear()
  })

  it("renders a Log out button when expanded", () => {
    render(<Sidebar collapsed={false} onToggle={jest.fn()} isAdmin={false} hasOtherUsers={false} />)
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument()
  })

  it("renders a Log out button when collapsed", () => {
    render(<Sidebar collapsed={true} onToggle={jest.fn()} isAdmin={false} hasOtherUsers={false} />)
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument()
  })

  it("calls signOut with the login page as the callback URL when clicked", () => {
    render(<Sidebar collapsed={false} onToggle={jest.fn()} isAdmin={false} hasOtherUsers={false} />)
    fireEvent.click(screen.getByRole("button", { name: /log out/i }))
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" })
  })
})
