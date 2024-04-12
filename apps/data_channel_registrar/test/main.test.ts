import {SELF} from "cloudflare:test";
import {describe, it, expect, beforeAll} from "vitest";
import {Logger} from "tslog";

const logger = new Logger();

describe("Data Channel Registrar as Durable Object integration tests", () => {

  const giveMeADataChannel = async () => {
      const request = new Request("https://dcd/create", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
              name: "Data Channel 1",
              endpoint: "https://example.com/data",
              creatorOrganization: "Fake Organization"
          })
      })
      const response = await SELF.fetch(request);
     return  response;
  }

    it('should fetch an empty array DO', async () => {
        const listResponse = await SELF.fetch("http://dcd/list");
        const responseText = await listResponse.text()
        expect(listResponse.status).toEqual(200);
        expect(responseText).toEqual("[]");
    }),


    it('should create a Data Channel and return the id, also show in the DO list', async () => {
        const createResponse = await giveMeADataChannel();
        const dataChannelId: string = await createResponse.json();

        expect(createResponse.status).toEqual(200);
        expect(dataChannelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

        const listResponse = await SELF.fetch("http://dcd/list");
        const responseText = await listResponse.text()
        expect(listResponse.status).toEqual(200);
        expect(responseText).toEqual("[{\"name\":\"Data Channel 1\",\"endpoint\":\"https://example.com/data\",\"creatorOrganization\":\"Fake Organization\",\"id\":\""+dataChannelId+"\"}]");
    })

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


})


//
//   it('updates data channel by id', async () => {
//     const data = await giveMeADataChannel();
//     const sampleId = data.createDataChannel.id;
//     const accessSwitchUpdate = true;
//     const changedName = 'Help him, Help him, Help him';
//     const inputDataChannel = { id: sampleId, name: changedName, accessSwitch: accessSwitchUpdate };
//
//     const mutation = gql`
//       mutation UpdateDataChannel($input: DataChannelInput!) {
//         updateDataChannel(input: $input) {
//           accessSwitch
//           name
//           endpoint
//           creatorOrganization
//         }
//       }
//     `;
//
//     const myDataChannel: {
//         updateDataChannel: {
//           name: string;
//           accessSwitch: boolean;
//           endpoint: string;
//           creatorOrganization: string;
//         };
//     } = await client.request(mutation, { input: inputDataChannel });
//     expect(myDataChannel.updateDataChannel.name).toEqual(changedName);
//     expect(myDataChannel.updateDataChannel.accessSwitch).toEqual(accessSwitchUpdate);
//     expect(myDataChannel.updateDataChannel.endpoint).toEqual('https://example.com/data');
//     expect(myDataChannel.updateDataChannel.creatorOrganization).toEqual('Fake Organization');
//   });
//
//   it('requests data channels from the api', async () => {
//     const query = gql`
//       query {
//         allDataChannels {
//           id
//           accessSwitch
//           name
//           endpoint
//           creatorOrganization
//         }
//       }
//     `;
//
//     const data: {
//         allDataChannels: {
//           id: string;
//           accessSwitch: boolean;
//           name: string;
//           endpoint: string;
//           creatorOrganization: string;
//         }[];
//     } = await client.request(query);
//     expect(data.allDataChannels.length).toBeGreaterThan(0);
//   });
//
//   it('deletes a data channel by id', async () => {
//     const data = await giveMeADataChannel();
//     const sampleId = data.createDataChannel.id;
//     const mutation = gql`
//       mutation DeleteDataChannel($id: String!) {
//         deleteDataChannel(id: $id)
//       }
//     `;
//
//     const result: {
//         deleteDataChannel: boolean;
//     } = await client.request(mutation, { id: sampleId });
//     expect(result.deleteDataChannel).toEqual(true);
//   });
// });
