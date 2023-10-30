import { IZitadelClient, TokenValidation } from '../../../packages/authx';
import app, { setDefaultZitadelClient } from '../src/index';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

export class MockZitadelClient implements IZitadelClient {
	constructor() {}

	async validateTokenByIntrospection(token: string): Promise<TokenValidation | undefined> {
		return {
			active: true,
		} as TokenValidation;
	}
}
export function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function runQuery(headers: Record<string, string>, env: Record<string, string>, query: string, args: Record<string, string>) {
	return app.request(
		'/graphql',
		{
			method: 'POST',
			headers: {
				...headers,
			},
			body: JSON.stringify({
				query: query,
				variables: args,
			}),
		},
		{
			...env,
		}
	);
}

export async function testWriteResult(result: Response, mutation: string) {
	return [
		expect(result.status).toBe(200),

		expect(await result.json()).toStrictEqual({
			data: {
				[mutation]: true,
			},
		}),
	];
}
