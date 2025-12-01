/**
 * Utility to check SpiceDB health and wait for it to be ready
 */
import { execSync } from 'node:child_process';

/**
 * Checks if SpiceDB is responding to HTTP requests
 * @param endpoint - The SpiceDB HTTP endpoint
 * @returns True if SpiceDB is healthy, false otherwise
 */
async function checkSpiceDBHealth(endpoint: string): Promise<boolean> {
    try {
        const response = await fetch(`${endpoint}/healthz`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Checks if SpiceDB is already running and healthy
 * @param endpoint - The SpiceDB HTTP endpoint (default: 'http://localhost:8449')
 * @returns Promise that resolves to true if SpiceDB is running and healthy
 */
export async function isSpiceDBRunning(endpoint: string = 'http://localhost:8449'): Promise<boolean> {
    return checkSpiceDBHealth(endpoint);
}

/**
 * Waits for SpiceDB to be healthy with exponential backoff
 * @param endpoint - The SpiceDB HTTP endpoint (e.g., 'http://localhost:8449')
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 30000)
 * @param intervalMs - Initial interval between checks in milliseconds (default: 500)
 * @returns Promise that resolves when SpiceDB is healthy, rejects on timeout
 */
export async function waitForSpiceDB(
    endpoint: string = 'http://localhost:8449',
    maxWaitMs: number = 30000,
    intervalMs: number = 500
): Promise<void> {
    const startTime = Date.now();
    let currentInterval = intervalMs;

    while (Date.now() - startTime < maxWaitMs) {
        const isHealthy = await checkSpiceDBHealth(endpoint);

        if (isHealthy) {
            console.log(`✓ SpiceDB is ready at ${endpoint}`);
            return;
        }

        console.log(`Waiting for SpiceDB to be ready... (${Math.round((Date.now() - startTime) / 1000)}s)`);

        // Wait before next check with exponential backoff
        await new Promise(resolve => setTimeout(resolve, currentInterval));
        currentInterval = Math.min(currentInterval * 1.5, 2000); // Max 2s between checks
    }

    throw new Error(
        `SpiceDB did not become healthy within ${maxWaitMs}ms. ` +
            `Check that the SpiceDB container is running: docker ps | grep spicedb`
    );
}

/**
 * Detects which container runtime is available
 * @returns 'docker' or 'podman' or throws if neither is found
 */
export function detectContainerRuntime(): 'docker' | 'podman' {
    try {
        execSync('docker --version', { stdio: 'ignore' });
        return 'docker';
    } catch {
        try {
            execSync('podman --version', { stdio: 'ignore' });
            return 'podman';
        } catch {
            throw new Error(
                'Neither Docker nor Podman found. Please install one of them:\n' +
                    '  Docker: https://docs.docker.com/get-docker/\n' +
                    '  Podman: https://podman.io/getting-started/installation'
            );
        }
    }
}

/**
 * Stops a SpiceDB container with verification
 * @param runtime - Container runtime ('docker' or 'podman')
 * @param containerName - Name of the container to stop (default: 'spicedb-test')
 * @returns True if container was stopped, false if not found or not SpiceDB
 */
export function stopSpiceDBContainer(runtime: 'docker' | 'podman', containerName: string = 'spicedb-test'): boolean {
    try {
        // Check if container exists and verify it's actually a SpiceDB image
        const containerInfo = execSync(`${runtime} inspect ${containerName} --format '{{.Config.Image}}'`, {
            encoding: 'utf-8',
            stdio: 'pipe',
        }).trim();

        if (containerInfo.includes('spicedb') || containerInfo.includes('authzed')) {
            console.log(`Stopping existing SpiceDB container: ${containerName}`);
            execSync(`${runtime} stop ${containerName}`, { stdio: 'ignore' });
            return true;
        } else {
            console.warn(`Container ${containerName} exists but is not SpiceDB (image: ${containerInfo})`);
            return false;
        }
    } catch {
        // Container doesn't exist or can't be inspected - that's fine
        return false;
    }
}
