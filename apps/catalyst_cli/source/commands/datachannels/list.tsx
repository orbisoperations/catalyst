import React from 'react';
import {Text} from 'ink';

import zod from 'zod';

export const args = zod.tuple([zod.string().optional().describe("organization filter")])
type Props = {
    args: zod.infer<typeof args>
};

export default function List({args}: Props) {
	return <Text>listing all data channels{args[0]? ` for ${args[0]}` : ""}</Text>;
}