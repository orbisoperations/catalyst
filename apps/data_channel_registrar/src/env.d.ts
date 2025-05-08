export interface Env {
  DO: DurableObjectNamespace<import('./worker').Registrar>;
  AUTHZED: Service<import('../../authx_authzed_api/src').default>;
  AUTHX_TOKEN_API: Service<import('../../authx_token_api/src').default>;
  USERCACHE: Service<import('../../user-credentials-cache/src').default>;
}
