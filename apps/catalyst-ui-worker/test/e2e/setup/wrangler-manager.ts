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
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';

export interface WorkerConfig {
    name: string;
    path: string;
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
 */
export const WORKER_CONFIGS: WorkerConfig[] = [
    // Layer 1: No dependencies (foundational services)
    {
        name: 'user-credentials-cache',
        path: '../../user-credentials-cache',
        port: 4003,
        inspectorPort: 6003,
        dependencies: [],
    },
    {
        name: 'authx_authzed_api',
        path: '../../authx_authzed_api',
        port: 4001,
        inspectorPort: 6001,
        dependencies: [],
    },

    // Layer 2: Depend on user-credentials-cache
    {
        name: 'authx_token_api',
        path: '../../authx_token_api',
        port: 4002,
        inspectorPort: 6002,
        dependencies: ['user-credentials-cache'],
    },
    {
        name: 'issued-jwt-registry',
        path: '../../issued-jwt-registry',
        port: 4005,
        inspectorPort: 6005,
        dependencies: ['user-credentials-cache'],
    },

    // Layer 3: Depend on authzed and user-credentials-cache
    {
        name: 'data_channel_registrar',
        path: '../../data_channel_registrar',
        port: 4004,
        inspectorPort: 6004,
        dependencies: ['authx_authzed_api', 'user-credentials-cache'],
    },
    {
        name: 'organization_matchmaking',
        path: '../../organization_matchmaking',
        port: 4007,
        inspectorPort: 6007,
        dependencies: ['authx_authzed_api', 'user-credentials-cache'],
    },

    // Layer 4: Depends on registrar, token api, jwt registry
    {
        name: 'data-channel-certifier',
        path: '../../data-channel-certifier',
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
     * Build all workers before starting
     */
    async buildWorkers(): Promise<void> {
        console.log('\n📦 Building backend workers...\n');

        for (const config of WORKER_CONFIGS) {
            const workerPath = path.resolve(this.appsDir, config.name);

            console.log(`  Building ${config.name}...`);
            try {
                execSync('pnpm build', {
                    cwd: workerPath,
                    stdio: 'pipe',
                    env: { ...process.env, FORCE_COLOR: '0' },
                });
                console.log(`  ✓ ${config.name} built`);
            } catch (error) {
                console.error(`  ✗ Failed to build ${config.name}`);
                throw error;
            }
        }

        console.log('\n✓ All workers built\n');
    }

    /**
     * Start all workers in dependency order
     */
    async startAll(): Promise<void> {
        console.log('\n🚀 Starting backend workers...\n');

        // Group workers by layer (based on dependencies)
        const layers = this.getStartupLayers();

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            console.log(`\n  Layer ${i + 1}: ${layer.map((w) => w.name).join(', ')}`);

            // Start all workers in this layer in parallel
            await Promise.all(layer.map((config) => this.startWorker(config)));

            // Wait for all workers in this layer to be ready
            await Promise.all(layer.map((config) => this.waitForReady(config)));
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
                const depsReady = config.dependencies.every((dep) => started.has(dep));
                if (depsReady) {
                    layer.push(config);
                }
            }

            if (layer.length === 0) {
                throw new Error('Circular dependency detected in worker configs');
            }

            layers.push(layer);
            layer.forEach((config) => started.add(config.name));
        }

        return layers;
    }

    /**
     * Start a single worker
     */
    private async startWorker(config: WorkerConfig): Promise<void> {
        const workerPath = path.resolve(this.appsDir, config.name);

        console.log(`    Starting ${config.name} on port ${config.port}...`);

        const proc = spawn(
            'pnpm',
            ['wrangler', 'dev', '--port', String(config.port), '--inspector-port', String(config.inspectorPort)],
            {
                cwd: workerPath,
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
        proc.stderr?.on('data', (data) => {
            const msg = data.toString();
            // Filter out noisy warnings
            if (!msg.includes('ExperimentalWarning') && !msg.includes('Unexpected fields')) {
                console.error(`    [${config.name}] ${msg.trim()}`);
            }
        });

        // Check for startup errors
        proc.on('error', (err) => {
            console.error(`    ✗ ${config.name} failed to start:`, err.message);
        });

        proc.on('exit', (code) => {
            if (code !== null && code !== 0) {
                console.error(`    ✗ ${config.name} exited with code ${code}`);
            }
        });
    }

    /**
     * Wait for a worker to be ready (accepting connections)
     * Any HTTP response (including 404, 500) means the server is up
     */
    private async waitForReady(config: WorkerConfig, timeout = 30000): Promise<void> {
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
                    // Some other error - log it but keep trying
                    console.log(`    [${config.name}] Health check error: ${error}`);
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
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
        return new Promise((resolve) => {
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
