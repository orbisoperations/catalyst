import childProcess from 'node:child_process';
import path from 'node:path';

// Global setup runs inside Node.js, not `workerd`
export default function () {
	// Build `api-service`'s dependencies
	console.info('Starting Global Setup');

	console.info('Starting authzed podman container');

	// current when executing this file is apps/
	// see execSync command below
	const podmanCommand = [
		'podman run --rm',
		'-v ./authx_authzed_api/schema.zaml:/schema.zaml:ro',
		'-p 8449:8443',
		// '--detach',
		'authzed/spicedb:latest',
		'serve-testing',
		'--http-enabled',
		'--skip-release-check=true',
		'--log-level debug',
		'--load-configs ./schema.zaml',
	].join(' ');

	// turn on podman container for authzed
	childProcess.exec(
		podmanCommand,
		{
			cwd: path.join(__dirname, '..'),
		},
		(err) => {
			if (err && !err.message.includes('the container name "authzed-container" is already in use')) {
				console.error('Error starting authzed podman container: Check status with `podman ps`', err);
			} else {
				console.info('Authzed podman container started successfully');
			}
		},
	);

	console.info('Global setup complete');
}
