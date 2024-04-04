import childProcess from "node:child_process";
import path from "node:path";
// Global setup runs inside Node.js, not `workerd`
export default function () {
  // Build `api-service`'s dependencies

  let label = "Built multiple-workers auth-service";
  console.time(label);
  childProcess.execSync("pnpm build", {
    cwd: path.join("../../authx_token_api"),
  });
  console.timeEnd(label);

  label = "Built multiple-workers database-service";
  console.time(label);
  childProcess.execSync("pnpm build", {
    cwd: path.join("../../data_channel_registrar"),
  });
  console.timeEnd(label);

}