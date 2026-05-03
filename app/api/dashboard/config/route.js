// app/api/dashboard/config/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export const dynamic = "force-dynamic"

const DEFAULT_CONFIG = {
  widgets: [
    { id: "summary", type: "summary_cards" },
    { id: "spend-tag", type: "spend_by_tag", chartType: "donut" },
    { id: "over-time", type: "spend_over_time", chartType: "bar" },
    { id: "tag-up", type: "tag_trends_increase" },
    { id: "tag-down", type: "tag_trends_decrease" },
    { id: "merchants", type: "top_merchants" },
    { id: "transactions", type: "top_transactions" },
  ],
  layout: [
    { i: "summary", x: 0, y: 0, w: 12, h: 2 },
    { i: "spend-tag", x: 0, y: 2, w: 5, h: 5 },
    { i: "over-time", x: 5, y: 2, w: 7, h: 5 },
    { i: "tag-up", x: 0, y: 7, w: 4, h: 4 },
    { i: "tag-down", x: 4, y: 7, w: 4, h: 4 },
    { i: "merchants", x: 8, y: 7, w: 4, h: 4 },
    { i: "transactions", x: 0, y: 11, w: 12, h: 5 },
  ],
}

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dashboardConfig: true },
  })

  const config = user?.dashboardConfig ? JSON.parse(user.dashboardConfig) : JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  return NextResponse.json(config)
}

export async function PUT(request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const config = await request.json()
  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardConfig: JSON.stringify(config) },
  })

  return NextResponse.json({ success: true })
}
