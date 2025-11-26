/**
 * Playwright Global Setup
 *
 * Runs once before all Playwright tests to:
 * 0. Kill any stale processes on required ports
 * 1. Start SpiceDB container (required by authx_authzed_api)
 * 2. Build all backend workers
 * 3. Start each backend worker via wrangler dev
 * 4. Setup SpiceDB roles for test users
 *
 * This allows Playwright tests to interact with real backend services
 * using native wrangler service bindings for true end-to-end testing.
 *
 * Architecture:
 * - SpiceDB runs in a container for authorization checks
 * - Backend workers run via wrangler dev (service bindings work natively)
 * - UI worker runs via Playwright's webServer (opennextjs-cloudflare preview)
 * - All workers communicate via wrangler's local service registry
 */

import { execSync } from 'child_process';
import path from 'path';
import { getWranglerManager, type WranglerManager } from './test/e2e/setup/wrangler-manager';
import { TEST_USERS } from './test/auth.constants';
import {
    waitForSpiceDB,
    detectContainerRuntime,
    isSpiceDBRunning,
    stopSpiceDBContainer,
} from '@catalyst/test-utils/spicedb';

declare global {
    // eslint-disable-next-line no-var
    var __WRANGLER_MANAGER__: WranglerManager | undefined;
    // eslint-disable-next-line no-var
    var __SPICEDB_CONTAINER_RUNTIME__: 'docker' | 'podman' | undefined;
}

/**
 * Start SpiceDB container for authorization checks
 *
 * SpiceDB is required by authx_authzed_api for permission checks.
 * This function starts SpiceDB if it's not already running.
 */
async function startSpiceDB(): Promise<void> {
    console.log('\nStep 1: Starting SpiceDB container...');

    // Check if SpiceDB is already running
    const alreadyRunning = await isSpiceDBRunning();
    if (alreadyRunning) {
        console.log('    ✓ SpiceDB is already running - reusing existing container');
        return;
    }

    // Detect which container runtime is available
    const runtime = detectContainerRuntime();
    global.__SPICEDB_CONTAINER_RUNTIME__ = runtime;
    console.log(`    Using container runtime: ${runtime}`);

    // Path to schema file (relative to apps directory)
    const schemaPath = path.resolve(__dirname, '../authx_authzed_api/schema.zaml');

    // Build the command for either docker or podman
    const containerCommand = [
        `${runtime} run`,
        '--rm',
        '-d', // Run in detached mode
        '--name spicedb-e2e-test', // Name the container so we can stop it later
        `-v ${schemaPath}:/schema.zaml:ro`,
        '-p 8449:8443',
        'authzed/spicedb:latest',
        'serve-testing',
        '--http-enabled',
        '--skip-release-check=true',
        '--log-level warn',
        '--load-configs /schema.zaml',
    ].join(' ');

    try {
        // Stop any existing SpiceDB container
        stopSpiceDBContainer(runtime, 'spicedb-e2e-test');

        // Start the SpiceDB container
        execSync(containerCommand, {
            cwd: __dirname,
            stdio: 'pipe',
        });

        console.log('    SpiceDB container started, waiting for it to be ready...');

        // Wait for SpiceDB to be healthy
        await waitForSpiceDB('http://localhost:8449', 30000);

        console.log('    ✓ SpiceDB is ready');
    } catch (error) {
        console.error('    ✗ Failed to start SpiceDB:', error);
        console.error(`\n    Troubleshooting steps:`);
        console.error(`    1. Check if ${runtime} is running: ${runtime} ps`);
        console.error(`    2. Check container logs: ${runtime} logs spicedb-e2e-test`);
        console.error(`    3. Verify port 8449 is not in use: lsof -i :8449`);
        throw error;
    }
}

/**
 * Setup SpiceDB roles for test users
 *
 * The E2E test flow works as follows:
 * 1. mock-user-credentials-cache worker (port 4003) returns pre-configured test users
 * 2. UI's /api/v1/user/sync calls user_cache.getUser, then authzed.addXxxToOrg
 *
 * To establish SpiceDB roles during setup:
 * 1. Call the UI's /api/v1/user/sync endpoint with a test token
 * 2. mock-user-credentials-cache returns the test user for that token
 * 3. This triggers the real sync flow -> SpiceDB roles get established
 *
 * Note: The auth fixtures mock the sync endpoint, so this setup is the ONLY chance
 * to establish SpiceDB roles before tests run.
 */
async function setupSpiceDBRoles(): Promise<void> {
    console.log('\nStep 4: Setting up SpiceDB roles for test users...');

    const UI_URL = 'http://localhost:4000';

    // Helper to trigger sync for a test user
    async function syncTestUser(userType: string, user: { email: string; org: string }): Promise<void> {
        try {
            // Call the sync endpoint with the test token
            // mock-user-credentials-cache returns the pre-configured user for this token
            const syncResp = await fetch(`${UI_URL}/api/v1/user/sync`, {
                method: 'GET',
                headers: {
                    Cookie: `CF_Authorization=test-token-${userType}`,
                },
            });

            if (syncResp.ok) {
                console.log(`    ✓ Synced ${userType}: ${user.email} in ${user.org}`);
            } else {
                const errorText = await syncResp.text();
                console.warn(`    ⚠ Failed to sync ${userType}: ${syncResp.status} - ${errorText}`);
            }
        } catch (error) {
            console.warn(`    ⚠ Could not sync ${userType}: ${error}`);
        }
    }

    // Sync data-custodian user
    await syncTestUser('data-custodian', TEST_USERS['data-custodian']);

    // Sync org-admin user
    await syncTestUser('org-admin', TEST_USERS['org-admin']);

    console.log('\n✓ SpiceDB roles setup complete\n');
}

async function globalSetup() {
    console.log('\nPlaywright Global Setup - Starting backend workers\n');
    console.log('='.repeat(60));

    const manager = getWranglerManager();

    try {
        // Step 0: Kill any stale processes on our ports
        await manager.killPortProcesses();

        // Step 1: Start SpiceDB container (required by authx_authzed_api)
        await startSpiceDB();

        // Step 2: Build all backend workers
        console.log('\nStep 2: Building backend workers...');
        await manager.buildWorkers();

        // Step 3: Start all backend workers via wrangler dev
        console.log('\nStep 3: Starting backend workers via wrangler dev...');
        await manager.startAll();

        // Store manager globally for access in teardown
        global.__WRANGLER_MANAGER__ = manager;

        // Step 4: Setup SpiceDB roles for test users
        await setupSpiceDBRoles();

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
        await new Promise(resolve => setTimeout(resolve, 1000));
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
