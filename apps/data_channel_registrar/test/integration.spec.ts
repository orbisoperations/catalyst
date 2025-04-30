import { env, fetchMock, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataChannel, DataChannelActionResponse } from '../../../packages/schema_zod';
import { Org } from '../../../packages/schema_zod/catalyst';

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

// Need bettet mocking of the clouflare acess service on the vitest.config.ts
// Need to mock the authzed service
describe('Data Channel Registrar as Durable Object integration tests', () => {
  beforeEach(async () => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.deactivate();
    fetchMock.assertNoPendingInterceptors();
  });

  it('should create a Data Channel and return the id, also show in the DO list', async () => {
    // same user as the one in the vitest.config.ts
    const user = {
      org: 'localdevorg',
      email: 'test-user@email.com',
      token: 'admin-cf-token',
    }
    // need to create a data custodian Role for the user
    const addDataCustodianToOrg = await env.AUTHZED.addDataCustodianToOrg(
      user.org,
      user.email,
    );
    expect(addDataCustodianToOrg).toBeDefined();
    // NOTE: the id that is stored for the user in SpiceDB is the b64 encoded email
    expect(addDataCustodianToOrg.entity).toBe(
      `orbisops_catalyst_dev/organization:${user.org}#data_custodian@orbisops_catalyst_dev/user:${btoa(user.email)}`,
    );

    const createResponse: DataChannelActionResponse = await SELF.create('default1', generateDataChannels(1)[0], {
      cfToken: user.token,
    });

    expect(createResponse).toBeDefined();
    expect(createResponse.success).toBe(true);
    // @ts-ignore
    expect(createResponse.data).toBeDefined();
    // @ts-ignore
    expect(createResponse.data.id).toBeDefined();
    // @ts-ignore
    expect(createResponse.data.name).toBe('Data Channel 0');
    // @ts-ignore
    expect(createResponse.data.endpoint).toBe('https://example.com/data0');
    // @ts-ignore
    expect(createResponse.data.creatorOrganization).toBe('Fake Organization 0');
  });
});

/*
    it('requests data channel by id', async () => {
    const createdDataChannel = await giveMeADataChannel();
    const findId: string  = await createdDataChannel.json();

    const getDataChannelById = new Request ("http://dcd/"+findId, {
            method: "GET",
            headers: {"Content-Type": "application/json"}
        })
        const foundDataChannel = await SELF.fetch(getDataChannelById);

        expect(await foundDataChannel.text()).toEqual("{\"name\":\"Data Channel 1\",\"endpoint\":\"https://example.com/data\",\"creatorOrganization\":\"Fake Organization\",\"id\":\""+findId+"\"}");
        expect(foundDataChannel.status).toEqual(200);
    });

    it('update data channel by id, then retrieve it and make sure changed', async () => {
        const createdDataChannel = await giveMeADataChannel();
        const useId: string  = await createdDataChannel.json();

        const updateDataChannelById = new Request ("http://dcd/update", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                id: useId,
                name: "Data Channel 2",
                endpoint: "https://example.com/data2",
                creatorOrganization: "Ghost Organization"
            })
        })
        const alteredDataChannelId = await SELF.fetch( updateDataChannelById);
        const getAlteredDataChannelID: string = await alteredDataChannelId.json();

        const checkDataChannelById = new Request ("http://dcd/"+getAlteredDataChannelID, {
            method: "GET",
            headers: {"Content-Type": "application/json"}
        })

        const alteredDataChannel = await SELF.fetch(checkDataChannelById);
        expect(await alteredDataChannel.text()).toEqual("{\"id\":\""+useId+"\",\"name\":\"Data Channel 2\",\"endpoint\":\"https://example.com/data2\",\"creatorOrganization\":\"Ghost Organization\"}");
        expect(alteredDataChannel.status).toEqual(200);
    });

    it('delete data channel by id, then cannot retrieve', async () => {
        const shortLivedDataChannel = await giveMeADataChannel();
        const removeId: string = await shortLivedDataChannel.json();
        console.log(removeId, "MADE IT HERE>>>");
        const deleteDataChannelById = new Request ("http://dcd/delete/"+removeId, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        })
        console.log(deleteDataChannelById, "MADE IT HERE>>>");
        const success = await (await SELF.fetch( deleteDataChannelById)).json<{success: boolean}>();

        expect(success).toEqual(true);
        //
        // const checkDataChannelById = new Request ("http://dcd/"+removeId, {
        //     method: "GET",
        //     headers: {"Content-Type": "application/json"}
        // })
        //
        // const phantomDataChannel = await SELF.fetch(checkDataChannelById);
        // expect(await phantomDataChannel.text()).toEqual("o data channel found: "+removeId);
        // expect(phantomDataChannel.status).toEqual(500);
    });*/
// });
