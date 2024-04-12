// import {ApolloClient, InMemoryCache, gql, DocumentNode} from '@apollo/client';
//
// // Define the Poller class
// export class Poller {
//   private client: ApolloClient<unknown>;
//   private static readonly PRESET_QUERY = gql`
//       query {
//           airplanes {
//               id
//               mgrs
//           }
//           cars {
//               id
//               mgrs
//           }
//       }
//   `;
//
//   query: DocumentNode;
//
//   constructor(url: string, query?: DocumentNode) {
//     this.client = new ApolloClient({
//       uri: url,
//       cache: new InMemoryCache(),
//     });
//
//     this.query = query ?? Poller.PRESET_QUERY;
//   }
//
//   async pollGraphQLEndpoint() {
//     try {
//       const result = await this.client.query({
//         query: Poller.PRESET_QUERY,
//         fetchPolicy: 'network-only',
//       });
//
//       // Process the result data
//       console.log('Polling result:', result.data);
//
//       // Schedule the next poll after a certain interval (e.g., 5 seconds)
//       setTimeout(() => this.pollGraphQLEndpoint(), 5000);
//     } catch (error) {
//       console.error('Error polling GraphQL endpoint:', error);
//     }
//   }
//
//     // Interface to start polling the GraphQL endpoint
//   startPolling() {
//     this.pollGraphQLEndpoint();
//   }
// }
//
// // Create an instance of Poller and start polling
// const poller = new Poller();
// poller.startPolling();