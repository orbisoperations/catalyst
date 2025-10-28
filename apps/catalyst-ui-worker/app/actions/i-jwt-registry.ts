'use server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { CloudflareEnv, getJWTRegistry, IssuedJWTRegistry } from '@catalyst/schemas';

function getEnv(): CloudflareEnv {
    return getCloudflareContext().env as CloudflareEnv;
}

export async function listIJWTRegistry(token: string) {
    const env = getEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.list({ cfToken: token });
    if (!resp.success) {
        console.error('list ijwt registry failed:', resp.error);
        throw new Error(`list ijwt registry failed: ${JSON.stringify(resp.error)}`);
    }
    return resp.data;
}

export async function getIJWTRegistry(token: string, id: string) {
    const env = getEnv();
    const registry = getJWTRegistry(env);
    const getResult = await registry.get({ cfToken: token }, id);
    if (!getResult.success) {
        console.error('get ijwt registry failed:', getResult.error);
        throw new Error(`get ijwt registry failed: ${JSON.stringify(getResult.error)}`);
    }
    return getResult.data;
}

export async function createIJWTRegistry(token: string, data: IssuedJWTRegistry) {
    const env = getEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.create({ cfToken: token }, data);
    if (!resp.success) {
        console.error('create ijwt registry failed:', resp.error);
        throw new Error(`create ijwt registry failed: ${JSON.stringify(resp.error)}`);
    }
    return resp.data;
}

export async function updateIJWTRegistry(token: string, data: IssuedJWTRegistry) {
    const env = getEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.update({ cfToken: token }, data);
    if (!resp.success) {
        console.error('update ijwt registry failed:', resp.error);
        throw new Error(`update ijwt registry failed: ${JSON.stringify(resp.error)}`);
    }
    return resp.data;
}

export async function deleteIJWTRegistry(token: string, id: string) {
    const env = getEnv();
    const registry = getJWTRegistry(env);
    const resp = await registry.delete({ cfToken: token }, id);
    if (!resp) {
        throw new Error('delete ijwt registry failed');
    }
    return resp;
}
