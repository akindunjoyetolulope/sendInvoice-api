import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import * as schema from "./schema"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")

const pool = mysql.createPool(process.env.DATABASE_URL)

export const db = drizzle(pool, { schema, mode: "default" })

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" })
}
