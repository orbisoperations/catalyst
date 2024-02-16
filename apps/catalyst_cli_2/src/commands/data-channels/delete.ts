/* eslint-disable perfectionist/sort-objects,perfectionist/sort-object-types */
import {Args, Command, ux} from '@oclif/core'
import { gql } from 'graphql-request'

// eslint-disable-next-line import/namespace
import { getGraphqlClient } from '../../utils/graphql.js'
import {displayTable} from "../../utils/tables.js";

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

        // search for data channel first
        const readRequest = gql`
    query getDataChannel ($organization: String, $name: String){
        getDataChannel(organization: $organization, name:$name) {
            organization
            name
            endpoint
        }
    }`

        const readVars = {
            organization: args.organization,
            name: args.name,
        }

        const readResp = await client.request<{
            getDataChannel: {
                organization: string
                name: string
                endpoint: string
            } | null
        }>(readRequest, readVars);

        if (readResp.getDataChannel === null) {
            this.log("no data channels found ")
            this.exit(0)
        }

        displayTable([readResp.getDataChannel!])

        const approvalToDelete = await ux.prompt('delete this data-channel? (y/n)')

        if (approvalToDelete.toLowerCase() !== "y") {
            this.exit(0)
        }

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

        this.debug(`create response: `, response)
        if (response.deleteDataChannel === null) {
            this.log("no data channel found to delete")
        }
        else {
            displayTable([response.deleteDataChannel])
        }
    }
}