"use server";
import { getRequestContext } from '@cloudflare/next-on-pages';
import { IssuedJWTRegistry } from '../../../../packages/schema_zod';

function getMatcher() {
	// @ts-ignore
	return getRequestContext().env.ISSUED_JWT_REGISTRY
}

export async function listIJWTRegistry(token: string) {
	const matcher = getMatcher();
	try {
		return (await matcher.list({ cfToken: token })) as IssuedJWTRegistry[];
	} catch (error) {
		console.error("List IssuedJWTRegistry Error:", error);
		return [];
	}
}
