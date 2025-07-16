import {Args, Command} from '@oclif/core'
import {gql} from 'graphql-request'

import {getGraphqlClient} from '../../utils/graphql.js'
import {displayTable} from '../../utils/tables.js'

export default class DataChannelList extends Command {
  static args = {
    organization: Args.string({description: 'data channel organization prefix string', required: false}),
    name: Args.string({description: 'data channel name prefix string', required: false}),
  }

  static description = 'list data channels using prefix matching'

  static examples = [
    `$ oex data-channels list
     Organization Name    Endpoint
     ──────────── ─────── ────────────────
     test         test    http://test.com/
     org1         channel http://test.com/
     org2         channel http://test.com/
     org-test     chan    http://test.com/`,

    `$ oex data-channels list org1 chan
     Organization Name    Endpoint
     ──────────── ─────── ────────────────
     org1         channel http://test.com/`,
    `$ oex data-channels list o channel
     Organization Name    Endpoint
     ──────────── ─────── ────────────────
     org1         channel http://test.com/
     org2         channel http://test.com/`,

    `$ oex data-channels list o channels
     no data-channels found`,
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataChannelList)

    const client = getGraphqlClient()

    const request = gql`
      query listChannels($organization: String, $name: String) {
        listDataChannels(organization: $organization, name: $name) {
          organization
          name
          endpoint
        }
      }
    `

    const vars = {
      organization: args.organization,
      name: args.name,
    }

    const response = await client.request<{
      listDataChannels: {
        organization: string
        name: string
        endpoint: string
      }[]
    }>(request, vars)

    this.debug(`create response: `, response)

    await displayTable(response.listDataChannels)
  }
}
