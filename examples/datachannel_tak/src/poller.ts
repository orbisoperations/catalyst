import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

// Create an Apollo client instance
const client = new ApolloClient({
  uri: 'https://your-graphql-endpoint.com/graphql',
  cache: new InMemoryCache(),
});

getToken

// Define the preset query
const PRESET_QUERY = gql`
    query {
        airplanes {
            id
            mgrs
        }
        cars {
            id
            mgrs
        }
    }
`;

// Function to poll the GraphQL endpoint
async function pollGraphQLEndpoint() {
  try {
    const result = await client.query({
      query: PRESET_QUERY,
      fetchPolicy: 'network-only',
    });

    // Process the result data
    console.log('Polling result:', result.data);

    // Schedule the next poll after a certain interval (e.g., 5 seconds)
    setTimeout(pollGraphQLEndpoint, 5000);
  } catch (error) {
    console.error('Error polling GraphQL endpoint:', error);
  }
}

// Start polling the GraphQL endpoint
pollGraphQLEndpoint();