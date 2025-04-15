import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { DataChannel, DataChannelActionResponse } from '../../../packages/schema_zod';

async function giveMeADataChannel(): Promise<Request<DataChannelActionResponse>> {
  return new Request('http://dcd/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      data: [
        {
          id: '123',
          name: 'Data Channel 1',
          endpoint: 'https://example.com/data',
          creatorOrganization: 'Fake Organization',
          accessSwitch: true,
          description: 'This is a test data channel',
        },
      ],
    }),
  });
}

function generateDataChannels(count: number = 5): DataChannel[] {
  const dataChannels: DataChannel[] = [];
  for (let i = 0; i < count; i++) {
    const dataChannel = {
      id: 'dummy-id',
      name: `Data Channel ${i}`,
      endpoint: `https://example.com/data${i}`,
      creatorOrganization: `Fake Organization ${i}`,
      accessSwitch: true,
      description: `This is a test data channel ${i}`,
    };
    dataChannels.push(dataChannel);
  }
  return dataChannels;
}

describe('Data Channel Registrar as Durable Object integration tests', () => {
  it('should be able to access the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);
    console.error('stub', stub);
    expect(stub).toBeDefined();

    const name = stub.name;
    expect(name).toBeDefined();
    expect(name).toBe('default');
  });

  it('should fetch an empty list from RegistrarWorker', async () => {
    const list = await SELF.list('default', {});
    const { success } = DataChannelActionResponse.safeParse(list);
    expect(success).toBe(true);
    expect(list.success).toBe(true);
    if (list.success) {
      expect(list.data).toEqual([]);
    }
  });

  it('should be able to access AUTHZED', async () => {
    const authzed = await env.AUTHZED.schema();
    expect(authzed).toBeDefined();
  });

  it('should be able to access USERCACHE', async () => {
    // TODO: implement better response in user cache: when external service is down, it should return a 500
    // TODO: brainstorm on how to better mock the USERCACHE Worker
    await env.USERCACHE.getUser('test');
  });

  //   it should be able to access AUTH_API
  it('should be able to access AUTH_API', async () => {
    const authapi = env.AUTHX_TOKEN_API.getPublicKey('test');
    expect(authapi).toBeDefined();
    const authapi2 = env.AUTHX_TOKEN_API.getPublicKeyJWK('test');
    expect(authapi2).toBeDefined;
  });

  it('should be able to access the RegistrarWorker', async () => {
    const registrar = await SELF.fetch('http://dcd/');
    expect(await registrar.text()).toEqual('hello from worker b');
  });

  it('should be able to create new data channel in the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    const createResponse = await stub.create(generateDataChannels(1)[0]);
    expect(createResponse).toBeDefined();

    const listResponse = await stub.list();
    expect(listResponse).toBeInstanceOf(Array);
    expect(listResponse.length).toBe(1);
  });

  it('should be able to create multiple data channels in the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    await runInDurableObject(stub, async (_, state) => {
      await state.storage.deleteAll();
    })

    const dataChannels = generateDataChannels(5);
    const createResponses = await Promise.all(dataChannels.map(stub.create));
    expect(createResponses.length).toBe(5);
  });

  it('should be able to delete all data channels in the RegistrarDO', async () => {
    // get rpc stub
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    await runInDurableObject(stub, async (_, state) => {
      await state.storage.deleteAll();
    })

    await stub.create(generateDataChannels(1)[0]);

    // list to validate that 1 exists
    const listResponse = await stub.list();
    expect(listResponse.length).toBe(1);

    // delete the data channel
    const deleteResponse = await stub.delete(listResponse[0].id);
    expect(deleteResponse).toBe(true);

    // list to validate that 0 exists
    const listResponse2 = await stub.list();
    expect(listResponse2.length).toBe(0);
  });


  it('should be able to update a data channel in the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    const dataChannel = generateDataChannels(1)[0];

    const createResponse = await stub.create(dataChannel);

    const updatedDataChannel = {
      ...dataChannel,
      name: 'Updated Data Channel',
      description: 'Updated Description',
      endpoint: 'https://example.com/data2',
      creatorOrganization: 'Updated Organization',
    };

    const updateResponse = await stub.update(updatedDataChannel);
    expect(updateResponse).toStrictEqual(updatedDataChannel);

    const getResponse = await stub.get(updatedDataChannel.id);
    expect(getResponse).toStrictEqual(updatedDataChannel);
  });
});
