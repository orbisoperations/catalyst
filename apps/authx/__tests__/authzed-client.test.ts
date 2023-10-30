import fs from 'fs';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AuthzedClient } from '../../../packages/authx';
import app, { setDefaultZitadelClient } from '../src/index';
import { MockZitadelClient, createContainer, runQuery, sleep, testWriteResult } from './test-utils';

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
			}
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
			}
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
			}
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
			}
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
	let client: AuthzedClient;
	beforeAll(async () => {
		const schema = fs.readFileSync('./schema.zaml');

		authzed = authzed = await createContainer(fs.readFileSync('./schema.zaml'), 5052);
	}, 100000);

	test('Can Read User Info', async () => {
		client = new AuthzedClient('http://localhost:8081', 'readwriteuserorg');
		await client.addUserToOrganization('orbisops', 'marito');
		await client.addUserToOrganization('orbisops', 'marito', true);

		await client.addUserToGroup('marito', 'group1');
		await client.addUserToGroup('marito', 'group2');
		await client.addUserToGroup('marito', 'group2', true);
		await client.addDataServiceToOrganization('dataservice1', 'orbisops');
		await client.addDataServiceToOrganization('dataservice2', 'orbisops');
		await client.addOwnerToDataService('marito', 'dataservice1');
		await client.addOwnerToDataService('marito', 'dataservice2');
		await sleep(1000);
		const readUserInfo = await client.getUserInfo('marito');
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
		client = new AuthzedClient('http://localhost:8081', 'readwriteuserorg');
		await client.addServiceAccountToGroup('service_account1', 'group1');
		await client.addServiceAccountToGroup('service_account2', 'group1');
		await client.addOrganizationToGroup('orbisops', 'group1');
		await sleep(1000);
		const groupInfo = await client.getGroupInfo('group1');
		expect(groupInfo).toStrictEqual({
			users: ['marito'],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice1', 'dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can Remove Group Members', async () => {
		await client.removeUserFromGroup('marito', 'group1');
		const groupInfo = await client.getGroupInfo('group1');
		await sleep(1000);
		expect(groupInfo).toStrictEqual({
			users: [],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice1', 'dataservice2'],
			organizations: ['orbisops'],
		});
	});
	test('Can Remove Data Service from Organization', async () => {
		const deleteRes = await client.removeDataServiceFromOrganization('dataservice1', 'orbisops');
		const groupInfo = await client.getGroupInfo('group1');
		expect(groupInfo).toStrictEqual({
			users: [],
			serviceAccounts: ['service_account1', 'service_account2'],
			dataServices: ['dataservice2'],
			organizations: ['orbisops'],
		});
	});

	afterAll(async () => {
		await authzed.stop();
	});
});
