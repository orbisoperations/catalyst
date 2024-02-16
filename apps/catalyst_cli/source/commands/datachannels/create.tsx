import React from 'react';
import {Text} from 'ink';
import zod from 'zod';
//import {getGraphqlClient} from "../../utils.js"
import {getGraphqlClient, DataChannel} from "../../utils.js"
import { request, gql } from 'graphql-request'


export const args = zod.tuple([zod.string().describe("organization name"), zod.string().describe("data channel name"), zod.string().describe("endpoint")]).describe("[organizaiton name] [channel name] [endpoint]")

type Props = {
    args: zod.infer<typeof args>
};

export default async function Create({args}: Props) {
    // @ts-ignore
    const [client, clientLogs] = getGraphqlClient();

    const creategql = gql`
        mutation {
            upsertDataChannel(org: "name", name:"name", endpoint: "name") {
            organization
            name
            endpoint
            }
    }`

    interface data {
        upsertDataChannel: DataChannel
    }
    const upsertData = await client.request<data>(creategql)

	return (<>
    {clientLogs}
    <Text>New data channel created for {args[0]}: {args[1]}/{args[2]}</Text>
    </>);
}