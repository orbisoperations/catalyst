import React from 'react';
import {Text} from 'ink';
import zod from 'zod';

import { GraphQLClient } from 'graphql-request'
import { getConfig } from '../../config.js'

function getGraphqlClient(): [GraphQLClient, React.JSX.Element] {
    // @ts-ignore
    const [config, configLogs] = getConfig();

    const client = new GraphQLClient(config.catalystRegistrarEndpoint)

    return [client, (<>
    {configLogs}
    <Text>Created GraphqlClient for endpoint {config.catalystRegistrarEndpoint}</Text>
    </>)]
}

export const args = zod.tuple([zod.string().optional().describe("organization filter")])
type Props = {
    args: zod.infer<typeof args>
};

export default function List({args}: Props) {
	return <Text>listing all data channels{args[0]? ` for ${args[0]}` : ""}</Text>;
}