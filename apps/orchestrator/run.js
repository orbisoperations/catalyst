#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { Miniflare, Response } from "miniflare";
import {fileURLToPath} from "node:url";

async function main() {
    console.log("Starting main function");
    const build = await buildWorkers();
    console.log("Workers built:", build);
    await runMiniflare(build);
    console.log("Miniflare run completed");
}

async function buildWorkers() {
    console.log("Building workers");
    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    // Replace with your directory path
    const dirPath = path.resolve( __dirname, '../');

    console.log("Directory path:", dirPath);

    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        console.log("Files:", files);

        const built = [];

        for (const file of files) {
            if (file.isDirectory()) {
                const buildDir = `${dirPath}/${file.name}`;

                console.log("Processing directory:", buildDir);

                if (buildDir.includes('ui') || buildDir.includes('cli') || buildDir.includes('orchestrator')) {
                    console.log("Skipping build for directory:", buildDir);
                    continue;
                } else {
                    console.log("Adding directory to build queue:", buildDir);
                    built.push(buildDir);
                }

                await new Promise((resolve, reject) => {
                    exec(`(cd ${buildDir} && pnpm wrangler build)`, (err, stdout, stderr) => {
                        if (err) {
                            console.error("Error executing command:", err);
                            reject(err);
                            return;
                        }

                        if (stdout) {
                            console.log("Command output:", stdout);
                        }
                        if (stderr) {
                            console.error("Command errors:", stderr);
                        }
                        resolve();
                    });
                });
            }
        }

        console.log("Built workers:", built);
        return built;
    } catch (err) {
        console.error("Error reading directory:", err);
        return [];
    }
}

// builtWorkers is an array of string like Paths to the compiled workers
async function runMiniflare(builtWorkers) {
    console.log("Running Miniflare");
    const message = "The count is ";
    const workers = [];

    let count = 0;
    // Iterate over the buildQueue to create worker configurations dynamically
    for (const dir of builtWorkers) {
        const scriptPath = path.join(dir, "dist/index.js");
        console.log("Script path:", );
        // const script = await fs.readFile(scriptPath, "utf8");

        // Construct worker configuration
        // const workerConfig = {
        //     name: "worker_" + path.basename(dir), // Use directory name as part of worker name
        //     modules: true,
        //     script,
        // };
        const port = 8787 + count;
        const mf = new Miniflare({
            scriptPath,
            host: "0.0.0.0",
            port: port,
            modules: true,
            compatibilityFlags: ['nodejs_compat']
        });
        console.log("Miniflare configuration:", mf);

        count++;


        console.log("Worker configured:", {scriptPath: scriptPath, port: port});
    }
}

main();