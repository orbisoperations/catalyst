import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataChannel, DataChannelActionResponse } from '../../../packages/schema_zod';
import { TEST_ORG_ID, validUsers } from './utils/authUtils';

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
  beforeEach(async () => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.deactivate();
    fetchMock.assertNoPendingInterceptors();
  });

  it('should be able to access the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    expect(stub).toBeDefined();

    const name = stub.name;
    expect(name).toBeDefined();
    expect(name).toBe('default');
  });

  it('should fetch an empty list from RegistrarWorker', async () => {
    const list = await SELF.list('test1', {});
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
    const nonExistentUser = await env.USERCACHE.getUser('test');
    expect(nonExistentUser).toBeUndefined();

    const existentUser = await env.USERCACHE.getUser('cf-org-admin-token');
    expect(existentUser).toBeDefined();
  });

  //   it should be able to access AUTH_API
  it('should be able to access AUTH_API', async () => {
    const authapi = await env.AUTHX_TOKEN_API.getPublicKey('test');
    expect(authapi).toBeDefined();
    const authapi2 = await env.AUTHX_TOKEN_API.getPublicKeyJWK('test');
    expect(authapi2).toBeDefined();
  });

  it('should be able to access the RegistrarWorker', async () => {
    const registrar = await SELF.fetch('http://dcd/');
    expect(await registrar.text()).toEqual('hello from worker b');
  });

  it('should be able to create new data channel in the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    let listResponse = await stub.list();
    expect(listResponse).toBeInstanceOf(Array);
    expect(listResponse.length).toBe(0);

    const createResponse = await stub.create(generateDataChannels(1)[0]);
    expect(createResponse).toBeDefined();

    listResponse = await stub.list();
    expect(listResponse).toBeInstanceOf(Array);
    expect(listResponse.length).toBe(1);
  });

  it('should be able to create multiple data channels in the RegistrarDO', async () => {
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

    const dataChannels = generateDataChannels(5);
    const createResponses = await Promise.all(dataChannels.map(stub.create));
    expect(createResponses.length).toBe(5);
  });

  it('should be able to delete all data channels in the RegistrarDO', async () => {
    // get rpc stub
    const id = env.DO.idFromName('default');
    const stub = env.DO.get(id);

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
    expect(createResponse).toBeDefined();

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

  it('invalid user token', async () => {
    const removeResult = await SELF.remove('default', 'dummy-data-channel-id', {
      cfToken: 'bad-cftoken',
    });
    expect(removeResult.success).toBe(false);
    if (!removeResult.success) {
      expect(removeResult.error).toBe('catalyst unable to validate user token');
    }
  });

  it('accessing non existent data channel: exists in authzed but not in DO', async () => {
    // add user to custodian role
    const user = validUsers['cf-custodian-token'];
    const addUserToCustodianRole = await env.AUTHZED.addDataCustodianToOrg(TEST_ORG_ID, user.email);
    expect(addUserToCustodianRole).toBeDefined();

    // add data channel to org
    const addDataChannelToOrg = await env.AUTHZED.addDataChannelToOrg(
      TEST_ORG_ID,
      'dummy-data-channel-id',
    );
    expect(addDataChannelToOrg).toBeDefined();
    // add org to data channel
    const addOrgToDataChannel = await env.AUTHZED.addOrgToDataChannel(
      'dummy-data-channel-id',
      TEST_ORG_ID,
    );
    expect(addOrgToDataChannel).toBeDefined();

    const readResult = await SELF.read('default', 'dummy-data-channel-id', {
      cfToken: 'cf-custodian-token',
    });
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      expect(readResult.error).toBe('catalyst unable to find data channel');
    }
  });
});
