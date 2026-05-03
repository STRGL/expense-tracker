import { normalizeMerchant } from "@/lib/merchant-normalizer"

describe("normalizeMerchant", () => {
  it("returns empty string for null/undefined input", () => {
    expect(normalizeMerchant(null)).toBe("")
    expect(normalizeMerchant(undefined)).toBe("")
    expect(normalizeMerchant("")).toBe("")
  })

  it("uppercases and trims the result", () => {
    expect(normalizeMerchant("  tesco  ")).toBe("TESCO")
  })

  it("strips date patterns like 01/01/2024", () => {
    const result = normalizeMerchant("AMAZON MKTPL 01/05/2026")
    expect(result).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(result).toContain("AMAZON MKTPL")
  })

  it("strips ISO date patterns like 2026-05-01", () => {
    const result = normalizeMerchant("TESCO STORES 2026-05-01")
    expect(result).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(result).toContain("TESCO STORES")
  })

  it("strips currency amounts like £23.45", () => {
    const result = normalizeMerchant("AMAZON £23.45 UK")
    expect(result).not.toMatch(/£\d/)
    expect(result).toContain("AMAZON")
    expect(result).toContain("UK")
  })

  it("strips decimal amounts like 99.99", () => {
    const result = normalizeMerchant("PAYPAL 99.99 PAYMENT")
    expect(result).not.toMatch(/99\.99/)
    expect(result).toContain("PAYPAL")
    expect(result).toContain("PAYMENT")
  })

  it("strips long reference codes of 8+ alphanumeric characters", () => {
    const result = normalizeMerchant("AMZN MKTPL US12345678")
    expect(result).not.toMatch(/US12345678/)
    expect(result).toContain("AMZN MKTPL")
  })

  it("collapses multiple spaces into one", () => {
    const result = normalizeMerchant("TESCO   STORES")
    expect(result).toBe("TESCO STORES")
  })

  it("handles a typical bank string end-to-end", () => {
    const result = normalizeMerchant("AMZN MKTP UK*AB12CD34 01/05/2026 £42.99")
    expect(result).toBe("AMZN MKTP UK*")
  })
})
