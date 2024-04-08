
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
            'content-type': 'application/json'
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
            // @ts-ignore
            test: ctx.task.name,
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

fetchToken();