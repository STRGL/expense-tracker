import { calculateSplits, validateSpecifiedSplits } from "@/lib/split-calculator"

describe("calculateSplits — equal", () => {
  it("splits evenly between two users", () => {
    const result = calculateSplits(100, "equal", [{ id: "u1" }, { id: "u2" }])
    expect(result).toHaveLength(2)
    expect(result[0].amount + result[1].amount).toBeCloseTo(100, 2)
    expect(result[0].amount).toBeCloseTo(50, 2)
    expect(result[1].amount).toBeCloseTo(50, 2)
  })

  it("assigns full amount to sole user", () => {
    const result = calculateSplits(75.50, "equal", [{ id: "u1" }])
    expect(result[0].amount).toBeCloseTo(75.50, 2)
  })

  it("handles uneven division by adjusting the first user", () => {
    const result = calculateSplits(10, "equal", [{ id: "u1" }, { id: "u2" }, { id: "u3" }])
    const total = result.reduce((s, r) => s + r.amount, 0)
    expect(total).toBeCloseTo(10, 2)
    expect(result.map(r => r.userId)).toEqual(["u1", "u2", "u3"])
  })
})

describe("calculateSplits — proportional", () => {
  it("splits by wage ratio", () => {
    const users = [{ id: "u1", wage: 30000 }, { id: "u2", wage: 70000 }]
    const result = calculateSplits(100, "proportional", users)
    expect(result.find(r => r.userId === "u1").amount).toBeCloseTo(30, 1)
    expect(result.find(r => r.userId === "u2").amount).toBeCloseTo(70, 1)
    const total = result.reduce((s, r) => s + r.amount, 0)
    expect(total).toBeCloseTo(100, 2)
  })

  it("throws when all wages are zero or missing", () => {
    expect(() =>
      calculateSplits(100, "proportional", [{ id: "u1" }, { id: "u2" }])
    ).toThrow("wages are zero")
  })

  it("handles a single user with any wage", () => {
    const result = calculateSplits(50, "proportional", [{ id: "u1", wage: 45000 }])
    expect(result[0].amount).toBeCloseTo(50, 2)
  })
})

describe("validateSpecifiedSplits", () => {
  it("returns true when amounts sum to total", () => {
    expect(
      validateSpecifiedSplits(100, [{ amount: 60 }, { amount: 40 }])
    ).toBe(true)
  })

  it("returns false when amounts do not sum to total", () => {
    expect(
      validateSpecifiedSplits(100, [{ amount: 60 }, { amount: 35 }])
    ).toBe(false)
  })

  it("tolerates floating point imprecision up to 1 cent", () => {
    expect(
      validateSpecifiedSplits(10, [{ amount: 3.33 }, { amount: 3.33 }, { amount: 3.34 }])
    ).toBe(true)
  })
})
