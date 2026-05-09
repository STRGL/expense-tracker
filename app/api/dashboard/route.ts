// app/api/dashboard/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const dateFromStr = searchParams.get("dateFrom")
  const dateToStr = searchParams.get("dateTo")

  if (!dateFromStr || !dateToStr) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 })
  }

  const dateFrom = new Date(dateFromStr)
  const dateTo = new Date(dateToStr)

  const duration = dateTo.getTime() - dateFrom.getTime()
  const prevDateFrom = new Date(dateFrom.getTime() - duration - 1)
  const prevDateTo = new Date(dateFrom.getTime() - 1)

  const splitQuery = { userId: session.user.id, status: "active" }
  const splitInclude = {
    transaction: { select: { id: true, date: true, merchantName: true, totalAmount: true } },
    tag: { select: { id: true, name: true, colour: true, parentId: true } },
  }

  const [splits, prevSplits] = await Promise.all([
    prisma.transactionSplit.findMany({
      where: { ...splitQuery, transaction: { date: { gte: dateFrom, lte: dateTo } } },
      include: splitInclude,
    }),
    prisma.transactionSplit.findMany({
      where: { ...splitQuery, transaction: { date: { gte: prevDateFrom, lte: prevDateTo } } },
      include: splitInclude,
    }),
  ])

  // Sort splits by absolute amount for "Top Transactions" and "Biggest Transaction"
  const sortedSplits = [...splits].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  const outflowSplits = splits.filter(sp => sp.amount < 0)
  const totalOutflow = Math.abs(outflowSplits.reduce((s, sp) => s + sp.amount, 0))

  const biggestSplit = sortedSplits[0] ?? null
  const biggestTransaction = biggestSplit
    ? { 
        amount: biggestSplit.amount, 
        merchantName: biggestSplit.transaction.merchantName, 
        date: biggestSplit.transaction.date 
      }
    : null

  type TagInfo = { id: string; name: string; colour: string; parentId: string | null } | null
  type SplitWithTag = (typeof splits)[number]

  const tagCounts: Record<string, { count: number; tag: TagInfo }> = {}
  for (const sp of splits) {
    if (!sp.tagId) continue
    tagCounts[sp.tagId] = { count: (tagCounts[sp.tagId]?.count ?? 0) + 1, tag: sp.tag }
  }
  const mostUsedEntry = Object.values(tagCounts).sort((a, b) => b.count - a.count)[0] ?? null
  const mostUsedTag = mostUsedEntry && mostUsedEntry.tag
    ? { name: mostUsedEntry.tag.name, colour: mostUsedEntry.tag.colour, count: mostUsedEntry.count }
    : null

  const tagAmounts: Record<string, { tagId: string | null; tagName: string; colour: string; parentId: string | null; amount: number }> = {}
  for (const sp of outflowSplits) {
    const key = sp.tagId ?? "untagged"
    if (!tagAmounts[key]) {
      tagAmounts[key] = {
        tagId: sp.tagId,
        tagName: sp.tag?.name ?? "Untagged",
        colour: sp.tag?.colour ?? "#6b7280",
        parentId: sp.tag?.parentId ?? null,
        amount: 0,
      }
    }
    tagAmounts[key].amount += Math.abs(sp.amount)
  }
  const spendByTag = Object.values(tagAmounts)

  const monthTotals: Record<string, number> = {}
  for (const sp of outflowSplits) {
    const d = new Date(sp.transaction.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthTotals[key] = (monthTotals[key] ?? 0) + Math.abs(sp.amount)
  }
  const spendOverTime = Object.entries(monthTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => ({ period, amount }))

  function groupByTopLevelTag(splitsArr: SplitWithTag[]) {
    const byTag: Record<string, { tagId: string; amount: number; tag: TagInfo }> = {}
    for (const sp of splitsArr) {
      if (!sp.tagId) continue
      const topId = sp.tag?.parentId ?? sp.tagId
      if (!byTag[topId]) byTag[topId] = { tagId: topId, amount: 0, tag: sp.tag?.parentId ? null : sp.tag }
      byTag[topId].amount += Math.abs(sp.amount)
      if (!byTag[topId].tag && !sp.tag?.parentId) byTag[topId].tag = sp.tag
    }
    return byTag
  }

  const currentByTag = groupByTopLevelTag(outflowSplits)
  const prevByTag = groupByTopLevelTag(prevSplits.filter(sp => sp.amount < 0))
  const allTagIds = new Set([...Object.keys(currentByTag), ...Object.keys(prevByTag)])

  const trends: Array<{ tagId: string; tagName: string; colour: string; previousAmount: number; currentAmount: number; change: number | null }> = []
  for (const tagId of allTagIds) {
    const current = currentByTag[tagId]?.amount ?? 0
    const previous = prevByTag[tagId]?.amount ?? 0
    if (current === 0 && previous === 0) continue
    const tag = currentByTag[tagId]?.tag ?? prevByTag[tagId]?.tag
    trends.push({
      tagId,
      tagName: tag?.name ?? "Unknown",
      colour: tag?.colour ?? "#6b7280",
      previousAmount: previous,
      currentAmount: current,
      change: previous !== 0 ? ((current - previous) / previous) * 100 : null,
    })
  }

  const increases = trends.filter(t => t.change !== null && t.change > 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, 3)
  // Hide decreases if current month has NO spending (suggests data hasn't been uploaded yet)
  const decreases = totalOutflow > 0
    ? trends.filter(t => t.change !== null && t.change < 0).sort((a, b) => (a.change ?? 0) - (b.change ?? 0)).slice(0, 3)
    : []

  const merchantTotals: Record<string, number> = {}
  for (const sp of outflowSplits) {
    const m = sp.transaction.merchantName
    merchantTotals[m] = (merchantTotals[m] ?? 0) + Math.abs(sp.amount)
  }
  const topMerchants = Object.entries(merchantTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([merchantName, amount]) => ({ merchantName, amount }))

  const topTransactions = sortedSplits.slice(0, 15).map(sp => ({
    id: sp.transaction.id,
    date: sp.transaction.date,
    merchantName: sp.transaction.merchantName,
    myAmount: sp.amount,
    myTag: sp.tag ? { name: sp.tag.name, colour: sp.tag.colour } : null,
  }))

  return NextResponse.json({
    summary: { totalSpend: totalOutflow, biggestTransaction, mostUsedTag },
    spendByTag,
    spendOverTime,
    tagTrends: { increases, decreases },
    topMerchants,
    topTransactions,
  })
}
