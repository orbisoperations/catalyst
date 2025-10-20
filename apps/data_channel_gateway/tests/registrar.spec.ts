// add git
import { env, ProvidedEnv } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

/*
READ THIS

This file tests only the durable object and not the worker now that we
do auth inside of the worker to ensure no info ever leaves the context
if a worker without being authorized.
*/
const setup = async (env: ProvidedEnv) => {
    const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
    const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);

    await stub.update({
        id: 'airplanes1',
        name: 'airplanes',
        endpoint: 'http://localhost:4001/graphql',
        accessSwitch: true,
        description: 'na',
        creatorOrganization: 'Org1',
    });

    await stub.update({
        id: 'cars1',
        name: 'cars',
        endpoint: 'http://localhost:4002/graphql',
        accessSwitch: true,
        description: 'na',
        creatorOrganization: 'Org1',
    });

    await stub.update({
        id: 'man1',
        name: 'manufacture',
        endpoint: 'http://localhost:4003/graphql',
        accessSwitch: true,
        description: 'na',
        creatorOrganization: 'Org1',
    });

    expect(await stub.list()).toHaveLength(3);
};

const teardown = async (env: ProvidedEnv) => {
    const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
    const stub = env.DATA_CHANNEL_REGISTRAR_DO.get(id);

    const list = await stub.list();
    for (const dc of list) {
        await stub.delete(dc.id);
    }

    expect(await stub.list()).toHaveLength(0);
};

describe('registrar integration tests', async () => {
    const getStub = () => {
        const id = env.DATA_CHANNEL_REGISTRAR_DO.idFromName('default');
        return env.DATA_CHANNEL_REGISTRAR_DO.get(id);
    };

    it('create data channel', async () => {
        const stub = getStub();

        const newDC = {
            name: 'testsvc',
            endpoint: 'https://example.com/graphql',
            accessSwitch: true,
            description: '',
            creatorOrganization: '',
        };

        const savedDC = await stub.create(newDC);
        expect(savedDC.id).toBeDefined();
        expect(savedDC.name).toBe(newDC.name);
        expect(savedDC.endpoint).toBe(newDC.endpoint);
    });

    it('create/get/delete data channel', async () => {
        const stub = getStub();

        const emptyDC = await stub.get('nextval');
        expect(emptyDC).toBeUndefined();
        await stub.update({
            id: 'nextval',
            name: 'nextval',
            endpoint: 'testend',
            description: 'desc',
            creatorOrganization: 'org',
            accessSwitch: true,
        });

        expect(await stub.get('nextval')).toBeDefined();

        await stub.delete('nextval');
        expect(await stub.get('nextval')).toBeUndefined();
    });

    it('list data channels', async () => {
        const stub = getStub();

        await teardown(env);

        const newDC = {
            name: 'testsvc',
            endpoint: 'https://example.com/graphql',
            accessSwitch: true,
            description: '',
            creatorOrganization: '',
        };

        const savedDC = await stub.create(newDC);
        expect(await stub.list()).toHaveLength(1);
        const savedDC2 = await stub.create({
            name: 'testsvc2',
            endpoint: 'https://example.com/graphql',
            accessSwitch: false,
            description: '',
            creatorOrganization: '',
        });
        expect(await stub.list()).toHaveLength(2);

        // test access switch
        const listOnlyTrue = await stub.list(true);
        expect(listOnlyTrue).toHaveLength(1);

        await stub.delete(savedDC.id);
        await stub.delete(savedDC2.id);

        await setup(env);
        expect(await stub.list()).toHaveLength(3);
        await teardown(env);
        expect(await stub.list()).toHaveLength(0);
    });
});
