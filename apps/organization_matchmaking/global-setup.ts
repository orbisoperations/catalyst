import childProcess from "node:child_process";
import path from "node:path";

// Global setup runs inside Node.js, not `workerd`
export default function () {
  // Build `api-service`'s dependencies

  // list of dependencies to compile
  const dependencies = [
    "../authx_authzed_api",
    "../user_credentials_cache",
  ];

  // compile dependencies
  for (const dependency of dependencies) {
    let label = `Compiled ${dependency}`;
    console.time(label);
    childProcess.execSync("pnpm build", {
      cwd: path.join(dependency),
    });
    console.timeEnd(label);
  }
}