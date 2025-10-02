/**
 * Generic service binding type
 * Represents a Cloudflare Worker service binding accessible via RPC
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Service<T = unknown> {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
    // RPC methods are accessed directly on the service instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

// Worker type imports are handled at consumer level to avoid circular dependencies
// Consumers should cast their env properly or use the helper functions

/**
 * Centralized Cloudflare Environment interface
 *
 * Defines all service bindings available across the Catalyst platform.
 * Service bindings use RPC pattern via Service<T>, not HTTP fetch.
 */
export interface CloudflareEnv {
    // Service Bindings (RPC) - using unknown to avoid circular dependencies
    // Actual types are enforced by the service helper functions
    AUTHX_AUTHZED_API: Service<unknown>;
    AUTHX_TOKEN_API: Service<unknown>;
    USER_CREDS_CACHE: Service<unknown>;
    ISSUED_JWT_REGISTRY: Service<unknown>;
    CATALYST_DATA_CHANNEL_REGISTRAR_API: Service<unknown>;
    DATA_CHANNEL_CERTIFIER: Service<unknown>;
    ORGANIZATION_MATCHMAKING: Service<unknown>;

    // Self-reference (for recursive calls)
    WORKER_SELF_REFERENCE?: Service<unknown>;

    // Durable Objects
    ISSUED_JWT_REGISTRY_DO?: unknown; // DurableObjectNamespace

    // Assets (for UI worker)
    ASSETS?: unknown; // Fetcher
}

/**
 * Type-safe service names
 */
export type ServiceName =
    | 'AUTHX_AUTHZED_API'
    | 'AUTHX_TOKEN_API'
    | 'USER_CREDS_CACHE'
    | 'ISSUED_JWT_REGISTRY'
    | 'CATALYST_DATA_CHANNEL_REGISTRAR_API'
    | 'DATA_CHANNEL_CERTIFIER'
    | 'ORGANIZATION_MATCHMAKING';
