import React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { cookies } from "next/headers"
import { ThemeProvider } from "@/components/providers/ThemeProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Expense Tracker",
  description: "Track and split expenses",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light"

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider initialTheme={theme}>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
