#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { Miniflare } from "miniflare";
import { fileURLToPath } from "node:url";
import { readWranglerConfig } from "./utils.js";
import { Logger } from "tslog";

const log = new Logger({ minLevel: "info" });

async function main() {
    log.info("Starting...");
    const build = await buildWorkers();
    await runMiniflare(build);
    log.info("Miniflare run completed");
}

async function buildWorkers() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dirPath = path.resolve(__dirname, '../');

    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const built = [];

        for (const file of files) {
            if (file.isDirectory()) {
                const buildDir = `${dirPath}/${file.name}`;

                if (!(buildDir.includes('ui') || buildDir.includes('cli') || buildDir.includes('orchestrator'))) {
                    built.push(buildDir);
                    await new Promise((resolve, reject) => {
                        exec(`(cd ${buildDir} && pnpm wrangler build)`, (err, stdout, stderr) => {
                            if (err) {
                                log.error(`Error building worker in ${buildDir}:`, err);
                                reject(err);
                                return;
                            }
                            resolve();
                        });
                    });
                }
            }
        }

        log.info(`Built ${built.length} workers`);
        return built;
    } catch (err) {
        log.error("Error reading directory:", err);
        return [];
    }
}

async function runMiniflare(builtWorkers) {
    let miniflareInstances = [];
    for (const dir of builtWorkers) {
        const scriptPath = path.join(dir, "dist/index.js");
        const workspaceRoot = path.resolve(scriptPath, "../../");
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { wranglerConfig } = readWranglerConfig(path.join(workspaceRoot, "wrangler.toml"));



        const remappedDurableObjects = [];

        if(wranglerConfig.durable_objects?.bindings?.length) {
            remappedDurableObjects.concat(
                wranglerConfig.durable_objects.bindings.map((doBinding) => ({ class_name: doBinding.class_name, name: doBinding.name }))
            )
        }
        const sec = {};
        wranglerConfig.services?.map((service) => {
            console.log({service});
            sec[service.binding] = {
                name: service.service,
                entrypoint: service.entrypoint
            };
        })

        const miniflareOptions = {
            modules: true,
            verbose: false,
            scriptPath: scriptPath,
            modulesRoot: workspaceRoot,
            port: wranglerConfig.dev.port,
            serviceBindings: sec,
            kvNamespaces: wranglerConfig.kv_namespaces,
            durableObjects: remappedDurableObjects.length > 0 ? {
                bindings: remappedDurableObjects,
            } : undefined,
            migrations: wranglerConfig.migrations,
            compatibilityDate: wranglerConfig.compatibility_date,
            compatibilityFlags: wranglerConfig.compatibility_flags,
        };

        console.log({
            miniflareOptions: JSON.stringify(miniflareOptions)
        });

        miniflareInstances.push({
            mfInstance: new Miniflare({...miniflareOptions,
                workers: [
                    {
                        name: wranglerConfig.name,
                        modules: true,
                        modulesRoot: workspaceRoot,
                        scriptPath: scriptPath,
                        compatibilityDate: wranglerConfig.compatibility_date,
                        compatibilityFlags: wranglerConfig.compatibility_flags,
                        bindings: wranglerConfig.bindings,
                        entrypoint: wranglerConfig.entrypoint,
                        unsafeEphemeralDurableObjects: true,
                        durableObjects: remappedDurableObjects.length > 0 ? {
                            bindings: remappedDurableObjects,
                        } : undefined,
                    }
                ]
            }),
            wranglerConfig: wranglerConfig,
            workspaceRoot: workspaceRoot
        });
    }

    log.info(`Running ${miniflareInstances.length} Miniflare instances`);

    // Print useful statistics about each service
    log.info("Service Statistics:");
    log.info("-------------------");
    for (const { mfInstance, wranglerConfig } of miniflareInstances) {
        const { name, dev: { port } } = wranglerConfig;

        log.info(`Service: ${name}`);
        log.info(`  Port: ${port}`);

        // Check if the service has durable objects
        const durableObjects = wranglerConfig.durable_objects || [];
        log.info(`  Durable Objects: ${durableObjects.bindings?.at(0)?.name}`);

        // Check if the service has KV namespaces
        const kvNamespaces = wranglerConfig.kv_namespaces || [];
        log.info(`  KV Namespaces: ${kvNamespaces.length}`);

        // Check if the service has environment variables
        const envVariables = wranglerConfig.env || {};
        log.info(`  Environment Variables: ${Object.keys(envVariables).length}`);


        log.info("-------------------");
    }

    process.on('SIGINT', function () {
        log.info('Received SIGINT, exiting...');
        process.exit();
    });

    log.info('Running...Press CTRL+C to exit.');

    process.on('exit', () => {
        log.info('Disposing Miniflare instances...');
        miniflareInstances.forEach(mfInstance => {
            if (typeof mfInstance.dispose === "function") {
                mfInstance.dispose();
            }
        });
        log.info('Miniflare instances disposed successfully');
    });

    while (true) {
        await new Promise(r => setTimeout(r, 1000));
    }
}

main();