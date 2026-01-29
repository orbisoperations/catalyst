/**
 * Build script for all worker dependencies needed for E2E tests
 * Shared between Vitest integration tests and Playwright E2E tests
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface WorkerBuildConfig {
    name: string;
    path: string;
    buildCommand?: string;
}

const WORKERS_TO_BUILD: WorkerBuildConfig[] = [
    {
        name: 'user-credentials-cache',
        path: '../../user-credentials-cache',
    },
    {
        name: 'authx_authzed_api',
        path: '../../authx_authzed_api',
    },
    {
        name: 'authx_token_api',
        path: '../../authx_token_api',
    },
    {
        name: 'issued-jwt-registry',
        path: '../../issued-jwt-registry',
    },
    {
        name: 'data_channel_registrar',
        path: '../../data_channel_registrar',
    },
    {
        name: 'data-channel-certifier',
        path: '../../data-channel-certifier',
    },
    {
        name: 'organization_matchmaking',
        path: '../../organization_matchmaking',
    },
];

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function buildWorker(worker: WorkerBuildConfig): boolean {
    const workerPath = path.resolve(__dirname, worker.path);

    if (!fs.existsSync(workerPath)) {
        log(`⚠️  Worker path not found: ${workerPath}`, 'yellow');
        return false;
    }

    const buildCommand = worker.buildCommand || 'pnpm build';

    try {
        log(`\n📦 Building ${worker.name}...`, 'blue');
        log(`   Path: ${workerPath}`, 'reset');
        log(`   Command: ${buildCommand}`, 'reset');

        execSync(buildCommand, {
            cwd: workerPath,
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' },
        });

        log(`✓ ${worker.name} built successfully`, 'green');
        return true;
    } catch (error) {
        log(`✗ Failed to build ${worker.name}`, 'red');
        console.error(error);
        return false;
    }
}

async function main() {
    log('\n🚀 Building workers for E2E tests\n', 'bright');

    const startTime = Date.now();
    const results = new Map<string, boolean>();

    // Build workers sequentially to avoid resource contention
    // Could parallelize if needed, but sequential is more stable
    for (const worker of WORKERS_TO_BUILD) {
        const success = buildWorker(worker);
        results.set(worker.name, success);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n' + '='.repeat(60), 'reset');
    log('Build Summary', 'bright');
    log('='.repeat(60), 'reset');

    const successful = Array.from(results.entries()).filter(([, success]) => success);
    const failed = Array.from(results.entries()).filter(([, success]) => !success);

    if (successful.length > 0) {
        log(`\n✓ Successfully built (${successful.length}):`, 'green');
        successful.forEach(([name]) => log(`  - ${name}`, 'green'));
    }

    if (failed.length > 0) {
        log(`\n✗ Failed to build (${failed.length}):`, 'red');
        failed.forEach(([name]) => log(`  - ${name}`, 'red'));
    }

    log(`\n⏱️  Total time: ${duration}s`, 'blue');
    log('='.repeat(60) + '\n', 'reset');

    if (failed.length > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    log('\n✗ Build script failed:', 'red');
    console.error(error);
    process.exit(1);
});
