import fs from 'fs';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { setDefaultZitadelClient } from '../src/index';
import { MockZitadelClient, createContainer, runQuery, sleep, testWriteResult } from './test-utils';
import { AuthzedClient } from '../../../packages/authx';

describe('Group GraphQL Testing', async () => {
	const testEnv = {
		AUTHZED_TOKEN: 'readwriteuserorggraphql',
		AUTHZED_ENDPOINT: 'http://localhost:8081',
	};

	const testHeaders = {
		Authorization: 'Bearer sometoken',
		'Content-Type': 'application/json',
	};
	let authzed: StartedTestContainer;
	let client: AuthzedClient;
	beforeAll(async () => {
		authzed = await createContainer(fs.readFileSync('./schema.zaml'), 5052);
	}, 100000);

	afterAll(async () => {
		await authzed.stop();
	});
	test('Can add User to group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const userGroupRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addUserToGroup($arg1: String!, $arg2: String!) {addUserToGroup(userId: $arg1, groupId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'group1',
			}
		);
		await testWriteResult(userGroupRes, 'addUserToGroup');
	});
	test('Can add service account to group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const serviceAccountGroupRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addServiceAccountToGroup($arg1: String!, $arg2: String!) {addServiceAccountToGroup(serviceAccountId: $arg1, groupId: $arg2)}',
			{
				arg1: 'service_account1',
				arg2: 'group1',
			}
		);
		await testWriteResult(serviceAccountGroupRes, 'addServiceAccountToGroup');
	});
	test('Can add organization to group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const groupOrganizationRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addOrganizationToGroup($arg1: String!, $arg2: String!) {addOrganizationToGroup(organizationId: $arg1, groupId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'group1',
			}
		);
		await testWriteResult(groupOrganizationRes, 'addOrganizationToGroup');
	});
	test('Can add data service to organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addDataServiceToOrganization($arg1: String!, $arg2: String!) {addDataServiceToOrganization(orgId: $arg1, dataServiceId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'dataservice1',
			}
		);
		await testWriteResult(writRes, 'addDataServiceToOrganization');
		const writRes2 = await runQuery(
			testHeaders,
			testEnv,
			'mutation addDataServiceToOrganization($arg1: String!, $arg2: String!) {addDataServiceToOrganization(orgId: $arg1, dataServiceId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'dataservice2',
			}
		);
		await testWriteResult(writRes2, 'addDataServiceToOrganization');
	});
	test('Can Read Group Info', async () => {
		await sleep(1000);
		const readGroup = await runQuery(
			testHeaders,
			testEnv,
			'query GroupInfo($arg1: String!) {group(groupId: $arg1) {users, serviceAccounts, dataServices, organizations}}',
			{
				arg1: 'group1',
			}
		);

		expect(readGroup.status).toBe(200);
		const readGroupJson: any = await readGroup.json();
		expect(readGroupJson.data).toStrictEqual({
			group: {
				users: ['marito'],
				serviceAccounts: ['service_account1'],
				dataServices: ['dataservice1', 'dataservice2'],
				organizations: ['orbisops'],
			},
		});
	});
	test('Can add Admin to Group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addAdminToGroup($arg1: String!, $arg2: String!) {addAdminToGroup(userId: $arg1, groupId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'group1',
			}
		);
		await testWriteResult(writRes, 'addAdminToGroup');
	});
	test('Can list admins in group', async () => {
		await sleep(1000);
		const readGroup = await runQuery(testHeaders, testEnv, 'query listGroupAdmins($arg1: String!) {listGroupAdmins(groupId: $arg1)}', {
			arg1: 'group1',
		});

		expect(readGroup.status).toBe(200);
		const readGroupJson: any = await readGroup.json();
		expect(readGroupJson.data).toStrictEqual({
			listGroupAdmins: ['marito'],
		});
	});
	test('Can remove admins from group', async () => {
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation removeAdminFromGroup($arg1: String!, $arg2: String!) {removeAdminFromGroup(userId: $arg1, groupId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'group1',
			}
		);
		await testWriteResult(writRes, 'removeAdminFromGroup');
	});
	test('Group admin got removed', async () => {
		await sleep(1000);
		const readGroup = await runQuery(testHeaders, testEnv, 'query listGroupAdmins($arg1: String!) {listGroupAdmins(groupId: $arg1)}', {
			arg1: 'group1',
		});

		expect(readGroup.status).toBe(200);
		const readGroupJson: any = await readGroup.json();
		expect(readGroupJson.data).toStrictEqual({
			listGroupAdmins: [],
		});
	});
});

describe('User GraphQL Testing', () => {
	let authzed: StartedTestContainer;
	const testEnv = {
		AUTHZED_TOKEN: 'readwriteuserorggraphql',
		AUTHZED_ENDPOINT: 'http://localhost:8081',
	};

	const testHeaders = {
		Authorization: 'Bearer sometoken',
		'Content-Type': 'application/json',
	};
	beforeAll(async () => {
		const schema = (authzed = await createContainer(fs.readFileSync('./schema.zaml'), 5052));
	}, 100000);

	afterAll(async () => {
		await authzed.stop();
	});
	test('Can add Users to Organization', async () => {
		// headers and env vars for test app usage
		const testEnv = {
			AUTHZED_TOKEN: 'readwriteuserorggraphql',
			AUTHZED_ENDPOINT: 'http://localhost:8081',
		};

		const testHeaders = {
			Authorization: 'Bearer sometoken',
			'Content-Type': 'application/json',
		};

		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation AddUserToOrg($arg1: String!, $arg2: String!) {addUserToOrganization(orgId: $arg1, userId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'marito',
			}
		);
		await testWriteResult(writRes, 'addUserToOrganization');
		// await sleep(1000);
		const readRes = await runQuery(testHeaders, testEnv, 'query ListUsersInOrg($arg1: String!) {listUsersInOrganization(orgId: $arg1)}', {
			arg1: 'orbisops',
		});

		expect(readRes.status).toBe(200);
		expect(await readRes.json()).toStrictEqual({
			data: {
				listUsersInOrganization: ['marito'],
			},
		});
	});

	test('Can add user To Group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addUserToGroup($arg1: String!, $arg2: String!) {addUserToGroup(userId: $arg1, groupId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'group1',
			}
		);
		await testWriteResult(writRes, 'addUserToGroup');
	});
	test('Can add Owner to Group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addOwnerToGroup($arg1: String!, $arg2: String!) {addOwnerToGroup(userId: $arg1, groupId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'group1',
			}
		);
		await testWriteResult(writRes, 'addOwnerToGroup');
	});
	test('Can Add Owner to Organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addOwnerToOrganization($arg1: String!, $arg2: String!) {addOwnerToOrganization(orgId: $arg1, userId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'marito',
			}
		);
		await testWriteResult(writRes, 'addOwnerToOrganization');
	});
	test('Can Add Owner to DataService', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation adOwnerToDataService($arg1: String!, $arg2: String!) {adOwnerToDataService(dataServiceId: $arg1, userId: $arg2)}',
			{
				arg1: 'dataservice1',
				arg2: 'marito',
			}
		);
		await testWriteResult(writRes, 'adOwnerToDataService');
	});
	test('Can add data service to organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addDataServiceToOrganization($arg1: String!, $arg2: String!) {addDataServiceToOrganization(orgId: $arg1, dataServiceId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'dataservice1',
			}
		);
		await testWriteResult(writRes, 'addDataServiceToOrganization');
		const writRes2 = await runQuery(
			testHeaders,
			testEnv,
			'mutation addDataServiceToOrganization($arg1: String!, $arg2: String!) {addDataServiceToOrganization(orgId: $arg1, dataServiceId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'dataservice2',
			}
		);
		await testWriteResult(writRes2, 'addDataServiceToOrganization');
	});

	test('Can Read User Info', async () => {
		await sleep(1000);
		setDefaultZitadelClient(new MockZitadelClient());
		const readUser = await runQuery(
			testHeaders,
			testEnv,
			'query UserInfo($arg1: String!) {user(userId: $arg1) {groups, organizations, ownedGroups, ownedOrganizations, dataServices, ownedDataServices}}',
			{
				arg1: 'marito',
			}
		);

		expect(readUser.status).toBe(200);
		const readUserJson: any = await readUser.json();
		// expect(readUserJson.data.user.dataServices).toBeInstanceOf(Array);
		expect(readUserJson.data).toStrictEqual({
			user: {
				groups: ['group1'],
				organizations: ['orbisops'],
				ownedGroups: ['group1'],
				ownedOrganizations: ['orbisops'],
				dataServices: ['dataservice1', 'dataservice2'],
				ownedDataServices: ['dataservice1'],
			},
		});
	});
	test('Can Remove User from Group', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation removeUserFromGroup($arg1: String!, $arg2: String!) {removeUserFromGroup(userId: $arg1, groupId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'group1',
			}
		);
		await testWriteResult(writRes, 'removeUserFromGroup');
	});

	test('Can Remove Data Service from Organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation removeDataServiceFromOrganization($arg1: String!, $arg2: String!) {removeDataServiceFromOrganization(dataServiceId: $arg1, orgId: $arg2)}',
			{
				arg1: 'dataservice2',
				arg2: 'orbisops',
			}
		);
		await testWriteResult(writRes, 'removeDataServiceFromOrganization');
	});

	test('Data Service got removed', async () => {
		await sleep(1000);
		setDefaultZitadelClient(new MockZitadelClient());
		const readUser = await runQuery(
			testHeaders,
			testEnv,
			'query UserInfo($arg1: String!) {user(userId: $arg1) {groups, organizations, ownedGroups, ownedOrganizations, dataServices, ownedDataServices}}',
			{
				arg1: 'marito',
			}
		);

		expect(readUser.status).toBe(200);
		const readUserJson: any = await readUser.json();

		expect(readUserJson.data).toStrictEqual({
			user: {
				groups: [],
				organizations: ['orbisops'],
				ownedGroups: ['group1'],
				ownedOrganizations: ['orbisops'],
				dataServices: ['dataservice1'],
				ownedDataServices: ['dataservice1'],
			},
		});
	});
});

describe('Organization GraphQL Testing', () => {
	let authzed: StartedTestContainer;
	const testEnv = {
		AUTHZED_TOKEN: 'readwriteuserorggraphql',
		AUTHZED_ENDPOINT: 'http://localhost:8081',
	};

	const testHeaders = {
		Authorization: 'Bearer sometoken',
		'Content-Type': 'application/json',
	};
	beforeAll(async () => {
		const schema = (authzed = await createContainer(fs.readFileSync('./schema.zaml'), 5052));
	}, 100000);

	afterAll(async () => {
		await authzed.stop();
	});
	test('Can add Admin to Organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addAdminToOrganization($arg1: String!, $arg2: String!) {addAdminToOrganization(orgId: $arg1, userId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'marito',
			}
		);
		await testWriteResult(writRes, 'addAdminToOrganization');
		sleep(1000);
		const orgAdmins = await runQuery(
			testHeaders,
			testEnv,
			'query listAdminsInOrganization($arg1: String!) {listAdminsInOrganization(orgId: $arg1)}',
			{
				arg1: 'orbisops',
			}
		);
		expect(orgAdmins.status).toBe(200);
		const orgAdminsJson: any = await orgAdmins.json();

		expect(orgAdminsJson.data).toStrictEqual({
			listAdminsInOrganization: ['marito'],
		});
	});

	test('Can remove admin from organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation removeAdminFromOrganization($arg1: String!, $arg2: String!) {removeAdminFromOrganization(orgId: $arg1, userId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'marito',
			}
		);
		await testWriteResult(writRes, 'removeAdminFromOrganization');
		sleep(1000);
		const orgAdmins = await runQuery(
			testHeaders,
			testEnv,
			'query listAdminsInOrganization($arg1: String!) {listAdminsInOrganization(orgId: $arg1)}',
			{
				arg1: 'orbisops',
			}
		);
		expect(orgAdmins.status).toBe(200);
		const orgAdminsJson: any = await orgAdmins.json();
		console.log(orgAdminsJson);

		expect(orgAdminsJson.data).toStrictEqual({
			listAdminsInOrganization: [],
		});
	});
	test('Can add service account to organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		await runQuery(
			testHeaders,
			testEnv,
			'mutation addUserToOrganization($arg1: String!, $arg2: String!) {addUserToOrganization(orgId: $arg1, userId: $arg2)}',
			{
				arg1: 'orbisops',
				arg2: 'marito',
			}
		);
		await sleep(1000);
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation addServiceAccountToOrganization($arg1: String!, $arg2: String!) {addServiceAccountToOrganization(userId: $arg1, serviceAccountId: $arg2)}',
			{
				arg1: 'marito',
				arg2: 'service_account1',
			}
		);
		await testWriteResult(writRes, 'addServiceAccountToOrganization');
		sleep(1000);
		const orgServiceAccounts = await runQuery(
			testHeaders,
			testEnv,
			'query listServiceAccountsInOrganization($arg1: String!) {listServiceAccountsInOrganization(orgId: $arg1)}',
			{
				arg1: 'orbisops',
			}
		);
		expect(orgServiceAccounts.status).toBe(200);
		const orgServiceAccountsJson: any = await orgServiceAccounts.json();

		expect(orgServiceAccountsJson.data).toStrictEqual({
			listServiceAccountsInOrganization: ['service_account1'],
		});
	});
	test('Can remove service account from organization', async () => {
		setDefaultZitadelClient(new MockZitadelClient());
		const writRes = await runQuery(
			testHeaders,
			testEnv,
			'mutation removeServiceAccountFromOrganization($arg1: String!, $arg2: String!) {removeServiceAccountFromOrganization(serviceAccountId: $arg1, orgId: $arg2)}',
			{
				arg1: 'service_account1',
				arg2: 'orbisops',
			}
		);
		await testWriteResult(writRes, 'removeServiceAccountFromOrganization');
		sleep(1000);
		const orgServiceAccounts = await runQuery(
			testHeaders,
			testEnv,
			'query listServiceAccountsInOrganization($arg1: String!) {listServiceAccountsInOrganization(orgId: $arg1)}',
			{
				arg1: 'orbisops',
			}
		);
		expect(orgServiceAccounts.status).toBe(200);
		const orgServiceAccountsJson: any = await orgServiceAccounts.json();

		expect(orgServiceAccountsJson.data).toStrictEqual({
			listServiceAccountsInOrganization: [],
		});
	});
});
