/* eslint-disable perfectionist/sort-object-types */
/* eslint-disable perfectionist/sort-objects */
import {Args, Command} from '@oclif/core'
import { gql } from 'graphql-request'

// eslint-disable-next-line import/namespace
import { getGraphqlClient } from '../../utils/graphql.js'

export default class DataChannelCreate extends Command {
  static args = {
    organization: Args.string({description: 'data channel organization', required: true}),
    name: Args.string({description: 'data channel name', required: true}),
    endpoint: Args.url({description: 'data channel endpoint', required: true}),
  }

  static description = 'upsert a data channel'

  static examples = [
    `$ oex data channel upsert [organization] [name] [endpoint]
`,
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataChannelCreate)

    const client = getGraphqlClient()

    const request = gql`
    mutation upsertChannel($organization: String!, $name: String!, $endpoint: String!){
        upsertDataChannel(organization: $organization, name: $name, endpoint: $endpoint) {
            organization
            name
            endpoint
        }
    }`

    const vars = {
      organization: args.organization,
      name: args.name,
      endpoint: args.endpoint
    }

    const repsonse = await client.request<{upsertDataChannel: {
      organization: string
      name: string
      endpoint: string
    }}>(request, vars);

    this.debug(`upsert response: `, repsonse)

    this.log(`successfully upserted ${repsonse.upsertDataChannel.organization}/${repsonse.upsertDataChannel.name}@${repsonse.upsertDataChannel.endpoint}`)
  }
}
