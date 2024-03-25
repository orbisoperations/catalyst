const DATA_CHANNEL_GATEWAY_HOST = 'http://localhost:5051';

const {gql, GraphQLClient} = require('graphql-request');

(async () => {

    const graphqlClient = new GraphQLClient(`${DATA_CHANNEL_GATEWAY_HOST}/graphql`);

    // TODO: Execute some queries against the schema
    const response = await fetch(DATA_CHANNEL_GATEWAY_HOST + '/graphql', {
        method: 'GET',
    });

    const query = gql`
        query ExampleFullSchemaQuery {
            airplanes {
                manufacture
            }
            cars {
                manufacture
            }
            manufacture(id: 1) {
                name
            }
            manufactures {
                id
                name
            }
        }
    `;


    const data = await graphqlClient.request(query);
    /* SAMPLE EXPECTED RESPONSE
     {
          apiResponse: {
            cars: [ [Object], [Object] ],
            airplanes: [ [Object], [Object] ],
            manufacture: { name: 'Tesla' },
            manufactures: [ [Object], [Object], [Object], [Object], [Object] ]
          }
      }

     */

    console.log({apiResponse: data, status: response.status});
})();