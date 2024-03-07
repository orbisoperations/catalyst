import { gql, ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import convert from 'xml-js';

// Note: The use of axios with HttpLink as shown might not work out of the box because HttpLink expects a fetch-compatible API. You might need to adjust this part or use a native fetch implementation.

const createClient = (context: {
  env: {
    MY_SERVICE: Fetcher;
  },
}) => {
  // For HttpLink, ensure you're using a fetch-compatible API. If axios is a hard requirement, consider wrapping axios calls in a fetch-like function.
  const httpLink = new HttpLink({
    uri: '[your-graphql-endpoint-here]',
    fetch:
    // Removed the fetch: axios, as this might not be compatible without additional setup
  });

  // Create a WebSocket link
  const wsLink = new WebSocketLink({
    uri: `[your-websocket-endpoint-here]`,
    options: {
      reconnect: true
    }
  });

  const link = wsLink.concat(httpLink);

  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });

  return client;
};

const graphqlToCotXML = async () => {
  const client = createClient();

  const query = gql`
    subscription {
      [YourGraphQlSubscriptionHere]
    }
  `;

  // Use client.subscribe instead of client.query to setup real-time updates
  const observable = client.subscribe({query});
  const subscription = observable.subscribe(({data}) => {
    const xmlJsObject = {
      _declaration: {
        _attributes: {
          version: '1.0',
          encoding: 'utf-8',
        },
      },
      // Placeholder for COT XML, replace with your structure as required
      cot: {
        event: data,
      }
    };

    const cotXml = convert.js2xml(xmlJsObject, { compact: true });

    // Process cotXml as needed in your real-time context
  });

  // Remember to unsubscribe when done
  // subscription.unsubscribe();
};