import childProcess from 'node:child_process';
import path from 'node:path';

/**
 * Check if SpiceDB is already running
 */
async function isSpiceDBRunning(): Promise<boolean> {
	try {
		const response = await fetch('http://localhost:8449/healthz');
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Detects which container runtime is available
 */
function detectContainerRuntime(): 'docker' | 'podman' {
	try {
		childProcess.execSync('docker --version', { stdio: 'ignore' });
		return 'docker';
	} catch {
		try {
			childProcess.execSync('podman --version', { stdio: 'ignore' });
			return 'podman';
		} catch {
			throw new Error(
				'Neither Docker nor Podman found. Please install one of them:\n' +
					'  Docker: https://docs.docker.com/get-docker/\n' +
					'  Podman: https://podman.io/getting-started/installation',
			);
		}
	}
}

/**
 * Waits for SpiceDB to be healthy
 */
async function waitForSpiceDB(endpoint: string = 'http://localhost:8449', maxWaitMs: number = 30000): Promise<void> {
	const startTime = Date.now();
	let currentInterval = 500;

	while (Date.now() - startTime < maxWaitMs) {
		const isHealthy = await isSpiceDBRunning();

		if (isHealthy) {
			console.log(`✓ SpiceDB is ready at ${endpoint}`);
			return;
		}

		console.log(`Waiting for SpiceDB to be ready... (${Math.round((Date.now() - startTime) / 1000)}s)`);

		await new Promise((resolve) => setTimeout(resolve, currentInterval));
		currentInterval = Math.min(currentInterval * 1.5, 2000);
	}

	throw new Error(`SpiceDB did not become healthy within ${maxWaitMs}ms`);
}

// Global setup runs inside Node.js, not `workerd`
export default async function () {
	// Build `api-service`'s dependencies
	console.info('Starting Global Setup for organization_matchmaking');

	// list of dependencies to compile
	const dependencies = ['../authx_authzed_api', '../user-credentials-cache'];

	// compile dependencies
	for (const dependency of dependencies) {
		const label = `Compiled ${dependency}`;
		console.time(label);
		childProcess.execSync('pnpm build', {
			cwd: path.join(dependency),
		});
		console.timeEnd(label);
	}

	// Check if SpiceDB is already running
	const alreadyRunning = await isSpiceDBRunning();
	if (alreadyRunning) {
		console.info('✓ SpiceDB is already running and healthy - reusing existing container');
		console.info('✓ Global setup complete - SpiceDB is ready');
		return;
	}

	// Detect which container runtime is available
	const runtime = detectContainerRuntime();
	console.info(`Using container runtime: ${runtime}`);

	console.info('Starting SpiceDB container...');

	// Build the command for either docker or podman
	const containerCommand = [
		`${runtime} run`,
		'--rm',
		'-d',
		'--name spicedb-test',
		'-v ./authx_authzed_api/schema.zaml:/schema.zaml:ro',
		'-p 8449:8443',
		'authzed/spicedb:latest',
		'serve-testing',
		'--http-enabled',
		'--skip-release-check=true',
		'--log-level debug',
		'--load-configs ./schema.zaml',
	].join(' ');

	try {
		// First, try to stop any existing container with the same name
		try {
			childProcess.execSync(`${runtime} stop spicedb-test 2>/dev/null || true`, {
				stdio: 'ignore',
			});
		} catch {
			// Ignore errors - container might not exist
		}

		// Start the SpiceDB container synchronously
		childProcess.execSync(containerCommand, {
			cwd: path.join(__dirname, '..'),
			stdio: 'pipe',
		});

		console.info('SpiceDB container started, waiting for it to be ready...');

		// Wait for SpiceDB to be healthy
		await waitForSpiceDB('http://localhost:8449', 30000);

		console.info('✓ Global setup complete - SpiceDB is ready');
	} catch (error) {
		console.error('❌ Failed to start SpiceDB:', error);
		console.error(`\nTroubleshooting steps:`);
		console.error(`1. Check if ${runtime} is running: ${runtime} ps`);
		console.error(`2. Check container logs: ${runtime} logs spicedb-test`);
		console.error(`3. Verify port 8449 is not in use: lsof -i :8449`);
		throw error;
	}
}
