import { testClient } from 'hono/testing';
import { describe, expect, test } from 'vitest';

import app from '../src/index';
import testEnv from './testEnv';
const tc: any = testClient(app, {
	AUTHZED_TOKEN: testEnv.AUTHZED_TOKEN,
});

describe('health and status checks', () => {
	test('health check', async () => {
		const res = await tc['/health'].$get();
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});

	test('status check', async () => {
		const res = await tc['/status'].$get();
		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual({
			health: 'ok',
		});
	});

	test('graphql health check', async () => {
		/*const req = new Request('http://localhost/graphql?query={health}', {
				method: 'PUT'
			})*/

		const res = await tc['/graphql?query={health}'].$get();

		expect(res.status).toBe(200);

		expect(await res.json()).toStrictEqual({
			data: {
				health: 'ok',
			},
		});
	});

	test('graphql status check', async () => {
		const res = await app.request('/graphql?query={status{health}}');
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

describe('can read relationships', () => {
	test('can read user', async () => {
		const query = `
        {
            user(userId: "marito") {
              data_services
              groups
              organization
              user_data_services
            }
          }
        `;
		const res = await tc['graphql?query=' + query].$get();
		expect(res.status).toBe(200);
		expect(res.bodyInit).toBe(
			'{"data":{"user":{"data_services":["data1","data2","data3","data4","data5","data6","data7","data8"],"groups":[],"organization":"orbis","user_data_services":[]}}}'
		);
	});
});
