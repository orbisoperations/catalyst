/* eslint-disable perfectionist/sort-objects,perfectionist/sort-object-types */
import {Args, Command} from '@oclif/core'
import { gql } from 'graphql-request'

// eslint-disable-next-line import/namespace
import { getGraphqlClient } from '../../utils/graphql.js'

export default class DataChannelDelete extends Command {
    static args = {
        organization: Args.string({description: 'data channel organization', required: true}),
        name: Args.string({description: 'data channel name', required: true}),
    }

    static description = 'delete a data channel'

    static examples = [
        `$ oex data channel delete org1 channel
        org1 channel`,
    ]

    async run(): Promise<void> {
        const {args} = await this.parse(DataChannelDelete)

        const client = getGraphqlClient()

        const request = gql`
    mutation deleteDataChannel ($organization: String!, $name: String!){
        deleteDataChannel(organization: $organization, name:$name) {
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
            deleteDataChannel: {
                organization: string
                name: string
                endpoint: string
            } | null
        }>(request, vars);

        this.log(`create response: `, response)
        if (response.deleteDataChannel === null) {
            this.log("no data channel found to delete")
        }
        else {
            this.log(`${response.deleteDataChannel.organization}/${response.deleteDataChannel.name}
      Org: ${response.deleteDataChannel.organization}
      Name: ${response.deleteDataChannel.name}
      Endpoint: ${response.deleteDataChannel.endpoint}`)
        }
    }
}