/* eslint-disable perfectionist/sort-objects,perfectionist/sort-object-types */
import {Args, Command} from '@oclif/core'
import { gql } from 'graphql-request'

// eslint-disable-next-line import/namespace
import { getGraphqlClient } from '../../utils/graphql.js'
import {displayTable} from "../../utils/tables.js";

export default class DataChannelRead extends Command {
    static args = {
        organization: Args.string({description: 'data channel organization prefix string', required: true}),
        name: Args.string({description: 'data channel name prefix string', required: true}),
    }

    static description = 'get a data channel'

    static examples = [
        `$ oex data channel get org1 channel
        org1 channel`,
    ]

    async run(): Promise<void> {
        const {args} = await this.parse(DataChannelRead)

        const client = getGraphqlClient()

        const request = gql`
    query getDataChannel ($organization: String, $name: String){
        getDataChannel(organization: $organization, name:$name) {
            organization
            name
            endpoint
        }
    }`

        const vars = {
            organization: args.organization,
            name: args.name,
        }

        const response = await client.request<{
            getDataChannel: {
                organization: string
                name: string
                endpoint: string
            } | null
        }>(request, vars);

        this.debug(`create response: `, response)
        if (response.getDataChannel === null) {
            this.log("no data channels found")
        } else {
            displayTable([response.getDataChannel])
        }
    }
}