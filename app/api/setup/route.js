// app/api/setup/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth-utils"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEFAULT_TAGS = [
  {
    name: "Food",
    colour: "#f97316",
    children: [
      { name: "Groceries", colour: "#fb923c" },
      { name: "Eating Out", colour: "#fdba74" },
    ],
  },
  {
    name: "Transport",
    colour: "#3b82f6",
    children: [
      { name: "Petrol", colour: "#60a5fa" },
      { name: "Public Transport", colour: "#93c5fd" },
    ],
  },
  { name: "Utilities", colour: "#8b5cf6", children: [] },
  { name: "Entertainment", colour: "#ec4899", children: [] },
  { name: "Misc", colour: "#6b7280", children: [] },
]

export async function POST(request) {
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 403 })
  }

  const body = await request.json()
  const name = body.name?.trim() ?? ""
  const email = body.email?.trim().toLowerCase() ?? ""
  const password = body.password ?? ""

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "admin" },
    })

    for (const tagDef of DEFAULT_TAGS) {
      const parent = await tx.tag.create({
        data: {
          name: tagDef.name,
          colour: tagDef.colour,
          isShared: true,
          createdById: user.id,
        },
      })

      for (const child of tagDef.children) {
        await tx.tag.create({
          data: {
            name: child.name,
            colour: child.colour,
            parentId: parent.id,
            isShared: true,
            createdById: user.id,
          },
        })
      }
    }
  })

  return NextResponse.json({ success: true })
}
