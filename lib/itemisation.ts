// lib/itemisation.ts

type PrismaTransactionClient = {
  transaction: {
    findUnique: (args: unknown) => Promise<unknown>
    findFirst: (args: unknown) => Promise<unknown>
    findMany: (args: unknown) => Promise<unknown>
    create: (args: unknown) => Promise<{ id: string }>
    update: (args: unknown) => Promise<unknown>
    delete: (args: unknown) => Promise<unknown>
  }
  transactionSplit: {
    create: (args: unknown) => Promise<unknown>
    deleteMany: (args: unknown) => Promise<unknown>
  }
}

interface ParentWithChildren {
  id: string
  date: Date
  merchantRaw: string
  merchantName: string
  totalAmount: number
  createdById: string
  splits: Array<{
    id: string
    userId: string
    amount: number
    splitMethod: string
    status: string
    hiddenAt: Date | null
  }>
  children: Array<{ id: string; totalAmount: number; isSystemLine: boolean }>
}

export async function upsertSystemLine(
  tx: PrismaTransactionClient,
  parentId: string
): Promise<void> {
  const parent = await (tx.transaction.findUnique as (args: unknown) => Promise<ParentWithChildren | null>)({
    where: { id: parentId },
    include: {
      splits: { where: { status: "active", hiddenAt: null } },
      children: { where: { isSystemLine: false } },
    },
  })
  if (!parent) return

  const realChildSum = parent.children.reduce((s, c) => s + Math.abs(c.totalAmount), 0)
  const parentAbs = Math.abs(parent.totalAmount)
  const remainder = parentAbs - realChildSum

  const systemLine = await (tx.transaction.findFirst as (args: unknown) => Promise<{ id: string } | null>)({
    where: { parentId, isSystemLine: true },
  })

  if (remainder < 0.005) {
    if (systemLine) {
      await tx.transactionSplit.deleteMany({ where: { transactionId: systemLine.id } })
      await tx.transaction.delete({ where: { id: systemLine.id } })
    }
    return
  }

  const sign = parent.totalAmount < 0 ? -1 : 1
  const systemAmount = remainder * sign

  let targetId: string

  if (systemLine) {
    await tx.transaction.update({ where: { id: systemLine.id }, data: { totalAmount: systemAmount } })
    await tx.transactionSplit.deleteMany({ where: { transactionId: systemLine.id } })
    targetId = systemLine.id
  } else {
    const created = await tx.transaction.create({
      data: {
        date: parent.date,
        merchantRaw: parent.merchantRaw,
        merchantName: "Other",
        totalAmount: systemAmount,
        notes: null,
        createdById: parent.createdById,
        parentId: parent.id,
        isSystemLine: true,
        distributeCost: false,
      },
    })
    targetId = created.id
  }

  for (const split of parent.splits) {
    const proportion = parentAbs > 0 ? Math.abs(split.amount) / parentAbs : 1 / parent.splits.length
    await tx.transactionSplit.create({
      data: {
        transactionId: targetId,
        userId: split.userId,
        amount: systemAmount * proportion,
        splitMethod: split.splitMethod,
        tagId: null,
        status: "active",
      },
    })
  }
}

interface SiblingWithSplits {
  id: string
  splits: Array<{ userId: string; status: string }>
}

export async function applyDistributeCost(
  tx: PrismaTransactionClient,
  childId: string,
  parentId: string
): Promise<void> {
  const siblings = await (tx.transaction.findMany as (args: unknown) => Promise<SiblingWithSplits[]>)({
    where: { parentId, isSystemLine: false, distributeCost: false, id: { not: childId } },
    include: { splits: { where: { status: "active" } } },
  })

  const uniqueUserIds = [...new Set(siblings.flatMap(s => s.splits.map(sp => sp.userId)))]
  if (uniqueUserIds.length === 0) return

  const child = await (tx.transaction.findUnique as (args: unknown) => Promise<{ id: string; totalAmount: number } | null>)({
    where: { id: childId },
  })
  if (!child) return

  const shareAmount = child.totalAmount / uniqueUserIds.length

  await tx.transactionSplit.deleteMany({ where: { transactionId: childId } })

  for (const userId of uniqueUserIds) {
    await tx.transactionSplit.create({
      data: {
        transactionId: childId,
        userId,
        amount: shareAmount,
        splitMethod: "equal",
        tagId: null,
        status: "active",
      },
    })
  }
}
