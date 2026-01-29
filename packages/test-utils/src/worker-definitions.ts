/**
 * Standardized worker definitions for common Catalyst workers
 *
 * Pre-configured worker definitions that can be used across test configurations
 * to reduce duplication and ensure consistency.
 */

import path from 'node:path';
import type { AuxiliaryWorker } from './vitest-factories.js';
import { STANDARD_AUTHZED_BINDINGS } from './vitest-config.js';

/**
 * Standard worker definitions used across Catalyst
 * These are relative to the apps directory
 */
export const STANDARD_WORKERS = {
    /**
     * AuthX Token API worker
     * Provides JWT token generation and validation
     */
    authxTokenApi: (relativePath: string = '../authx_token_api'): AuxiliaryWorker => ({
        name: 'authx_token_api',
        scriptPath: path.resolve(relativePath, 'dist/index.js'),
        modulesRoot: path.resolve(relativePath),
        entrypoint: 'JWTWorker',
        durableObjects: {
            KEY_PROVIDER: 'JWTKeyProvider',
        },
        serviceBindings: {
            ISSUED_JWT_REGISTRY: 'issued-jwt-registry',
            AUTHZED: 'authx_authzed_api',
            USERCACHE: 'user-credentials-cache',
        },
    }),

    /**
     * AuthX Authzed API worker
     * Provides SpiceDB/Authzed permission checking
     */
    authxAuthzedApi: (relativePath: string = '../authx_authzed_api'): AuxiliaryWorker => ({
        name: 'authx_authzed_api',
        scriptPath: path.resolve(relativePath, 'dist/index.js'),
        modulesRoot: path.resolve(relativePath),
        entrypoint: 'AuthzedWorker',
        bindings: {
            AUTHZED_ENDPOINT: STANDARD_AUTHZED_BINDINGS.AUTHZED_ENDPOINT,
            AUTHZED_KEY: STANDARD_AUTHZED_BINDINGS.AUTHZED_KEY,
            AUTHZED_PREFIX: STANDARD_AUTHZED_BINDINGS.AUTHZED_PREFIX,
        },
    }),

    /**
     * User Credentials Cache worker
     * Provides user/org credential caching via Durable Objects
     */
    userCredentialsCache: (
        relativePath: string = '../user-credentials-cache',
        outboundService?: (request: Request) => Response | Promise<Response>
    ): AuxiliaryWorker => ({
        name: 'user-credentials-cache',
        scriptPath: path.resolve(relativePath, 'dist/index.js'),
        modulesRoot: path.resolve(relativePath),
        entrypoint: 'UserCredsCacheWorker',
        unsafeEphemeralDurableObjects: true,
        durableObjects: {
            CACHE: 'UserCredsCache',
        },
        ...(outboundService && { outboundService }),
    }),

    /**
     * Issued JWT Registry worker
     * Tracks issued JWTs for revocation
     */
    issuedJwtRegistry: (relativePath: string = '../issued-jwt-registry'): AuxiliaryWorker => ({
        name: 'issued-jwt-registry',
        scriptPath: path.resolve(relativePath, 'dist/index.js'),
        modulesRoot: path.resolve(relativePath),
        entrypoint: 'IssuedJWTRegistryWorker',
        unsafeEphemeralDurableObjects: true,
        durableObjects: {
            ISSUED_JWT_REGISTRY_DO: 'I_JWT_Registry_DO',
        },
        serviceBindings: {
            USERCACHE: 'user-credentials-cache',
        },
    }),

    /**
     * Data Channel Registrar worker
     * Manages data channel registration and permissions
     */
    dataChannelRegistrar: (relativePath: string = '../data_channel_registrar'): AuxiliaryWorker => ({
        name: 'data_channel_registrar',
        scriptPath: path.resolve(relativePath, 'dist/worker.js'),
        modulesRoot: path.resolve(relativePath),
        entrypoint: 'RegistrarWorker',
        unsafeEphemeralDurableObjects: true,
        durableObjects: {
            DO: 'Registrar',
        },
        serviceBindings: {
            AUTHX_TOKEN_API: 'authx_token_api',
            AUTHZED: 'authx_authzed_api',
            USERCACHE: 'user-credentials-cache',
        },
    }),

    /**
     * Mock user credentials cache for unit tests
     * Provides a simple mock implementation for isolated testing
     */
    mockUsercache: (scriptPath: string): AuxiliaryWorker => ({
        name: 'mock-usercache',
        scriptPath: path.resolve(scriptPath),
        modulesRoot: path.dirname(path.resolve(scriptPath)),
    }),

    /**
     * Organization Matchmaking worker
     * Provides organization matching services
     */
    organizationMatchmaking: (relativePath: string = '../organization_matchmaking'): AuxiliaryWorker => ({
        name: 'organization-matchmaking',
        scriptPath: path.resolve(relativePath, 'dist/index.js'),
        modulesRoot: path.resolve(relativePath),
        unsafeEphemeralDurableObjects: true,
        durableObjects: {
            ORG_MATCHMAKING: 'OrganizationMatchmakingDO',
        },
    }),
} as const;

/**
 * Helper to create a Cloudflare Access auth service mock
 * This is commonly used as an outboundService for user-credentials-cache
 *
 * @param validUsers - Map of token -> user data
 * @returns Outbound service handler function
 *
 * @example
 * const outboundService = handleCloudflareAccessAuthServiceOutbound({
 *   'valid-token': {
 *     userId: 'user-123',
 *     email: 'test@example.com',
 *     zitadelRoles: ['platform-admin'],
 *   },
 * });
 */
export function handleCloudflareAccessAuthServiceOutbound(
    validUsers: Record<string, { userId: string; email: string; zitadelRoles: string[] }>
): (request: Request) => Response | Promise<Response> {
    return async (req: Request) => {
        if (req.method !== 'GET') {
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
}
