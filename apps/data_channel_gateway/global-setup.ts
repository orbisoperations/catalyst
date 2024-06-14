import childProcess from "node:child_process";
import path from "node:path";
// Global setup runs inside Node.js, not `workerd`
export default function () {
  // Build `api-service`'s dependencies

  let label = "Compiled authx_service";
  console.time(label);
  childProcess.execSync("pnpm build", {
    cwd: path.join("../authx_token_api"),
  });
  console.timeEnd(label);

  label = "Compiled data_channel_registrar";
  console.time(label);
  childProcess.execSync("pnpm build", {
    cwd: path.join("../data_channel_registrar"),
  });
  console.timeEnd(label);

  label = "Compiled authx_authzed_api";
  console.time(label);
  childProcess.execSync("pnpm build", {
    cwd: path.join("../authx_authzed_api"),
  });
  console.timeEnd(label);

  label = "Compiled issued-jwt-registry";
  console.time(label);
  childProcess.execSync("pnpm build", { cwd: path.join("../issued-jwt-registry") });
  console.timeEnd(label);

}