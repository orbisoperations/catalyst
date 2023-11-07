import { GenericContainer, Wait } from 'testcontainers';
import { IZitadelClient, TokenValidation } from 'ozguard';
import app from '../src/index';
import { expect } from 'vitest';

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
		},
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

export async function createContainer(schema: Buffer, port: number) {
	return await new GenericContainer('authzed/spicedb')
		.withCommand(['serve-testing', '--http-enabled', '--skip-release-check=true', '--log-level', 'debug', '--load-configs', '/schema.zaml'])
		.withResourcesQuota({ memory: 1, cpu: 1 })
		.withCopyContentToContainer([
			{
				content: schema,
				target: '/schema.zaml',
			},
		])
		.withExposedPorts(
			{
				container: port,
				host: port,
			},
			{
				container: 8081,
				host: 8081,
			},
		)
		.withWaitStrategy(Wait.forHttp('/healthz', 8081))
		.start();
}
