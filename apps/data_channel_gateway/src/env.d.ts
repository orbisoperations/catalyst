export interface Env {
    DATA_CHANNEL_REGISTRAR: Service<import('@catalyst/data_channel_registrar/src/worker').default>;
    AUTHX_TOKEN_API: Service<import('@catalyst/authx_token_api/src').default>;
    ISSUED_JWT_REGISTRY: Service<import('../../issued-jwt-registry/src').default>;
}
