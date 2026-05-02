import { defineConfig } from "prisma/config"

// Prisma CLI (migrate dev, generate) uses this config.
// Path is relative to prisma/schema.prisma → resolves to prisma/dev.db.
// The Next.js runtime uses DATABASE_URL from .env.local (loaded by Next.js automatically).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    name: "db",
    provider: "sqlite",
    url: "file:./dev.db",
  },
})
