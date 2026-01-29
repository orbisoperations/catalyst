/**
 * Playwright Global Teardown
 *
 * Runs once after all Playwright tests to:
 * 1. Stop all wrangler dev processes
 * 2. Remove SpiceDB container and volume (clean slate for next run)
 * 3. Cleanup any resources
 *
 * This ensures clean shutdown of all backend workers and removes test data.
 */

import { type WranglerManager, clearWranglerManager } from './test/e2e/setup/wrangler-manager';
import { removeSpiceDBContainerAndVolume } from '@catalyst/test-utils/spicedb';

declare global {
    // eslint-disable-next-line no-var
    var __WRANGLER_MANAGER__: WranglerManager | undefined;
    // eslint-disable-next-line no-var
    var __SPICEDB_CONTAINER_RUNTIME__: 'docker' | 'podman' | undefined;
}

async function globalTeardown() {
    console.log('\n🧹 Playwright Global Teardown - Shutting down backend workers\n');
    console.log('='.repeat(60));

    try {
        const manager = global.__WRANGLER_MANAGER__;

        if (!manager) {
            console.log('⚠️  No WranglerManager found (may have already been cleaned up)');
        } else {
            await manager.stopAll();
            global.__WRANGLER_MANAGER__ = undefined;
            clearWranglerManager();
        }

        // Remove SpiceDB container and volume for clean slate
        const runtime = global.__SPICEDB_CONTAINER_RUNTIME__;
        if (runtime) {
            console.log('\n🗑️  Removing SpiceDB container and volume...');
            const { containerRemoved, volumeRemoved } = removeSpiceDBContainerAndVolume(
                runtime,
                'spicedb-e2e-test',
                'spicedb-e2e-test-data'
            );
            if (!containerRemoved && !volumeRemoved) {
                console.log('    ⚠️  SpiceDB container/volume not found (may have already been removed)');
            }
            global.__SPICEDB_CONTAINER_RUNTIME__ = undefined;
        }

        console.log('='.repeat(60));
        console.log('Global teardown complete\n');
    } catch (error) {
        console.error('\n❌ Global teardown failed:');
        console.error(error);
        // Don't throw - allow tests to complete even if teardown has issues
    }
}

export default globalTeardown;
