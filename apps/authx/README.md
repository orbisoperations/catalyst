# AUTHX Service

The Authx Service is the automation/mangement layer for Zitadel and Authzed integrations.

Althougn both Zitadel and Authzed have their own APIs, much of the user mangement bits for Zitadel we need 
to access are at the instance level and Authzed mints singular client tokens (read and write) which are not bound
to an identity. Although a read token could be made public, this also would allow for the enumeration of permissions system
and accompanying data which would be considered a data leak.

## Graphql

Since the overall Catalyst project will use graphql, this service will be the same with the exception of
the `/health` and `/status` pages which are unauthenticated and exist both in and out of the graphql endpoint.

## Testing

This project uses vitest and can be tested by running:

```bash
pnpm test
```

Testing in this project gets a little weird as the framework of choice, Honojs, has an interesting, but cool, testing pattern.

For testing, the CF Worker App is imported into the testing env and `app.request(...)` makes a direct call the various endpoints.

For the health check, this ends up with a rather simple testing pattern:

```ts
test("health check", async () => {
        const res = await app.request("/health",
            {
                method: "get",
                headers: {
                    ...testHeaders
                }
            },
            {
                ...testEnv
            }
        );
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
})
```

For graphql, things get more tricky. Mostly because in order to use this Hono testing pattern we cannot use an graphql client and must rely on HTTP POST requests.
Although there is some extra config needed, not the end of the world:

```ts
const writRes = await app.request('/graphql',
{
    method: "POST",
    headers: {
        ...testHeaders
    },
    body: JSON.stringify({
        query: "mutation AddUserToOrg($arg1: String!, $arg2: String!) {addUserToOrganization(orgId: $arg1, userId: $arg2)}",
        variables: {
            arg1: "orbisops",
            arg2: "marito"
        }
    })
},
{
    ...testEnv
});

expect(writRes.status).toBe(200);

expect(await writRes.json()).toStrictEqual({
    data: {
        addUserToOrganization: true
    }
});
```

As a follow on note, when providing paramaters to a graphql query through HTTP POST requests, the query/mutations will need to be wrapped in a named query/mutations.

```ts
body: JSON.stringify({
    // arg1 and arg 2 need the same types as the params for the mutation
    query: `mutation AddUserToOrg($arg1: String!, $arg2: String!) {
        addUserToOrganization(orgId: $arg1, userId: $arg2)
    }`,
    // these variables are substituted by the graphql endpoint
    variables: {
        arg1: "orbisops",
        arg2: "marito"
    }
})

```

### Authzed in testing

For testing, the Authzed container is set up using `testcontainer` and the `AUTHZED_TOKEN` is used to create new namespaces
within Authzed to have separation of data between tests.