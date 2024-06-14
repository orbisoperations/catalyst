import childProcess from "node:child_process";
import path from "node:path";
// Global setup runs inside Node.js, not `workerd`
export default function () {
  // Build `api-service`'s dependencies

  let label = "Compiled user cache";
  console.time(label);
  childProcess.execSync("pnpm build", {
    cwd: path.join("../user_credentials_cache"),
  });
  console.timeEnd(label);
}