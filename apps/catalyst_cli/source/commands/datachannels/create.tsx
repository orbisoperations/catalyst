import React from 'react';
import {Text} from 'ink';
import zod from 'zod';
//import {getGraphqlClient} from "../../utils.js"
import {getGraphqlClient} from "../../utils.js"

export const args = zod.tuple([zod.string().describe("organization name"), zod.string().describe("data channel name"), zod.string().describe("endpoint")]).describe("[organizaiton name] [channel name] [endpoint]")

type Props = {
    args: zod.infer<typeof args>
};

export default function Create({args}: Props) {
    // @ts-ignore
    const [client, clientLogs] = getGraphqlClient();

    
	return (<>
    {clientLogs}
    <Text>New data channel created for {args[0]}: {args[1]}/{args[2]}</Text>
    </>);
}