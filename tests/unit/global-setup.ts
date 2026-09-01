import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const TEST_DB_URL = "file:./test.db";

export default function setup() {
  process.env.DATABASE_URL = TEST_DB_URL;
  execSync("npx prisma db push --skip-generate", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });
  return () => {
    rmSync(path.resolve(__dirname, "../../prisma/test.db"), { force: true });
  };
}
