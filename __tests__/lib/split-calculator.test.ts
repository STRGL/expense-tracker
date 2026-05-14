import {
  calculateSplits,
  validateSpecifiedSplits,
  isPendingSplit,
  resolveProportionalSplits,
  SplitResult,
  ProportionalResult,
} from "@/lib/split-calculator"

describe("resolveProportionalSplits", () => {
  const wages = new Map<string, number | null>([
    ["u1", 30000],
    ["u2", 60000],
    ["u3", null],
  ])

  it("computes proportional amounts from wages when all participants have a wage", () => {
    const result = resolveProportionalSplits(
      [
        { userId: "u1", amount: 0, splitMethod: "proportional" },
        { userId: "u2", amount: 0, splitMethod: "proportional" },
      ],
      90,
      wages,
    )
    expect(result.isPending).toBe(false)
    const byUser = new Map(result.splits.map(s => [s.userId, s.amount]))
    expect(byUser.get("u1")! + byUser.get("u2")!).toBeCloseTo(90, 2)
    expect(byUser.get("u2")!).toBeGreaterThan(byUser.get("u1")!)
  })

  it("returns pending=true with zero amounts when any participant is missing a wage", () => {
    const result = resolveProportionalSplits(
      [
        { userId: "u1", amount: 0, splitMethod: "proportional" },
        { userId: "u3", amount: 0, splitMethod: "proportional" },
      ],
      90,
      wages,
    )
    expect(result.isPending).toBe(true)
    expect(result.splits.every(s => s.amount === 0)).toBe(true)
  })

  it("leaves non-proportional splits untouched", () => {
    const input = [{ userId: "u1", amount: 45, splitMethod: "equal" }]
    const result = resolveProportionalSplits(input, 90, wages)
    expect(result.splits).toEqual(input)
    expect(result.isPending).toBe(false)
  })

  it("returns pending=false for single-participant proportional (math still works)", () => {
    const result = resolveProportionalSplits(
      [{ userId: "u1", amount: 0, splitMethod: "proportional" }],
      90,
      wages,
    )
    expect(result.isPending).toBe(false)
    expect(result.splits[0].amount).toBeCloseTo(90, 2)
  })
})

describe("isPendingSplit", () => {
  it("returns true for a proportional split with zero amount (waiting for wage data)", () => {
    expect(isPendingSplit({ splitMethod: "proportional", amount: 0 })).toBe(true)
  })

  it("returns false for a proportional split with computed amount", () => {
    expect(isPendingSplit({ splitMethod: "proportional", amount: 42.5 })).toBe(false)
  })

  it("returns false for a proportional split with negative computed amount", () => {
    expect(isPendingSplit({ splitMethod: "proportional", amount: -42.5 })).toBe(false)
  })

  it("returns false for non-proportional methods regardless of amount", () => {
    expect(isPendingSplit({ splitMethod: "equal", amount: 0 })).toBe(false)
    expect(isPendingSplit({ splitMethod: "specified", amount: 0 })).toBe(false)
  })
})

describe("calculateSplits — equal", () => {
  it("splits evenly between two users", () => {
    const result = calculateSplits(100, "equal", [{ id: "u1" }, { id: "u2" }]) as SplitResult[]
    expect(result).toHaveLength(2)
    expect(result[0].amount + result[1].amount).toBeCloseTo(100, 2)
    expect(result[0].amount).toBeCloseTo(50, 2)
    expect(result[1].amount).toBeCloseTo(50, 2)
  })

  it("assigns full amount to sole user", () => {
    const result = calculateSplits(75.50, "equal", [{ id: "u1" }]) as SplitResult[]
    expect(result[0].amount).toBeCloseTo(75.50, 2)
  })

  it("handles uneven division by adjusting the first user", () => {
    const result = calculateSplits(10, "equal", [{ id: "u1" }, { id: "u2" }, { id: "u3" }]) as SplitResult[]
    const total = result.reduce((s, r) => s + r.amount, 0)
    expect(total).toBeCloseTo(10, 2)
    expect(result.map(r => r.userId)).toEqual(["u1", "u2", "u3"])
  })
})

describe("calculateSplits — proportional", () => {
  it("splits by wage ratio", () => {
    const users = [{ id: "u1", wage: 30000 }, { id: "u2", wage: 70000 }]
    const { splits, pendingData } = calculateSplits(100, "proportional", users) as ProportionalResult
    expect(pendingData).toBe(false)
    expect(splits.find(r => r.userId === "u1")!.amount).toBeCloseTo(30, 1)
    expect(splits.find(r => r.userId === "u2")!.amount).toBeCloseTo(70, 1)
    const total = splits.reduce((s, r) => s + r.amount, 0)
    expect(total).toBeCloseTo(100, 2)
  })

  it("throws when all wages are zero (and none are missing/null)", () => {
    expect(() =>
      calculateSplits(100, "proportional", [{ id: "u1", wage: 0 }, { id: "u2", wage: 0 }])
    ).toThrow("wages are zero")
  })

  it("handles a single user with any wage", () => {
    const { splits } = calculateSplits(50, "proportional", [{ id: "u1", wage: 45000 }]) as ProportionalResult
    expect(splits[0].amount).toBeCloseTo(50, 2)
  })

  it("yields identical ratios whether using monthly or annual wages", () => {
    const amount = 1000
    const monthlyUsers = [
      { id: "u1", wage: 2500 },
      { id: "u2", wage: 5000 },
    ]
    const annualUsers = [
      { id: "u1", wage: 2500 * 12 },
      { id: "u2", wage: 5000 * 12 },
    ]

    const monthlyResult = calculateSplits(amount, "proportional", monthlyUsers) as ProportionalResult
    const annualResult = calculateSplits(amount, "proportional", annualUsers) as ProportionalResult

    expect(monthlyResult).toEqual(annualResult)
    expect(monthlyResult.splits[0].amount).toBeCloseTo(333.34, 2)
    expect(monthlyResult.splits[1].amount).toBeCloseTo(666.66, 2)
  })

  it("scales correctly for 4 users with proportional splits", () => {
    const amount = 100
    const users = [
      { id: "u1", wage: 20000 },
      { id: "u2", wage: 20000 },
      { id: "u3", wage: 30000 },
      { id: "u4", wage: 30000 },
    ]

    const { splits } = calculateSplits(amount, "proportional", users) as ProportionalResult

    expect(splits).toHaveLength(4)
    expect(splits.find(r => r.userId === "u1")!.amount).toBe(20)
    expect(splits.find(r => r.userId === "u2")!.amount).toBe(20)
    expect(splits.find(r => r.userId === "u3")!.amount).toBe(30)
    expect(splits.find(r => r.userId === "u4")!.amount).toBe(30)

    const total = splits.reduce((s, r) => s + r.amount, 0)
    expect(total).toBe(100)
  })

  it("returns pendingData: true and 0 amounts if any wage is missing", () => {
    const users = [
      { id: "u1", wage: 50000 },
      { id: "u2", wage: null },
    ]
    const { splits, pendingData } = calculateSplits(100, "proportional", users) as ProportionalResult
    expect(pendingData).toBe(true)
    expect(splits.every(s => s.amount === 0)).toBe(true)
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
