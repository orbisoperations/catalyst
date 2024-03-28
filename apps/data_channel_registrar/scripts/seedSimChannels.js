import {gql, GraphQLClient} from "graphql-request";

const DATA_CHANNEL_REGISTRAR_HOST = "http://localhost:5050";
const fakeOrganization = "4b5cc9f6-1636-4ded-b763-d65c1dfd9fbd";

(async () => {
    const simChannels = {
        cars: {
            id: undefined,
            name: "cars",
            endpoint: "http://localhost:4002/graphql",
            creatorOrganization: fakeOrganization
        },
        manufacturers: {
            id: undefined,
            name: "manufacturers",
            endpoint: "http://localhost:4003/graphql",
            creatorOrganization: fakeOrganization
        },
        airplanes: {
            id: undefined,
            name: "airplanes",
            endpoint: "http://localhost:4001/graphql",
            creatorOrganization: fakeOrganization
        },
    };

    const client = new GraphQLClient(`${DATA_CHANNEL_REGISTRAR_HOST}/graphql`);

    const createChannel = async (name, endpoint, creator) => {
        const mutation = gql`
      mutation CreateDataChannel($input: DataChannelInput!) {
        createDataChannel(input: $input) {
          id
        }
      }
    `;
        const variables = {
            input: {
                name,
                endpoint,
                creatorOrganization: creator,
            },
        };
        const {createDataChannel: createdDataChannel} = await client.request(mutation, variables);

        return createdDataChannel.id;
    };

    // Loop over the channels and create them.
    await Promise.all(Object.keys(simChannels).map(async (key) => {
        const channel = simChannels[key];
        simChannels[key].id = await createChannel(key, channel.endpoint, channel.creatorOrganization);
    })).catch(console.error);

    console.log(simChannels);
    console.log('Successfully seeded simulated Data Channels into the Data Channel Registrar.');
})();