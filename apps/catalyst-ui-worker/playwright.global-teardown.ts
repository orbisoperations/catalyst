/**
 * Playwright Global Teardown
 *
 * Runs once after all Playwright tests to:
 * 1. Stop all wrangler dev processes
 * 2. Cleanup any resources
 *
 * This ensures clean shutdown of all backend workers.
 */

import { type WranglerManager, clearWranglerManager } from './test/e2e/setup/wrangler-manager';

declare global {
    // eslint-disable-next-line no-var
    var __WRANGLER_MANAGER__: WranglerManager | undefined;
}

async function globalTeardown() {
    console.log('\n🧹 Playwright Global Teardown - Shutting down backend workers\n');
    console.log('='.repeat(60));

    try {
        const manager = global.__WRANGLER_MANAGER__;

        if (!manager) {
            console.log('⚠️  No WranglerManager found (may have already been cleaned up)');
            return;
        }

        await manager.stopAll();

        global.__WRANGLER_MANAGER__ = undefined;
        clearWranglerManager();

        console.log('='.repeat(60));
        console.log('Global teardown complete\n');
    } catch (error) {
        console.error('\n❌ Global teardown failed:');
        console.error(error);
        // Don't throw - allow tests to complete even if teardown has issues
    }
}

export default globalTeardown;
