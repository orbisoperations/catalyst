import {gql, GraphQLClient} from "graphql-request";


const DATA_CHANNEL_GATEWAY_HOST = 'http://localhost:5051';


const getToken = async (entity, claims) => {
    const tokenQuery = `
            mutation GetToken($entity: String!, $claims: [String!]) {
                sign(entity: $entity, claims: $claims)
            }
        `;

    const gqlPayload = JSON.stringify({
        query: tokenQuery,
        variables: {
            entity: entity,
            claims: claims,
        },
    });

    console.log({
        tokenRequestPayload: gqlPayload,
    });

    const response = await fetch('http://localhost:5052/graphql', {
        method: "POST",
        body: gqlPayload,
        headers: {
            'content-type': 'application/json',
        },
    });

    // Fail early
    if (response.status !== 200) {
        console.log({
            tokenGenerationFailureResponse: response,
        });
        throw new Error('getToken in tests failed')
    }

    // Parse the response and return the token
    try {
        const responseRaw = await response.text();

        console.log({responseRaw});
        const json = JSON.parse(responseRaw);
        const {data} = json;
        const token = data.sign;
        console.log({
            signedTokenForTest: token
        });

        return token;
    } catch (e) {
        console.error(e)
    }
};

export async function fetchToken() {
    const entity = 'exampleEntity';
    const claims = ['claim1', 'claim2'];
    const token = await getToken(entity, claims);
    console.log(`Got Token! ${token}`);
    return token;
}

(async () => {

    const token = new String(await fetchToken());

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


    const data = await graphqlClient.request(query, {

    }, {
        'Authorization': `Bearer ${token}`
    });
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