export interface Env {
  // Service bindings - using Service<T> pattern for compile-time type safety
  AUTHX_TOKEN_API: Service<import('../../authx_token_api/src').default>;
  DATA_CHANNEL_REGISTRAR: Service<import('../../data_channel_registrar/src/worker').default>;
  ISSUED_JWT_REGISTRY: Service<import('../../issued-jwt-registry/src').default>;

  // Environment variables
  ENVIRONMENT?: string;
}
