import React from 'react';
import {Text} from 'ink';
import zod from 'zod';

export const args = zod.tuple([zod.string().describe("organization name"), zod.string().describe("data channel name"), zod.string().describe("endpoint")]).describe("[organizaiton name] [channel name] [endpoint]")

type Props = {
    args: zod.infer<typeof args>
};

export default function Update({args}: Props) {
	return <Text>Updated endpoint for {args[0]}: {args[1]} to {args[2]}</Text>;
}