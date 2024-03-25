import { describe, it, expect } from 'bun:test';
import { gql, GraphQLClient } from 'graphql-request';

describe('test', () => {
  const client = new GraphQLClient('http://localhost:5050/graphql', {
    errorPolicy: 'all',
  });
  const giveMeADataChannel = async () => {
    const mutation = gql`
      mutation CreateDataChannel($input: DataChannelInput!) {
        createDataChannel(input: $input) {
          id
        }
      }
    `;

    const variables = {
      input: {
        name: 'Use Me, Use Me',
        endpoint: 'https://example.com/data',
        creatorOrganization: 'Fake Organization',
      },
    };
    const data: {createDataChannel: {
        id: string;
      }} = await client.request(mutation, variables);

    return data;
  };

  it('Creates a data channel with the api', async () => {
    const data = await giveMeADataChannel();
    expect(data).toEqual({ createDataChannel: { id: expect.any(String) } });
  });

  it('requests data channel by id', async () => {
    const data = await giveMeADataChannel();
    const sampleId = data.createDataChannel.id;
    const query = gql`
      query DataChannelById($id: String!) {
        dataChannelById(id: $id) {
          id
          name
          endpoint
          creatorOrganization
        }
      }
    `;

    const myDataChannel: {
        dataChannelById: {
          id: string;
          name: string;
          endpoint: string;
          creatorOrganization: string;
        };
    } = await client.request(query, { id: sampleId });
    expect(myDataChannel.dataChannelById.id).toEqual(sampleId);
  });

  it('updates data channel by id', async () => {
    const data = await giveMeADataChannel();
    const sampleId = data.createDataChannel.id;
    const changedName = 'Help him, Help him, Help him';
    const inputDataChannel = { id: sampleId, name: changedName };

    const mutation = gql`
      mutation UpdateDataChannel($input: DataChannelInput!) {
        updateDataChannel(input: $input) {
          name
          endpoint
          creatorOrganization
        }
      }
    `;

    const myDataChannel: {
        updateDataChannel: {
          name: string;
          endpoint: string;
          creatorOrganization: string;
        };
    } = await client.request(mutation, { input: inputDataChannel });
    expect(myDataChannel.updateDataChannel.name).toEqual(changedName);
    expect(myDataChannel.updateDataChannel.endpoint).toEqual('https://example.com/data');
    expect(myDataChannel.updateDataChannel.creatorOrganization).toEqual('Fake Organization');
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

    const data: {
        allDataChannels: {
          id: string;
          name: string;
          endpoint: string;
          creatorOrganization: string;
        }[];
    } = await client.request(query);
    expect(data.allDataChannels.length).toBeGreaterThan(0);
  });

  it('deletes a data channel by id', async () => {
    const data = await giveMeADataChannel();
    const sampleId = data.createDataChannel.id;
    const mutation = gql`
      mutation DeleteDataChannel($id: String!) {
        deleteDataChannel(id: $id)
      }
    `;

    const result: {
        deleteDataChannel: boolean;
    } = await client.request(mutation, { id: sampleId });
    expect(result.deleteDataChannel).toEqual(true);
  });
});
