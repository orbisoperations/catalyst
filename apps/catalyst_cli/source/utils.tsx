import { GraphQLClient } from 'graphql-request'
import { getConfig } from './config.js'
import React from "react";
import { Text } from 'ink'

export interface DataChannel {
    organization: string
    name: string
    endpoint: string
}

export function getGraphqlClient(): [GraphQLClient, React.JSX.Element] {
    // @ts-ignore
    const [config, configLogs] = getConfig();

    const client = new GraphQLClient(config.catalystRegistrarEndpoint)

    return [client, (<>
    {configLogs}
    <Text>Created GraphqlClient for endpoint {config.catalystRegistrarEndpoint}</Text>
    </>)]
}
