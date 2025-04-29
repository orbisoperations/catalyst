import childProcess from 'node:child_process';
import path from 'node:path';
import { Logger } from 'tslog';

const logger = new Logger();

// Global setup runs inside Node.js, not `workerd`
export default function () {
  // Build `api-service`'s dependencies

  // list of dependencies to compile
  const dependencies = ['../authx_authzed_api', '../authx_token_api', '../user-credentials-cache'];

  // compile dependencies
  for (const dependency of dependencies) {
    let label = `Compiled ${dependency}`;
    console.time(label);
    childProcess.execSync('pnpm build', {
      cwd: path.join(dependency),
    });
    console.timeEnd(label);
  }

  logger.info('Starting authzed podman container');

  // current when executing this file is apps/
  // see execSync command below
  const podmanCommand = [
    'podman run --rm',
    '-v ./authx_authzed_api/schema.zaml:/schema.zaml:ro',
    '-p 8443:8443',
    '-d',
    '--name authzed-container',
    'authzed/spicedb:latest',
    'serve-testing',
    '--http-enabled',
    '--skip-release-check=true',
    '--log-level debug',
    '--load-configs ./schema.zaml',
  ].join(' ');

  // turn on podman container for authzed
  childProcess.exec(podmanCommand, {
    cwd: path.join(__dirname, '..'),
  }, (err) => {
    if (err && !err.message.includes('the container name "authzed-container" is already in use')) {
      logger.error('Error starting authzed podman container: Check status with `podman ps`', err);
    } else {
      logger.info('Authzed podman container started successfully');
    }
  });


  logger.info('Global setup complete');
}
