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

export const args = zod.tuple([zod.string().describe("organization name"), zod.string().describe("data channel name")]).describe("[organizaiton name] [channel name]")

type Props = {
    args: zod.infer<typeof args>
};

export default function Read({args}: Props) {
	return <Text>reading metadata for {args[0]} data channel: {args[1]}</Text>;
}