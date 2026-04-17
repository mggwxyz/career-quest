import { defineConfig } from 'drizzle-kit'

import dotenvFlow from 'dotenv-flow'
dotenvFlow.config()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
