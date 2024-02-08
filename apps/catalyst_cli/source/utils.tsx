import { GraphQLClient } from 'graphql-request'
import { getConfig } from './config'
import React from "react";
import { Text } from 'ink'

export function getGraphqlClient(): [GraphQLClient, React.JSX.Element] {
    // @ts-ignore
    const [config, configLogs] = getConfig();

    const client = new GraphQLClient(config.catalystRegistrarEndpoint)

    return [client, (<>
    {configLogs}
    <Text>Created GraphqlClient for endpoint {config.catalystRegistrarEndpoint}</Text>
    </>)]
}