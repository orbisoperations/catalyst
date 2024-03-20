import {describe, it, expect} from 'bun:test';
import {gql, GraphQLClient} from 'graphql-request';


describe('test', () => {
    const client = new GraphQLClient("http://localhost:5050/graphql", { errorPolicy: 'all' });
    async function giveMeADataChannel() {
        const mutation = gql`
            mutation CreateDataChannel($input: DataChannelInput!) {
                createDataChannel(
                    input:  $input
                )  {id}
            }
        `;

        const variables = {
            input: {
                name: "Use Me, Use Me",
                endpoint: "https://example.com/data",
                creatorOrganization: "Fake Organization"
            }
        };
        const data: any = await client.request(mutation, variables)

        return data;
    }

  it('Creates a data channel with the api', async () => {

      const data = await giveMeADataChannel()
      expect(data).toEqual({createDataChannel: {id: expect.any(String)}});
  });

    it('requests data channel by id', async () => {
        const data = await giveMeADataChannel()
        const sampleId = data.createDataChannel.id;
        const query = gql`
            query DataChannelById($id: String!) {
                dataChannelById(id: $id) {
                    id
                    name
                    endpoint
                    creatorOrganization
                }
            }`;

        const myDataChannel: any = await client.request(query, {id: sampleId})
        expect(data).toEqual({createDataChannel: {id: expect.any(String)}});
    });

    it('requests data channels from the api', async () => {
        const query = gql`
            query {
                allDataChannels {
                    id
                    name
                    endpoint
                    creatorOrganization
                }
            }
        `;

        const data: any = await client.request(query);
        expect(data.allDataChannels.length).toBeGreaterThan(0);
    })


});
