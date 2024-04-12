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
        // const success = await SELF.fetch( deleteDataChannelById);

        // expect(await success.json()).toEqual(true);
        //
        // const checkDataChannelById = new Request ("http://dcd/"+removeId, {
        //     method: "GET",
        //     headers: {"Content-Type": "application/json"}
        // })
        //
        // const phantomDataChannel = await SELF.fetch(checkDataChannelById);
        // expect(await phantomDataChannel.text()).toEqual("o data channel found: "+removeId);
        // expect(phantomDataChannel.status).toEqual(500);
    });

})
