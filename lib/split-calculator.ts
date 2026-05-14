interface SplitUser {
  id: string
  wage?: number | null
}

export interface SplitResult {
  userId: string
  amount: number
}

export interface ProportionalResult {
  pendingData: boolean
  splits: SplitResult[]
}

export function calculateSplits(
  totalAmount: number,
  method: "equal" | "proportional",
  users: SplitUser[]
): SplitResult[] | ProportionalResult {
  if (!users.length) throw new Error("At least one user required")

  if (method === "equal") {
    const n = users.length
    const base = Math.floor((totalAmount * 100) / n) / 100
    const remainder = Math.round((totalAmount - base * n) * 100) / 100
    return users.map((u, i) => ({
      userId: u.id,
      amount: i === 0 ? Math.round((base + remainder) * 100) / 100 : base,
    }))
  }

  if (method === "proportional") {
    const missingWages = users.some(u => u.wage === null || u.wage === undefined)
    if (missingWages) {
      return { pendingData: true, splits: users.map(u => ({ userId: u.id, amount: 0 })) }
    }
    const totalWage = users.reduce((sum, u) => sum + (u.wage ?? 0), 0)
    if (totalWage === 0) throw new Error("Cannot split proportionally: all wages are zero or unset")
    const shares: SplitResult[] = users.map(u => ({
      userId: u.id,
      amount: Math.floor(((u.wage ?? 0) / totalWage) * totalAmount * 100) / 100,
    }))
    const allocated = shares.reduce((sum, s) => sum + s.amount, 0)
    const diff = Math.round((totalAmount - allocated) * 100) / 100
    shares[0].amount = Math.round((shares[0].amount + diff) * 100) / 100
    return { pendingData: false, splits: shares }
  }

  throw new Error(`Unknown split method: ${method}`)
}

export function validateSpecifiedSplits(
  totalAmount: number,
  splits: Array<{ amount: number }>
): boolean {
  const sum = splits.reduce((s, sp) => s + sp.amount, 0)
  return Math.abs(sum - totalAmount) < 0.011
}

export function isPendingSplit(split: { splitMethod: string; amount: number }): boolean {
  return split.splitMethod === "proportional" && split.amount === 0
}

export function resolveProportionalSplits<
  T extends { userId: string; amount: number; splitMethod: string },
>(
  splits: T[],
  totalAmount: number,
  wagesByUserId: Map<string, number | null>,
): { splits: T[]; isPending: boolean } {
  if (splits.length === 0) return { splits, isPending: false }
  const allProportional = splits.every(s => s.splitMethod === "proportional")
  if (!allProportional) return { splits, isPending: false }

  const anyMissing = splits.some(s => {
    const wage = wagesByUserId.get(s.userId)
    return wage == null
  })
  if (anyMissing) {
    return {
      splits: splits.map(s => ({ ...s, amount: 0 })),
      isPending: splits.length > 1,
    }
  }

  const userObjs = splits.map(s => ({ id: s.userId, wage: wagesByUserId.get(s.userId) ?? null }))
  const result = calculateSplits(totalAmount, "proportional", userObjs)
  const computed = Array.isArray(result) ? result : result.splits
  const computedById = new Map(computed.map(c => [c.userId, c.amount]))

  return {
    splits: splits.map(s => ({ ...s, amount: computedById.get(s.userId) ?? 0 })),
    isPending: false,
  }
}
