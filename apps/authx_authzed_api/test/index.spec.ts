// test/index.spec.ts

// RUN THIS TO GET IT WORKING
// podman run -v "$(pwd)"/schema.zaml:/schema.zaml:ro  -p 8449:8443 authzed/spicedb serve-testing --http-enabled --skip-release-check=true --log-level debug --load-configs /schema.zaml

import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Authzed Integration via TRPC', () => {
	it('should have the env vars defined', async () => {
		expect(env.AUTHZED_ENDPOINT).toBeDefined();
		expect(env.AUTHZED_KEY).toBeDefined();
		expect(env.AUTHZED_PREFIX).toBeDefined();
	});

	it('health check for service', async () => {
		expect(await SELF.schema()).toBeDefined();
	});

	// get all users in spice db
	it('get all users in spice db', async () => {
		const resp = await SELF.listUsersInOrg('orbisops_catalyst_dev', 'test-user-1');
		// console.log(resp);
		expect(resp).instanceOf(Array);
	});

	// it('should add user to org', async () => {
	// 	const org1 = generateOrgs(1)[0];

	// 	const resp = await SELF.addUserToOrg(org1, 'test-user-1');
	// 	console.log(resp);
	// 	expect(resp).toBeDefined();

	// 	const users = SELF.listUsersInOrg(org1, 'test-user-1');
	// 	console.log(users);
	// });
});

/*it("get schema from authzed", async () => {
		const resp = await client.authzedSchema.mutate()
		expect(resp).not.toBe(undefined)
		expect(resp.schemaText).toEqual(`definition orbisops_catalyst_dev/data_channel {
\trelation organization: orbisops_catalyst_dev/organization
\tpermission read = organization->data_channel_read
}

definition orbisops_catalyst_dev/organization {
\trelation admin: orbisops_catalyst_dev/user
\trelation data_custodian: orbisops_catalyst_dev/user
\trelation user: orbisops_catalyst_dev/user
\trelation partner_organization: orbisops_catalyst_dev/organization
\trelation data_channel: orbisops_catalyst_dev/data_channel
\tpermission member = admin + data_custodian + user
\tpermission role_assign = admin
\tpermission data_channel_create = data_custodian
\tpermission data_channel_update = data_channel_create
\tpermission data_channel_delete = data_channel_create
\tpermission data_channel_read = admin + data_custodian + user + partner_organization->data_channel_read
}

// Exported from permissions system catalyst dev (orbisops_catalyst_dev) on Fri Apr 05 2024 10:16:05 GMT-0700 (Pacific Daylight Time)
definition orbisops_catalyst_dev/user {}`)
	})

	/*describe("testing organization functions", async () => {
		it("add new users to organization", async () => {
			const resp = await client.organization.relations.user.sync.mutate({
				userId: "test-user-1",
				orgId: "test-org-1"
			})

			expect(resp).toBe(true)

		})
	})*/
/*&it("responds with Hello World! (unit style)", async () => {
    const request = new IncomingRequest("http://example.com");
    // Create an empty context to pass to `worker.fetch()`.
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
  });

  it("responds with Hello World! (integration style)", async () => {
   const response = await SELF.fetch("https://example.com");
   expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
 });*/
