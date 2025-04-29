import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

import { Logger } from 'tslog';

const logger = new Logger({});

logger.info('Using built services from other workspaces within @catalyst');
logger.info('no external services used in this project');

logger.info(`Setting up vite tests for the Data Channel Registrar...`);

export default defineWorkersProject({
  optimizeDeps: {
    entries: ['@graphql-tools/executor-http'],
  },
  logLevel: 'info',
  clearScreen: false,
  test: {
    globalSetup: './global-setup.ts',
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,
        main: 'src/worker.ts',
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          durableObjects: {
            DO: 'Registrar',
          },
          compatibilityDate: '2025-04-01',
          compatibilityFlags: ['nodejs_compat'],
          workers: [
            {
              name: 'authx_authzed_api',
              modules: true,
              modulesRoot: path.resolve('../authx_authzed_api'),
              scriptPath: path.resolve('../authx_authzed_api/dist/index.js'),
              compatibilityDate: '2025-04-01',
              compatibilityFlags: ['nodejs_compat'],
              entrypoint: 'AuthzedWorker',
              bindings: {
                AUTHZED_ENDPOINT: 'http://localhost:8443',
                AUTHZED_KEY: 'atoken',
                AUTHZED_PREFIX: 'orbisops_catalyst_dev/',
              },
            },
            {
              name: 'authx_token_api',
              modules: true,
              modulesRoot: path.resolve('../authx_token_api'),
              scriptPath: path.resolve('../authx_token_api/dist/index.js'),
              compatibilityDate: '2025-04-01',
              compatibilityFlags: ['nodejs_compat'],
              entrypoint: 'JWTWorker',
              durableObjects: {
                KEY_PROVIDER: 'JWTKeyProvider',
              },
            },
            {
              name: 'user-credentials-cache',
              modules: true,
              modulesRoot: path.resolve('../user-credentials-cache'),
              scriptPath: path.resolve('../user-credentials-cache/dist/index.js'),
              compatibilityDate: '2025-04-01',
              compatibilityFlags: ['nodejs_compat'],
              entrypoint: 'UserCredsCacheWorker',
              unsafeEphemeralDurableObjects: true,
              durableObjects: {
                CACHE: 'UserCredsCache',
              },
            },
          ],
        },
      },
    },
  },
});
