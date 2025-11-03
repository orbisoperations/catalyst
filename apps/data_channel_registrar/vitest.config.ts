import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { validUsers } from './test/utils/authUtils';

import { Logger } from 'tslog';

const logger = new Logger({});

logger.info('Using built services from other workspaces within @catalyst');
logger.info('no external services used in this project');

logger.info(`Setting up vite tests for the Data Channel Registrar...`);

const handleCloudflareAccessAuthServiceOutbound = async (req: Request) => {
  // receives
  // headers
  // cookie: CF_Authorization=token
  if (req.method != 'GET') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let token = req.headers.get('cookie');
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  token = token.split('=')[1];
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userData = validUsers[token];

  if (!userData) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json(userData);
};

export default defineWorkersConfig({
  optimizeDeps: {
    entries: ['@graphql-tools/executor-http'],
  },
  logLevel: 'info',
  clearScreen: false,
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        // Common exclusions
        '**/node_modules/**',
        '**/dist/**',
        '**/test/**',
        '**/tests/**',
        '**/*.{test,spec}.?(c|m)[jt]s?(x)', // Exclude test file patterns
        '**/wrangler.jsonc',
        '**/vitest.config.*',
        '**/.wrangler/**',
        '**/env.d.ts',
        '**/global-setup.ts',
      ],
    },
    globalSetup: './global-setup.ts',
    poolOptions: {
      workers: {
        isolatedStorage: true,
        singleWorker: true,
        main: 'src/worker.ts',
        wrangler: { configPath: './wrangler.jsonc' },
        serviceBindings: {
          AUTHZED: 'authx_authzed_api',
          AUTHX_TOKEN_API: 'authx_token_api',
          USERCACHE: 'user-credentials-cache',
        },
        miniflare: {
          durableObjects: {
            DO: 'Registrar',
            KEY_PROVIDER: {
              className: 'JWTKeyProvider',
              scriptName: 'authx_token_api',
            },
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
                AUTHZED_ENDPOINT: 'http://localhost:8449',
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
              serviceBindings: {
                ISSUED_JWT_REGISTRY: 'issued-jwt-registry',
                AUTHZED: 'authx_authzed_api',
                USERCACHE: 'user-credentials-cache',
                // Note: DATA_CHANNEL_REGISTRAR is not included here to avoid circular dependency
                // since data_channel_registrar is the main worker being tested
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
              outboundService: handleCloudflareAccessAuthServiceOutbound,
            },
            {
              name: 'issued-jwt-registry',
              modules: true,
              modulesRoot: path.resolve('../issued-jwt-registry'),
              scriptPath: path.resolve('../issued-jwt-registry/dist/index.js'),
              compatibilityDate: '2025-04-01',
              compatibilityFlags: ['nodejs_compat'],
              entrypoint: 'IssuedJWTRegistryWorker',
              durableObjects: {
                ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
              },
              serviceBindings: {
                USERCACHE: 'user-credentials-cache',
              },
            },
          ],
        },
      },
    },
  },
});
