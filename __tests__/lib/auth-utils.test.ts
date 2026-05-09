import { hashPassword, validatePassword } from "@/lib/auth-utils"

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("secret123")
    expect(hash).toMatch(/^\$2[ab]\$/)
  })

  it("produces a different hash each call for the same input", async () => {
    const hash1 = await hashPassword("secret123")
    const hash2 = await hashPassword("secret123")
    expect(hash1).not.toBe(hash2)
  })
})

describe("validatePassword", () => {
  it("returns true when the password matches the hash", async () => {
    const hash = await hashPassword("correct-password")
    const result = await validatePassword("correct-password", hash)
    expect(result).toBe(true)
  })

  it("returns false when the password does not match the hash", async () => {
    const hash = await hashPassword("correct-password")
    const result = await validatePassword("wrong-password", hash)
    expect(result).toBe(false)
  })

  it("returns false for an empty password", async () => {
    const hash = await hashPassword("correct-password")
    const result = await validatePassword("", hash)
    expect(result).toBe(false)
  })
})
