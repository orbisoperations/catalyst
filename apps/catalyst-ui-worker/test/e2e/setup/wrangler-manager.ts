/**
 * Wrangler Process Manager for E2E Tests
 *
 * Manages multiple wrangler dev processes for true end-to-end testing
 * with real service bindings between workers.
 *
 * Architecture:
 * - Each backend worker runs via `wrangler dev` on its designated port
 * - Workers are started in dependency order
 * - Service bindings work natively because all workers use wrangler's local registry
 * - Processes are tracked for proper cleanup in teardown
 * - Uses mock-user-credentials-cache instead of real user-credentials-cache
 *   to eliminate the need for mock-identity-server
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface WorkerConfig {
    name: string;
    /** Directory name in apps/ folder (defaults to name if not specified) */
    directory?: string;
    port: number;
    inspectorPort: number;
    /** Workers this one depends on (must be started first) */
    dependencies: string[];
    /** Health check endpoint (defaults to /) */
    healthEndpoint?: string;
}

/**
 * Worker configurations with dependency graph
 * Order matters - workers are started in layers based on dependencies
 *
 * NOTE: Uses mock-user-credentials-cache app instead of real user-credentials-cache
 * to provide pre-configured test users without needing Cloudflare Access validation.
 * The mock worker has the same wrangler name 'user-credentials-cache' so service bindings work.
 */
export const WORKER_CONFIGS: WorkerConfig[] = [
    // Layer 1: No dependencies (foundational services)
    {
        // Uses mock version from mock-user-credentials-cache directory
        // Worker registers as 'user-credentials-cache' so service bindings work
        name: 'user-credentials-cache',
        directory: 'mock-user-credentials-cache',
        port: 4003,
        inspectorPort: 6003,
        dependencies: [],
    },
    {
        name: 'authx_authzed_api',
        port: 4001,
        inspectorPort: 6001,
        dependencies: [],
    },

    // Layer 2: Depend on user-credentials-cache
    {
        name: 'authx_token_api',
        port: 4002,
        inspectorPort: 6002,
        dependencies: ['user-credentials-cache'],
    },
    {
        name: 'issued-jwt-registry',
        port: 4005,
        inspectorPort: 6005,
        dependencies: ['user-credentials-cache'],
    },

    // Layer 3: Depend on authzed and user-credentials-cache
    {
        name: 'data_channel_registrar',
        port: 4004,
        inspectorPort: 6004,
        dependencies: ['authx_authzed_api', 'user-credentials-cache'],
    },
    {
        name: 'organization_matchmaking',
        port: 4007,
        inspectorPort: 6007,
        dependencies: ['authx_authzed_api', 'user-credentials-cache'],
    },

    // Layer 4: Depends on registrar, token api, jwt registry
    {
        name: 'data-channel-certifier',
        port: 4008,
        inspectorPort: 6008,
        dependencies: ['data_channel_registrar', 'authx_token_api', 'issued-jwt-registry'],
    },
];

interface RunningWorker {
    config: WorkerConfig;
    process: ChildProcess;
    ready: boolean;
}

/**
 * Manages wrangler dev processes for E2E testing
 */
export class WranglerManager {
    private workers: Map<string, RunningWorker> = new Map();
    private appsDir: string;

    constructor() {
        // Resolve from test/e2e/setup to apps directory
        this.appsDir = path.resolve(__dirname, '../../../..');
    }

    /**
     * Kill any processes using the ports we need
     * This ensures clean startup even if previous test runs didn't clean up properly
     */
    async killPortProcesses(): Promise<void> {
        console.log('\n🔪 Killing processes on required ports...\n');

        const allPorts = WORKER_CONFIGS.flatMap(c => [c.port, c.inspectorPort]);
        let killedCount = 0;

        for (const port of allPorts) {
            try {
                // Use lsof to find process using this port
                const result = execSync(`lsof -ti:${port}`, {
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                });

                const pids = result
                    .trim()
                    .split('\n')
                    .filter(p => p);
                for (const pid of pids) {
                    try {
                        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
                        console.log(`    ✓ Killed process ${pid} on port ${port}`);
                        killedCount++;
                    } catch {
                        // Process may have already exited
                    }
                }
            } catch {
                // No process on this port - that's fine
            }
        }

        if (killedCount === 0) {
            console.log('    No stale processes found\n');
        } else {
            console.log(`\n✓ Killed ${killedCount} stale process(es)\n`);
            // Give the OS a moment to release the ports
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Build all workers before starting
     * Skips workers without a build script (wrangler handles TS compilation)
     */
    async buildWorkers(): Promise<void> {
        console.log('\n📦 Building backend workers...\n');

        for (const config of WORKER_CONFIGS) {
            // Use config.directory if provided, otherwise use config.name
            const workerDir = path.resolve(this.appsDir, config.directory || config.name);
            const pkgJsonPath = path.join(workerDir, 'package.json');

            // Check if package has a build script
            if (fs.existsSync(pkgJsonPath)) {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                if (!pkgJson.scripts?.build) {
                    console.log(`  ⏭ ${config.name} (no build script)`);
                    continue;
                }
            } else {
                console.log(`  ⏭ ${config.name} (no package.json)`);
                continue;
            }

            console.log(`  Building ${config.name}...`);
            try {
                execSync('pnpm build', {
                    cwd: workerDir,
                    stdio: 'pipe',
                    env: { ...process.env, FORCE_COLOR: '0' },
                });
                console.log(`  ✓ ${config.name} built`);
            } catch (error) {
                console.error(`  ✗ Failed to build ${config.name}`);
                throw error;
            }
        }

        console.log('\n✓ All workers ready\n');
    }

    /**
     * Start all workers in dependency order
     */
    async startAll(): Promise<void> {
        console.log('\n🚀 Starting backend workers...\n');
        console.log('    (Using mock user-credentials-cache from mock-user-credentials-cache app)\n');

        // Group workers by layer (based on dependencies)
        const layers = this.getStartupLayers();

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            console.log(`\n  Layer ${i + 1}: ${layer.map(w => w.name).join(', ')}`);

            // Start all workers in this layer in parallel
            await Promise.all(layer.map(config => this.startWorker(config)));

            // Wait for all workers in this layer to be ready
            await Promise.all(layer.map(config => this.waitForReady(config)));
        }

        console.log('\n✓ All backend workers started and ready\n');
    }

    /**
     * Group workers into startup layers based on dependencies
     */
    private getStartupLayers(): WorkerConfig[][] {
        const layers: WorkerConfig[][] = [];
        const started = new Set<string>();

        while (started.size < WORKER_CONFIGS.length) {
            const layer: WorkerConfig[] = [];

            for (const config of WORKER_CONFIGS) {
                if (started.has(config.name)) continue;

                // Check if all dependencies are started
                const depsReady = config.dependencies.every(dep => started.has(dep));
                if (depsReady) {
                    layer.push(config);
                }
            }

            if (layer.length === 0) {
                throw new Error('Circular dependency detected in worker configs');
            }

            layers.push(layer);
            layer.forEach(config => started.add(config.name));
        }

        return layers;
    }

    /**
     * Start a single worker
     */
    private async startWorker(config: WorkerConfig): Promise<void> {
        // Use config.directory if provided, otherwise use config.name
        const workerDir = path.resolve(this.appsDir, config.directory || config.name);

        console.log(`    Starting ${config.name} on port ${config.port}...`);

        const proc = spawn(
            'pnpm',
            ['wrangler', 'dev', '--port', String(config.port), '--inspector-port', String(config.inspectorPort)],
            {
                cwd: workerDir,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    FORCE_COLOR: '0',
                },
                detached: false,
            }
        );

        this.workers.set(config.name, {
            config,
            process: proc,
            ready: false,
        });

        // Log errors
        proc.stderr?.on('data', data => {
            const msg = data.toString();
            // Filter out noisy warnings
            if (!msg.includes('ExperimentalWarning') && !msg.includes('Unexpected fields')) {
                console.error(`    [${config.name}] ${msg.trim()}`);
            }
        });

        // Check for startup errors
        proc.on('error', err => {
            console.error(`    ✗ ${config.name} failed to start:`, err.message);
        });

        proc.on('exit', code => {
            if (code !== null && code !== 0) {
                console.error(`    ✗ ${config.name} exited with code ${code}`);
            }
        });
    }

    /**
     * Wait for a worker to be ready (accepting connections)
     * Any HTTP response (including 404, 500) means the server is up
     */
    private async waitForReady(config: WorkerConfig, timeout = 60000): Promise<void> {
        const startTime = Date.now();
        const endpoint = config.healthEndpoint || '/';
        const url = `http://localhost:${config.port}${endpoint}`;

        while (Date.now() - startTime < timeout) {
            try {
                // Just check if the server is responding - any response counts
                const response = await fetch(url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000),
                });
                // Any response (even 404/500) means the server is up and accepting connections
                const worker = this.workers.get(config.name);
                if (worker) worker.ready = true;
                console.log(`    ✓ ${config.name} ready (status: ${response.status})`);
                return;
            } catch (error) {
                // Connection refused or timeout - not ready yet
                const isConnRefused =
                    error instanceof Error &&
                    (error.message.includes('ECONNREFUSED') ||
                        error.message.includes('fetch failed') ||
                        error.cause?.toString().includes('ECONNREFUSED'));

                if (!isConnRefused) {
                    // Some other error - log it but keep trying (but less frequently to reduce noise)
                    const elapsed = Math.round((Date.now() - startTime) / 1000);
                    if (elapsed % 5 === 0) {
                        console.log(`    [${config.name}] Waiting... (${elapsed}s)`);
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error(`${config.name} failed to become ready within ${timeout}ms`);
    }

    /**
     * Stop all workers
     */
    async stopAll(): Promise<void> {
        console.log('\n🧹 Stopping backend workers...\n');

        const stopPromises: Promise<void>[] = [];

        for (const [name, worker] of this.workers) {
            stopPromises.push(this.stopWorker(name, worker));
        }

        await Promise.all(stopPromises);
        this.workers.clear();

        console.log('\n✓ All workers stopped\n');
    }

    /**
     * Stop a single worker
     */
    private async stopWorker(name: string, worker: RunningWorker): Promise<void> {
        return new Promise(resolve => {
            const proc = worker.process;

            if (!proc || proc.killed) {
                console.log(`    ✓ ${name} already stopped`);
                resolve();
                return;
            }

            // Set up timeout for force kill
            const forceKillTimeout = setTimeout(() => {
                console.log(`    ⚠ Force killing ${name}`);
                proc.kill('SIGKILL');
            }, 5000);

            proc.on('exit', () => {
                clearTimeout(forceKillTimeout);
                console.log(`    ✓ ${name} stopped`);
                resolve();
            });

            // Try graceful shutdown first
            proc.kill('SIGTERM');
        });
    }

    /**
     * Get running worker info (for debugging)
     */
    getStatus(): { name: string; port: number; ready: boolean; pid: number | undefined }[] {
        return Array.from(this.workers.entries()).map(([name, worker]) => ({
            name,
            port: worker.config.port,
            ready: worker.ready,
            pid: worker.process.pid,
        }));
    }
}

// Singleton instance for global access
let managerInstance: WranglerManager | undefined;

export function getWranglerManager(): WranglerManager {
    if (!managerInstance) {
        managerInstance = new WranglerManager();
    }
    return managerInstance;
}

export function clearWranglerManager(): void {
    managerInstance = undefined;
}
