const token = await getToken("Org1", ["airplanes"]);

const response = await fetch('https://data-channel-gateway/graphql', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'content-type': 'application/json',
    },
    body: JSON.stringify({
        // Query that resolves the available queries of the schema
        query: `{
            __type(name: "Query") {
                name
                fields {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
              }
          }`
    })
});

const payloadType = {
    data: {
        __type: {
            name,
            fields
        }
    }
};

const responsePayload = await response.json();

console.log({responsePayload})
console.log(JSON.stringify(responsePayload.data))

await fetch('http://localhost:5051', {
    method: "GET",
    body
})