import { detectContainerRuntime, stopSpiceDBContainer } from '@catalyst/test-utils/spicedb';

// Global teardown runs inside Node.js after all tests complete
export default function () {
	console.info('Starting Global Teardown');

	try {
		const runtime = detectContainerRuntime();
		const stopped = stopSpiceDBContainer(runtime, 'spicedb-test');

		if (stopped) {
			console.info('✓ SpiceDB container stopped successfully');
		} else {
			console.info('ℹ No SpiceDB container to stop');
		}
	} catch (error) {
		// Don't throw - teardown errors shouldn't fail the test run
		console.warn('Warning: Failed to stop SpiceDB container:', error);
		console.warn('You may need to manually stop it: docker stop spicedb-test');
	}

	console.info('✓ Global teardown complete');
}
