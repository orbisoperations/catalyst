# Integration Tests for authx_token_api

This directory contains integration tests that verify `authx_token_api` works correctly with REAL service bindings and infrastructure. Integration tests use:

- ✅ Real AuthZed container (via Podman)
- ✅ Real UserCache service
- ✅ Real Data Channel Registrar
- ✅ Real KEY_PROVIDER Durable Object
- ✅ No mocks or stubs

---

## Test Organization

Integration tests are organized by **workflow** rather than by method:

| Test File                       | Tests    | Purpose                                                                 |
| ------------------------------- | -------- | ----------------------------------------------------------------------- |
| **jwt-lifecycle.spec.ts**       | 4 tests  | Complete JWT lifecycle from creation → validation → crypto verification |
| **service-integration.spec.ts** | 13 tests | Cross-service interactions (AuthZed, UserCache, Registrar)              |
| **token-splitting.spec.ts**     | 8 tests  | Catalyst token splitting into single-use tokens                         |
| **key-management.spec.ts**      | 9 tests  | Key rotation, namespace isolation, public key retrieval                 |
| **system-tokens.spec.ts**       | 9 tests  | System service JWT workflows (no user token required)                   |

**Total:** 43 integration tests

---

## Running Integration Tests

### Prerequisites

1. **Podman must be installed** - AuthZed container runs in Podman
2. **Dependencies must be built** - Global setup builds required services
3. **Local development environment** - `./run_local_dev.sh` should work

### Run All Integration Tests

```bash
# From authx_token_api directory
pnpm test:integration

# Or using vitest directly
pnpm vitest run --project integration
```

### Run Specific Test File

```bash
# JWT Lifecycle tests
pnpm vitest run test/integration/jwt-lifecycle.spec.ts

# Service Integration tests
pnpm vitest run test/integration/service-integration.spec.ts

# Token Splitting tests
pnpm vitest run test/integration/token-splitting.spec.ts

# Key Management tests
pnpm vitest run test/integration/key-management.spec.ts

# System Tokens tests
pnpm vitest run test/integration/system-tokens.spec.ts
```

### Run with Watch Mode

```bash
pnpm vitest --project integration
```

---

## Test Coverage by Feature

### JWT Lifecycle (jwt-lifecycle.spec.ts)

✅ **Complete end-to-end JWT creation and validation**

- Create JWT → Validate → Cryptographically verify
- Test with real AuthZed permissions
- Test with real UserCache lookup
- Verify all JWT claims and timestamps

✅ **Key rotation impact**

- Create JWT with current key
- Rotate key (platform admin)
- Verify old JWT becomes invalid
- Verify new JWTs work

✅ **Public key verification**

- Get public key as JWK set
- Verify JWT signature using JOSE library
- Validate JWT structure and claims

✅ **Token expiration handling**

- Create short-lived token
- Validate immediately (success)
- Wait for expiration
- Validate after expiry (failure)

### Service Integration (service-integration.spec.ts)

✅ **AuthZed Integration (4 tests)**

- Permission validation for all claims
- Multi-claim authorization
- Different user roles
- Permission failure handling

✅ **UserCache Integration (3 tests)**

- User lookup via CF token
- Different user types (custodian, admin, user)
- Invalid token handling

✅ **Data Channel Registrar Integration (3 tests)**

- Token splitting with channel list
- Channel filtering by claims
- No channels error handling

✅ **Multi-Service Workflows (3 tests)**

- Complete user journey (auth → permissions → token)
- Complex multi-org scenarios
- Claim/permission matching verification

### Token Splitting (token-splitting.spec.ts)

✅ **Complete splitting flow (5 tests)**

- Split multi-claim catalyst token
- Create single-use JWTs
- Validate catalyst token before splitting
- Handle partial failures
- Verify security properties

✅ **Error handling (3 tests)**

- Empty claims array
- Missing catalyst token
- Invalid claim values

### Key Management (key-management.spec.ts)

✅ **Key rotation (3 tests)**

- Rotate and invalidate old tokens
- Platform-admin authorization only
- Rotation without active tokens

✅ **Namespace isolation (4 tests)**

- Separate keys per namespace
- Cross-namespace validation blocked
- Namespace-specific rotation
- Concurrent namespace operations

✅ **Public key retrieval (2 tests)**

- PEM format for any namespace
- JWK set for any namespace

### System Tokens (system-tokens.spec.ts)

✅ **System JWT workflows (4 tests)**

- Create and validate system JWT
- Multiple channels support
- Duration limits and defaults
- Namespace independence

✅ **Authorization (3 tests)**

- Service allowlist enforcement
- Unauthorized service rejection
- Input validation

✅ **Comparison with user JWTs (2 tests)**

- Subject format verification
- Issuer/audience consistency

---

## What Integration Tests Verify

### ✅ Real Service Communication

- AuthZed permission checks work correctly
- UserCache user lookup works correctly
- Data Channel Registrar returns correct channels
- KEY_PROVIDER Durable Object handles concurrent requests

### ✅ Complete Workflows

- User can request JWT and use it
- System services can obtain JWTs without user tokens
- Catalyst tokens split correctly into single-use tokens
- Key rotation invalidates old tokens

### ✅ Cross-Service Security

- Permissions checked before JWT signing
- Invalid users cannot get JWTs
- Unauthorized services cannot get system JWTs
- Claims match AuthZed permissions exactly

### ✅ Cryptographic Correctness

- JWTs signed with EdDSA algorithm
- Signatures verify with public keys
- Tokens have correct expiration
- JWTs have unique IDs

### ✅ Multi-Tenancy

- Namespaces have separate keys
- Cross-namespace validation blocked
- Concurrent namespace operations safe

---

## Test Patterns

### Standard Test Structure

```typescript
describe('Integration: Feature Name', () => {
	beforeEach(async () => {
		// Clean up AuthZed permissions
		await clearAllAuthzedRoles();
	});

	it('should complete workflow end-to-end', async () => {
		// ═══════════════════════════════════════════════════════════
		// STEP 1: Setup - Create permissions in AuthZed
		// ═══════════════════════════════════════════════════════════
		await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, user.email);
		const channel = await custodianCreatesDataChannel(dataChannel);

		// ═══════════════════════════════════════════════════════════
		// STEP 2: Execute - Call service method
		// ═══════════════════════════════════════════════════════════
		const response = await SELF.signJWT(request, 3600, { cfToken });

		// ═══════════════════════════════════════════════════════════
		// STEP 3: Verify - Check all aspects of response
		// ═══════════════════════════════════════════════════════════
		expect(response.success).toBe(true);
		expect(response.token).toBeDefined();

		// ═══════════════════════════════════════════════════════════
		// STEP 4: Validate - Cryptographically verify
		// ═══════════════════════════════════════════════════════════
		const validateResponse = await SELF.validateToken(response.token);
		expect(validateResponse.valid).toBe(true);
	});
});
```

### Key Testing Utilities

```typescript
// User roles from test/utils/authUtils.ts
const CUSTODIAN_CF_TOKEN = 'cf-custodian-token';
const PLATFORM_ADMIN_CF_TOKEN = 'cf-platform-admin-token';
const ORG_ADMIN_CF_TOKEN = 'cf-org-admin-token';
const ORG_USER_CF_TOKEN = 'cf-user-token';

// Test data generation
const channels = generateDataChannels(count);
const createdChannel = await custodianCreatesDataChannel(channel);

// Cleanup between tests
await clearAllAuthzedRoles();

// Direct catalyst token creation (bypassing user flow)
const catalystToken = await (async () => {
	const id = env.KEY_PROVIDER.idFromName('default');
	const stub = env.KEY_PROVIDER.get(id);
	return stub.signJWT({ entity, claims }, expiresIn);
})();
```

---

## Debugging Integration Tests

### View Test Output

```bash
# Verbose output
pnpm vitest run --project integration --reporter=verbose

# Only failures
pnpm vitest run --project integration --reporter=default
```

### Check AuthZed Container

```bash
# Is container running?
podman ps

# View container logs
podman logs authzed-container

# Restart container
podman restart authzed-container
```

### Common Issues

**❌ Test fails: "AUTHZED unavailable"**

- Solution: Ensure Podman container is running (`podman ps`)
- Restart: `podman restart authzed-container`

**❌ Test fails: "User not found"**

- Solution: Check `test/utils/authUtils.ts` for valid user tokens
- Ensure USERCACHE is built (`pnpm build` in user-credentials-cache)

**❌ Test timeout**

- Solution: Increase timeout in vitest.config.ts
- Check if services are built (`pnpm build` in dependencies)

**❌ "Storage isolation error"**

- Solution: Using unique namespaces (`crypto.randomUUID()`) prevents this
- Ensure `isolatedStorage: true` in vitest config

---

## Adding New Integration Tests

### Checklist for New Tests

- [ ] Use real service bindings (no mocks)
- [ ] Clean up state in `beforeEach` (`clearAllAuthzedRoles()`)
- [ ] Test complete workflows (not just individual methods)
- [ ] Verify cryptographic correctness (use `jwtVerify` from jose)
- [ ] Test both success and failure cases
- [ ] Use descriptive test names explaining the scenario
- [ ] Add step-by-step comments using `═══` dividers
- [ ] Verify final state, not just return values

### Example Template

```typescript
it('should [describe scenario in detail]', async () => {
	// ═══════════════════════════════════════════════════════════
	// SCENARIO: [What this test verifies]
	// ═══════════════════════════════════════════════════════════
	// STEP 1: Setup
	// ...
	// STEP 2: Execute
	// ...
	// STEP 3: Verify
	// ...
	// STEP 4: Additional validation
	// ...
});
```

---

## Migration from Legacy Tests

The old `index.spec.ts` file has been deprecated and renamed to `legacy-tests.spec.ts.deprecated`.

**Why the migration?**

- Old file mixed unit tests with integration tests
- Tests focused on individual methods rather than workflows
- Limited cross-service validation
- Harder to understand test purpose

**New organization benefits:**

- Clear separation by workflow
- Tests verify real service interactions
- Better documentation (step-by-step comments)
- Easier to identify gaps in coverage

---

## Coverage Goals

**Current Integration Test Coverage:**

- ✅ All 8 worker methods tested in integration context
- ✅ Complete JWT lifecycles validated
- ✅ Cross-service interactions verified
- ✅ Real AuthZed, UserCache, Registrar integration
- ✅ Namespace isolation tested
- ✅ Cryptographic verification included
- ✅ ~90% of critical workflows covered

**What's NOT Covered (by design):**

- ❌ Unit-level method testing → Use unit tests
- ❌ Performance/load testing → Use benchmarks
- ❌ Chaos/failure injection → Use e2e tests
- ❌ UI/CLI workflows → Use e2e tests

---

## Related Documentation

- **Unit Tests:** `test/unit/README.md` (if exists)
- **Testing Strategy:** `/testing-analysis.md` in project root
- **Global Setup:** `global-setup.ts` (builds dependencies, starts AuthZed)
- **Test Utilities:** `test/utils/testUtils.ts` and `test/utils/authUtils.ts`
- **Vitest Config:** `vitest.config.ts` (integration project configuration)

---

**Last Updated:** 2025-10-02
**Total Tests:** 43 integration tests
**Test Duration:** ~30-60 seconds (depends on AuthZed container startup)
