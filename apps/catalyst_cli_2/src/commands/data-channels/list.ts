/* eslint-disable perfectionist/sort-objects */
import {Args, Command} from '@oclif/core'
import { gql } from 'graphql-request'

// eslint-disable-next-line import/namespace
import { getGraphqlClient } from '../../utils/graphql.js'

export default class DataChannelList extends Command {
  static args = {
    organization: Args.string({description: 'data channel organization prefix string', required: false}),
    name: Args.string({description: 'data channel name prefix string', required: false}),
  }

  static description = 'list data channels using prefix matching'

  static examples = [
    `$ oex data channel create org chan
        org1 channel
        org2 channel
        org-test chan`,
    
    `$ oex data channel create org1 chan
        org1 channel`,

    `$ oex data channel create org-test channel
        [no results]`,
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataChannelList)

    const client = getGraphqlClient()

    const request = gql`
    query listChannels ($organization: String, $name: String){
        listDataChannels(organization: $organization, name:$name) {
            organization
            name
            endpoint
        }
    }`

    const vars = {
        organization: args.organization,
        name: args.name,
    }

    const repsonse = await client.request(request, vars);

    console.debug(`create response: `, repsonse)

    
  }
}
