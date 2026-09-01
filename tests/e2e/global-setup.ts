import { execSync } from "node:child_process";
import path from "node:path";

// Reset + reseed the demo database so e2e runs are deterministic.
export default function globalSetup() {
  execSync("npx prisma db push --force-reset && npx prisma db seed", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
  });
}
