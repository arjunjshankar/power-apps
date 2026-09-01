// Zero-config demo startup: if the local SQLite database doesn't exist yet,
// create the schema and seed demo data automatically before `next dev`.
import { existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const dbPath = join(root, "prisma", "dev.db");

if (!existsSync(envPath)) {
  writeFileSync(envPath, 'DATABASE_URL="file:./dev.db"\n');
  console.log("Created .env with local SQLite DATABASE_URL.");
}

if (!existsSync(dbPath)) {
  console.log("No database found — creating schema and seeding demo data...");
  execSync("npx prisma db push", { cwd: root, stdio: "inherit" });
  execSync("npx prisma db seed", { cwd: root, stdio: "inherit" });
}
