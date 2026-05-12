import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { validatePassword } from "@/lib/auth-utils"

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  trustHost: true,
  secret: process.env.AUTH_SECRET || "fallback-secret-for-dev",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("Authorize attempt for:", credentials?.email)
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
        })

        if (!user || !user.isActive) {
          console.log("User not found or inactive:", credentials?.email)
          return null
        }

        const valid = await validatePassword(
          String(credentials.password),
          user.passwordHash
        )

        if (!valid) {
          console.log("Invalid password for:", credentials?.email)
          return null
        }

        console.log("Authorize success for:", credentials?.email)
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
