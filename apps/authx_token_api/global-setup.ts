import childProcess from 'node:child_process';
import path from 'node:path';
import { waitForSpiceDB, detectContainerRuntime, isSpiceDBRunning, stopSpiceDBContainer } from '@catalyst/test-utils/spicedb';

// Global setup runs inside Node.js, not `workerd`
export default async function () {
	// Build `api-service`'s dependencies
	console.info('Starting Global Setup for authx_token_api');

	// list of dependencies to compile
	const dependencies = [
		'../authx_token_api',
		'../authx_authzed_api',
		'../user-credentials-cache',
		'../issued-jwt-registry',
		'../data_channel_registrar',
	];

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
		'-d', // Run in detached mode
		'--name spicedb-test', // Name the container so we can stop it later
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
		// Stop any existing SpiceDB container with verification
		stopSpiceDBContainer(runtime, 'spicedb-test');

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
