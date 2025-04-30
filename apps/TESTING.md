# Testing Best Practices and Guidelines

## Decalarative Request Mocking

When testing applications that make HTTP requests to external services, it's important to mock these requests to ensure tests are predictable, fast, and don't rely on external dependencies.

### Using fetchMock in Cloudflare Workers Tests

For Cloudflare Workers tests using Vitest, we leverage the built-in **declarative request mocking** capabilities:

```typescript
// Set up fetch mocking in test hooks
beforeEach(() => {
    // activate mock handlers
    fetchMock.activate();
    // disable all outbound connections
    // fail if a `fetch` requests fallthroughs
    // all the existing mocks
    fetchMock.disableNetConnect();
});

afterEach(() => {
    fetchMock.deactivate();
    // fail if at least 1 mock did not catched a `fetch`
    // can be indicative of bad test implementation
    fetchMock.assertNoPendingInterceptors();
});

// Example of mocking a fetch request
// will interecpt a fetch call if and only if all the params
// exactly match or if the callback function returns true
fetchMock.get('https://api.example.com')
  .intercept({ path: '/data' })
  .reply(200, { success: true, data: [1, 2, 3] });

// callback
fetchMock.get('https://api.example.com')
  .intercept({ path: (body: string) => {
      const parsedBody = JSON.parse(body);
      return 'key' in parsedBody;
  }})
  .reply(200, { success: true, data: [1, 2, 3] });
```

### Mocking GraphQL Endpoints

For testing services that connect to GraphQL endpoints, use the pattern from our resilience tests:

```typescript
const createMockGraphqlEndpoint = (
    endpoint: string,
    typeDefs: string,
    dataStore: Record<string, any>
) => {
    // Mock SDL introspection queries
    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body) => body.toString().includes('_sdl'),
        })
        .reply(200, { data: { _sdl: typeDefs } })
        .persist();

    // Mock regular GraphQL queries
    fetchMock
        .get(endpoint)
        .intercept({
            path: '/graphql',
            method: 'POST',
            body: (body) => {
                return (
                    !body.toString().includes('_sdl') &&
                    Object.keys(dataStore).some((key) =>
                        body.toString().includes(key)
                    )
                );
            },
        })
        .reply(200, ({ body }) => {
            return {
                data: Object.keys(dataStore).reduce((acc, key) => {
                    if (body?.toString().includes(key)) {
                        acc[key] = dataStore[key];
                    }
                    return acc;
                }, {}),
            };
        })
        .persist();
};
```

### Resources for Mocking Fetch and Vitest

For more information on Workers Vitest integration and request mocking:

- [Cloudflare Workers Vitest Integration](https://blog.cloudflare.com/workers-vitest-integration/)
- [Vitest Documentation](https://vitest.dev/)
- [MockInterceptor.Options Docs](https://github.com/cloudflare/workers-sdk/blob/6ae1583973acd2d957d948e15693442f4ad1cb67/packages/vitest-pool-workers/types/cloudflare-test.d.ts#L220C20-L220C27)

More examples and docs on `workers-sdk` repo:

- [Cloudflare Workers SDK fetch-mock tests examples](https://github.com/cloudflare/workers-sdk/blob/main/fixtures/vitest-pool-workers-examples/misc/test/fetch-mock.test.ts)

### Resilience Testing for the Services

When testing gateway services that connect to multiple backend services, test for resilience by:

1. Mocking some endpoints as working
2. Mocking others as failing or timing out
3. Verifying the gateway handles these scenarios gracefully

## Integration Testing with permissing system (SpiceDB)

When testing applications that require authorization checks, it's important to properly set up and test permission relationships. Our services use AuthZed for fine-grained permission management.

You will be needing the access to the `AUTHZED` service. Defined `Service<import('../../authx_authzed_api/src').default>`;

### Setting Up Permission Relationships

For testing purposes, you need to create the necessary relationships between subjects (users) and resources:

```typescript
// Example: Add a user as a data custodian to an organization
const addDataCustodianToOrg = await env.AUTHZED.addDataCustodianToOrg(
  'localdevorg',                // organization ID
  'test-user@email.com',        // user email
);

// Verify the relationship was created correctly
expect(addDataCustodianToOrg).toBeDefined();
expect(addDataCustodianToOrg.entity).toBe(
  `orbisops_catalyst_dev/organization:localdevorg#data_custodian@orbisops_catalyst_dev/user:${btoa('test-user@email.com')}`,
);
```

### Testing Resource Access

After setting up the permissions, test access to protected resources:

```typescript
// Example: Create a channel with a user who has proper permissions
const dataChannelPayload = {};
const response = await SELF.create('default', dataChannelPayload, {
  cfToken: 'admin-cf-token',  // Token associated with a user who has permissions
});

// Verify success
expect(response.success).toBe(true);

// Example: Test access denial
const unauthorizedResponse = await SELF.create('default', dataChannelPayload, {
  cfToken: 'user-without-permissions',
});

// Verify failure
expect(unauthorizedResponse.success).toBe(false);
expect(unauthorizedResponse.error).toContain('Unauthorized');
```

### Testing with Preconfigured Users

Use the preconfigured user credentials from your test environment:

```typescript
const user = {
  org: 'localdevorg',
  email: 'test-user@email.com',
  token: 'admin-cf-token',  // This token must match your mocked Cloudflare Access setup
};

// The test environment should recognize this token and match it with the user profile
// that has the appropriate roles assigned
```

## General Testing Guidelines

1. **Isolation**: Tests should be independent and not rely on the state from other tests
2. **Predictability**: Use fixed seeds or deterministic mocks for random elements
3. **Cleanliness**: Clean up any test artifacts, especially in the teardown phase
4. **Performance**: Keep tests fast by mocking external dependencies
5. **Coverage**: Aim for comprehensive test coverage, especially for edge cases
