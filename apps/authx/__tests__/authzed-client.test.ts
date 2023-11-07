import fs from 'fs';
import { StartedTestContainer } from 'testcontainers';
import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import app, { AuthzedManagers } from '../src/index';
import { setDefaultZitadelClient, AuthzedClient } from 'ozguard';
import { MockZitadelClient, createContainer, sleep } from './test-utils';
import { OrganizationManager } from '../src/managers/organizations.manager';
import { GroupManager } from '../src/managers/groups.manager';
import { UserManager } from '../src/managers/users.manager';
import { ServiceManager } from '../src/managers/service.manager';

describe('health and status checks', () => {
	let testEnv: object;
	let testHeaders: object;
	beforeAll(async () => {
		testEnv = {
			AUTHZED_TOKEN: 'healthandstatus',
			AUTHZED_ENDPOINT: 'http://localhost:8081',
		};

		testHeaders = {
			Authorization: 'Bearer sometoken',
		};

		setDefaultZitadelClient(new MockZitadelClient());
	});

	test('health check', async () => {
		const res = await app.request(
			'/health',
			{
				method: 'get',
				headers: {
					...testHeaders,
				},
			},
			{
				...testEnv,
			},
		);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});

	test('status check', async () => {
		const res = await app.request(
			'/status',
			{
				method: 'get',
				headers: {
					...testHeaders,
				},
			},
			{
				...testEnv,
			},
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual({
			health: 'ok',
		});
	});

	test('graphql health check', async () => {
		const res = await app.request(
			'/graphql?query={health}',
			{
				method: 'get',
				headers: {
					...testHeaders,
				},
			},
			{
				...testEnv,
			},
		);

		expect(res.status).toBe(200);

		expect(await res.json()).toStrictEqual({
			data: {
				health: 'ok',
			},
		});
	});

	test('graphql status check', async () => {
		const res = await app.request(
			'/graphql?query={status{health}}',
			{
				method: 'get',
				headers: {
					...testHeaders,
				},
			},
			{
				...testEnv,
			},
		);

		expect(res.status).toBe(200);

		expect(await res.json()).toStrictEqual({
			data: {
				status: {
					health: 'ok',
				},
			},
		});
	});
});

describe('authzed/spicedb testing', () => {
	let authzed: StartedTestContainer;
	let client: AuthzedClient<AuthzedManagers>;
	beforeAll(async () => {
		authzed = await createContainer(fs.readFileSync('./schema.zaml'), 5052);

		client = new AuthzedClient<AuthzedManagers>('http://localhost:8081', 'readwriteuserorg', {
			org: new OrganizationManager(),
			group: new GroupManager(),
			user: new UserManager(),
			service: new ServiceManager(),
		});
	}, 100000);

	afterAll(async () => {
		await authzed.stop();
	});

	test('Can Read User Info', async () => {
		await client.managers.org.addUserToOrganization(client.utils, 'orbisops', 'marito');
		await client.managers.org.addUserToOrganization(client.utils, 'orbisops', 'marito', true);

		/*await client.userManager.addUserToGroup('marito', 'group1');
		await client.userManager.addUserToGroup('marito', 'group2');
		await client.userManager.addUserToGroup('marito', 'group2', true);
		await client.orgManager.addDataServiceToOrganization('dataservice1', 'orbisops');
		await client.orgManager.addDataServiceToOrganization('dataservice2', 'orbisops');
		await client.addOwnerToDataService('marito', 'dataservice1');
		await client.addOwnerToDataService('marito', 'dataservice2');*/
		await sleep(1000);
		/*const readUserInfo = await client.userManager.getUserInfo('marito');
		expect(readUserInfo).toStrictEqual({
			// userId: 'marito',
			groups: ['group1', 'group2'],
			organizations: ['orbisops'],
			ownedGroups: ['group2'],
			ownedOrganizations: ['orbisops'],
			dataServices: ['dataservice1', 'dataservice2'],
			ownedDataServices: ['dataservice1', 'dataservice2'],
		});*/
	});
	/*test('Can Read Group Info', async () => {
		client = new AuthzedClient<AuthzedManagers>('http://localhost:8081', 'readwriteuserorg',
		{
			org: new OrganizationManager(),
			group: undefined
		});
		await client.groupManager.addServiceAccountToGroup('service_account1', 'group1');
		await client.groupManager.addServiceAccountToGroup('service_account2', 'group1');
		await client.groupManager.addOrganizationToGroup('orbisops', 'group1');
		await sleep(1000);
		const groupInfo = await client.groupManager.getGroupInfo('group1');
		expect(groupInfo).toStrictEqual({
			users: ['marito'],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice1', 'dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can Remove Group Members', async () => {
		await client.userManager.removeUserFromGroup('marito', 'group1');
		const groupInfo = await client.groupManager.getGroupInfo('group1');
		await sleep(1000);
		expect(groupInfo).toStrictEqual({
			users: [],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice1', 'dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can Remove Data Service from Organization', async () => {
		const deleteRes = await client.orgManager.removeDataServiceFromOrganization('dataservice1', 'orbisops');
		const groupInfo = await client.groupManager.getGroupInfo('group1');
		expect(groupInfo).toStrictEqual({
			users: [],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can add admin to group', async () => {
		const addAdminRes = await client.groupManager.addAdminToGroup('marito', 'group1');
		expect(addAdminRes).toHaveProperty('writtenAt');
	});
	test('can list group admins', async () => {
		await sleep(1000);
		const listAdminsRes = await client.groupManager.listGroupAdmins('group1');
		expect(listAdminsRes).toStrictEqual(['marito']);
	});
	test('can remove admin from group', async () => {
		const removeAdminRes = await client.groupManager.removeAdminFromGroup('marito', 'group1');
		expect(removeAdminRes).toHaveProperty('deletedAt');
	});
	test('admin gets removed from group', async () => {
		await sleep(1000);
		const listAdminsRes = await client.groupManager.listGroupAdmins('group1');
		expect(listAdminsRes).toStrictEqual([]);
	});
	test('can add service account to organzation', async () => {
		const addServiceAccountRes = await client.orgManager.addServiceAccountToOrganization('service_account1', 'orbisops');
		expect(addServiceAccountRes).toHaveProperty('writtenAt');
	});
	test('can read services accounts in organization', async () => {
		await sleep(1000);
		const listServiceAccountsRes = await client.orgManager.listServiceAccountsInOrganization('orbisops');
		expect(listServiceAccountsRes).toStrictEqual(['service_account1']);
	});
	test('can remove service account from organization', async () => {
		const removeServiceAccountRes = await client.orgManager.removeServiceAccountFromOrganization('service_account1', 'orbisops');
		expect(removeServiceAccountRes).toHaveProperty('deletedAt');
	});
	test('service account gets removed from organization', async () => {
		await sleep(1000);
		const listServiceAccountsRes = await client.orgManager.listServiceAccountsInOrganization('orbisops');
		expect(listServiceAccountsRes).toStrictEqual([]);
	});
	*/
});
