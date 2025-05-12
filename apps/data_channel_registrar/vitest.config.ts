import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

import { Logger } from 'tslog';

const logger = new Logger({});

logger.info('Using built services from other workspaces within @catalyst');
logger.info('no external services used in this project');

logger.info(`Setting up vite tests for the Data Channel Registrar...`);
const validUsers: Record<
  string,
  {
    id: string;
    email: string;
    custom: {
      'urn:zitadel:iam:org:project:roles': {
        [key: string]: {
          [key: string]: string;
        };
      };
    };
  }
> = {
  'admin-cf-token': {
    id: btoa('test-user@email.com'),
    email: 'test-user@email.com',
    custom: {
      'urn:zitadel:iam:org:project:roles': {
        'data-custodian': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
        'org-admin': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
        'org-user': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
        'platform-admin': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
      },
    },
  },
  'data-custodian-cf-token': {
    id: btoa('test-user@email.com'),
    email: 'test-user@email.com',
    custom: {
      'urn:zitadel:iam:org:project:roles': {
        'data-custodian': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
      },
    },
  },
  'org-admin-cf-token': {
    id: btoa('test-user@email.com'),
    email: 'test-user@email.com',
    custom: {
      'urn:zitadel:iam:org:project:roles': {
        'org-admin': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
      },
    },
  },
  'org-user-cf-token': {
    id: btoa('test-user@email.com'),
    email: 'test-user@email.com',
    custom: {
      'urn:zitadel:iam:org:project:roles': {
        'org-user': {
          '1234567890098765432': 'localdevorg.provider.io',
        },
      },
    },
  },
};

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

  console.log('userData from cloudflare access MOCK', JSON.stringify(userData, null, 4));

  return Response.json(userData);
};

export default defineWorkersConfig({
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
              outboundService: handleCloudflareAccessAuthServiceOutbound,
            },
          ],
        },
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'], // Adjust if your source files are elsewhere
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
  },
});
