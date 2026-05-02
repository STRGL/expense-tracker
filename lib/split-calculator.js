export function calculateSplits(totalAmount, method, users) {
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
    const totalWage = users.reduce((sum, u) => sum + (u.wage ?? 0), 0)
    if (totalWage === 0) throw new Error("Cannot split proportionally: all wages are zero or unset")
    const shares = users.map((u) => ({
      userId: u.id,
      amount: Math.floor(((u.wage ?? 0) / totalWage) * totalAmount * 100) / 100,
    }))
    const allocated = shares.reduce((sum, s) => sum + s.amount, 0)
    const diff = Math.round((totalAmount - allocated) * 100) / 100
    shares[0].amount = Math.round((shares[0].amount + diff) * 100) / 100
    return shares
  }

  throw new Error(`Unknown split method: ${method}`)
}

export function validateSpecifiedSplits(totalAmount, splits) {
  const sum = splits.reduce((s, sp) => s + sp.amount, 0)
  return Math.abs(sum - totalAmount) < 0.011
}
