/**
 * Playwright Global Setup
 *
 * Runs once before all Playwright tests to:
 * 1. Build all backend workers
 * 2. Start each backend worker via wrangler dev
 * 3. Wait for all workers to be ready
 *
 * This allows Playwright tests to interact with real backend services
 * using native wrangler service bindings for true end-to-end testing.
 *
 * Architecture:
 * - Backend workers run via wrangler dev (service bindings work natively)
 * - UI worker runs via Playwright's webServer (opennextjs-cloudflare preview)
 * - All workers communicate via wrangler's local service registry
 */

import { getWranglerManager, type WranglerManager } from './test/e2e/setup/wrangler-manager';

declare global {
    // eslint-disable-next-line no-var
    var __WRANGLER_MANAGER__: WranglerManager | undefined;
}

async function globalSetup() {
    console.log('\nPlaywright Global Setup - Starting backend workers\n');
    console.log('='.repeat(60));

    const manager = getWranglerManager();

    try {
        // Step 1: Build all backend workers
        console.log('\nStep 1: Building backend workers...');
        await manager.buildWorkers();

        // Step 2: Start all backend workers via wrangler dev
        console.log('\nStep 2: Starting backend workers via wrangler dev...');
        await manager.startAll();

        // Store manager globally for access in teardown
        global.__WRANGLER_MANAGER__ = manager;

        // Log status
        console.log('\nWorker Status:');
        const status = manager.getStatus();
        for (const worker of status) {
            console.log(`    ${worker.ready ? '✓' : '⏳'} ${worker.name}: port ${worker.port} (pid ${worker.pid})`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('Global setup complete - Backend workers ready');
        console.log('='.repeat(60) + '\n');

        // Give everything a moment to settle
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('\n❌ Global setup failed:');
        console.error(error);

        // Cleanup on failure
        try {
            await manager.stopAll();
        } catch {
            // Ignore cleanup errors
        }

        throw error;
    }
}

export default globalSetup;
