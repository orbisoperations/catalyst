interface Env  {
	ISSUED_JWT_REGISTRY_DO: DurableObjectNamespace<I_JWT_Registry_DO>
	USERCACHE: Service<UserCredsCacheWorker>;
}