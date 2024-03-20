import {describe, it, expect} from 'bun:test';
import {gql, GraphQLClient} from 'graphql-request';


describe('test', () => {
    const client = new GraphQLClient("http://localhost:5050/graphql", { errorPolicy: 'all' });
  it('Creates a data channel with the api', async () => {

      const mutation = gql`
          mutation CreateDataChannel($input: DataChannelInput!) {
              createDataChannel(
              input:  $input
          )  {id}
          }
      `;

      const variables = {
          input: {
              name: "Example Data Channel",
              endpoint: "https://example.com/data",
              organization: "Example Organization"
          }
      };




      const data = await client.request(mutation, variables)
      expect(data).toEqual({createDataChannel: {id: expect.any(String)}});
  });

    it('requests data channels from the api', async () => {
        const query = gql`
            query {
                allDataChannels {
                    id
                    name
                    endpoint
                    organization
                }
            }
        `;

        const data: any = await client.request(query);
        expect(data.allDataChannels.length).toBeGreaterThan(0);
    })


});
