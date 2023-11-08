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

		await client.managers.user.addUserToGroup(client.utils, 'marito', 'group1');
		await client.managers.user.addUserToGroup(client.utils, 'marito', 'group2');
		await client.managers.user.addUserToGroup(client.utils, 'marito', 'group2', true);
		await client.managers.org.addDataServiceToOrganization(client.utils, 'dataservice1', 'orbisops');
		await client.managers.org.addDataServiceToOrganization(client.utils, 'dataservice2', 'orbisops');
		await client.managers.service.addOwnerToDataService(client.utils, 'marito', 'dataservice1');
		await client.managers.service.addOwnerToDataService(client.utils, 'marito', 'dataservice2');
		await sleep(1000);
		const readUserInfo = await client.managers.user.getUserInfo(client.utils, 'marito');
		expect(readUserInfo).toStrictEqual({
			// userId: 'marito',
			groups: ['group1', 'group2'],
			organizations: ['orbisops'],
			ownedGroups: ['group2'],
			ownedOrganizations: ['orbisops'],
			dataServices: ['dataservice1', 'dataservice2'],
			ownedDataServices: ['dataservice1', 'dataservice2'],
		});
	});
	test('Can Read Group Info', async () => {
		client = new AuthzedClient<AuthzedManagers>('http://localhost:8081', 'readwriteuserorg', {
			org: new OrganizationManager(),
			group: new GroupManager(),
			user: new UserManager(),
			service: new ServiceManager(),
		});
		await client.managers.group.addServiceAccountToGroup(client.utils, 'service_account1', 'group1');
		await client.managers.group.addServiceAccountToGroup(client.utils, 'service_account2', 'group1');
		await client.managers.group.addOrganizationToGroup(client.utils, 'orbisops', 'group1');
		await sleep(1000);
		const groupInfo = await client.managers.group.getGroupInfo(client.utils, 'group1');
		expect(groupInfo).toStrictEqual({
			users: ['marito'],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice1', 'dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can Remove Group Members', async () => {
		await client.managers.user.removeUserFromGroup(client.utils, 'marito', 'group1');
		const groupInfo = await client.managers.group.getGroupInfo(client.utils, 'group1');
		await sleep(1000);
		expect(groupInfo).toStrictEqual({
			users: [],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice1', 'dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can Remove Data Service from Organization', async () => {
		await client.managers.org.removeDataServiceFromOrganization(client.utils, 'dataservice1', 'orbisops');
		const groupInfo = await client.managers.group.getGroupInfo(client.utils, 'group1');
		expect(groupInfo).toStrictEqual({
			users: [],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can add admin to group', async () => {
		const addAdminRes = await client.managers.group.addAdminToGroup(client.utils, 'marito', 'group1');
		expect(addAdminRes).toHaveProperty('writtenAt');
	});
	test('can list group admins', async () => {
		await sleep(1000);
		const listAdminsRes = await client.managers.group.listGroupAdmins(client.utils, 'group1');
		expect(listAdminsRes).toStrictEqual(['marito']);
	});
	test('can remove admin from group', async () => {
		const removeAdminRes = await client.managers.group.removeAdminFromGroup(client.utils, 'marito', 'group1');
		expect(removeAdminRes).toHaveProperty('deletedAt');
	});
	test('admin gets removed from group', async () => {
		await sleep(1000);
		const listAdminsRes = await client.managers.group.listGroupAdmins(client.utils, 'group1');
		expect(listAdminsRes).toStrictEqual([]);
	});
	test('can add service account to organzation', async () => {
		const addServiceAccountRes = await client.managers.org.addServiceAccountToOrganization(client.utils, 'service_account1', 'orbisops');
		expect(addServiceAccountRes).toHaveProperty('writtenAt');
	});
	test('can read services accounts in organization', async () => {
		await sleep(1000);
		const listServiceAccountsRes = await client.managers.org.listServiceAccountsInOrganization(client.utils, 'orbisops');
		expect(listServiceAccountsRes).toStrictEqual(['service_account1']);
	});
	test('can remove service account from organization', async () => {
		const removeServiceAccountRes = await client.managers.org.removeServiceAccountFromOrganization(
			client.utils,
			'service_account1',
			'orbisops',
		);
		expect(removeServiceAccountRes).toHaveProperty('deletedAt');
	});
	test('service account gets removed from organization', async () => {
		await sleep(1000);
		const listServiceAccountsRes = await client.managers.org.listServiceAccountsInOrganization(client.utils, 'orbisops');
		expect(listServiceAccountsRes).toStrictEqual([]);
	});
});
