'use server';
import { getJWTRegistry, IssuedJWTRegistry } from '@catalyst/schemas';
import { getCloudflareEnv, getCFAuthorizationToken } from '@/app/lib/server-utils';

export async function listIJWTRegistry() {
    const env = getCloudflareEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.list({ cfToken: await getCFAuthorizationToken() });
    if (!resp.success) {
        console.error('list ijwt registry failed:', resp.error);
        throw new Error(`list ijwt registry failed: ${JSON.stringify(resp.error)}`);
    }
    return resp.data;
}

export async function getIJWTRegistry(id: string) {
    const env = getCloudflareEnv();
    const registry = getJWTRegistry(env);
    const getResult = await registry.get({ cfToken: await getCFAuthorizationToken() }, id);
    if (!getResult.success) {
        console.error('get ijwt registry failed:', getResult.error);
        throw new Error(`get ijwt registry failed: ${JSON.stringify(getResult.error)}`);
    }
    return getResult.data;
}

export async function createIJWTRegistry(data: IssuedJWTRegistry) {
    const env = getCloudflareEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.create({ cfToken: await getCFAuthorizationToken() }, data);
    if (!resp.success) {
        console.error('create ijwt registry failed:', resp.error);
        throw new Error(`create ijwt registry failed: ${JSON.stringify(resp.error)}`);
    }
    return resp.data;
}

export async function updateIJWTRegistry(data: IssuedJWTRegistry) {
    const env = getCloudflareEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.update({ cfToken: await getCFAuthorizationToken() }, data);
    if (!resp.success) {
        console.error('update ijwt registry failed:', resp.error);
        throw new Error(`update ijwt registry failed: ${JSON.stringify(resp.error)}`);
    }
    return resp.data;
}

export async function deleteIJWTRegistry(id: string) {
    const env = getCloudflareEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.delete({ cfToken: await getCFAuthorizationToken() }, id);
    if (!resp) {
        throw new Error('delete ijwt registry failed');
    }
    return resp;
}
