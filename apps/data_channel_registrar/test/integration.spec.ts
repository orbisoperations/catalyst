import { SELF } from 'cloudflare:test';
import { describe, it } from 'vitest';
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

// TODO: fix this test
// Need bettet mocks for the cfToken service
// Need to mock the authzed service
describe('Data Channel Registrar as Durable Object integration tests', () => {
  it('should create a Data Channel and return the id, also show in the DO list', async () => {
    const createResponse = await SELF.create(
      'default',
      {
        accessSwitch: true,
        name: 'Data Channel 1',
        endpoint: 'https://example.com/data',
        description: 'This is a test data channel',
        creatorOrganization: 'Fake Organization',
      },
      {
        cfToken: 'test',
      },
    );


    // const dataChannelId = createResponse.json<DataChannelActionResponse>();
    // expect(dataChannelId).toMatch(
    //   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    // );
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
