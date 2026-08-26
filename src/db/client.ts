import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import * as schema from "./schema"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is not set")
if (!/^mysql:\/\//.test(databaseUrl)) {
  throw new Error(
    "DATABASE_URL is not a valid mysql:// connection string — got: " +
      databaseUrl.slice(0, 40) +
      (databaseUrl.length > 40 ? "…" : ""),
  )
}

const pool = mysql.createPool(databaseUrl)

export const db = drizzle(pool, { schema, mode: "default" })

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" })
}
