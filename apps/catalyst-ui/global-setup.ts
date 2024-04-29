import childProcess from "node:child_process";
import path from "node:path";
// Global setup runs inside Node.js, not `workerd`
export default function () {
  // Build `api-service`'s dependencies

  let label = "Compiled issued_jwt_registry";
  console.time(label);
  childProcess.execSync("pnpm wrangler deploy --dry-run --outdir dist ", {
    cwd: path.join("../issued-jwt-registry"),
  });
  console.timeEnd(label);
}
