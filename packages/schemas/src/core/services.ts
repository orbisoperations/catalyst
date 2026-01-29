import type { CloudflareEnv, ServiceName, Service } from './env';

/**
 * Generic worker interface for service bindings
 * Allows calling any method without strict typing
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WorkerService extends Service<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

/**
 * Get a service binding from the Cloudflare environment
 *
 * @example
 * ```typescript
 * const authzed = getAuthzed(env);
 * await authzed.checkPermission(...); // Works with any method
 * ```
 *
 * @param env - Cloudflare environment object
 * @param serviceName - Name of the service binding
 * @returns Service instance with callable methods
 */
export function getService(env: CloudflareEnv, serviceName: ServiceName): WorkerService {
    const service = env[serviceName];

    if (!service) {
        throw new Error(`Service binding "${serviceName}" not found in environment`);
    }

    return service as WorkerService;
}

/**
 * Helper to get Authzed service
 * Returns the AUTHX_AUTHZED_API service binding
 */
export function getAuthzed(env: CloudflareEnv): WorkerService {
    return getService(env, 'AUTHX_AUTHZED_API');
}

/**
 * Helper to get Token API service
 * Returns the AUTHX_TOKEN_API service binding
 */
export function getTokenAPI(env: CloudflareEnv): WorkerService {
    return getService(env, 'AUTHX_TOKEN_API');
}

/**
 * Helper to get User Credentials Cache service
 * Returns the USER_CREDS_CACHE service binding
 */
export function getUserCache(env: CloudflareEnv): WorkerService {
    return getService(env, 'USER_CREDS_CACHE');
}

/**
 * Helper to get Issued JWT Registry service
 * Returns the ISSUED_JWT_REGISTRY service binding
 */
export function getJWTRegistry(env: CloudflareEnv): WorkerService {
    return getService(env, 'ISSUED_JWT_REGISTRY');
}

/**
 * Helper to get Data Channel Registrar service
 * Returns the CATALYST_DATA_CHANNEL_REGISTRAR_API service binding
 */
export function getRegistrar(env: CloudflareEnv): WorkerService {
    return getService(env, 'CATALYST_DATA_CHANNEL_REGISTRAR_API');
}

/**
 * Helper to get Data Channel Certifier service
 * Returns the DATA_CHANNEL_CERTIFIER service binding
 */
export function getCertifier(env: CloudflareEnv): WorkerService {
    return getService(env, 'DATA_CHANNEL_CERTIFIER');
}

/**
 * Helper to get Organization Matchmaking service
 * Returns the ORGANIZATION_MATCHMAKING service binding
 */
export function getMatchmaking(env: CloudflareEnv): WorkerService {
    return getService(env, 'ORGANIZATION_MATCHMAKING');
}
