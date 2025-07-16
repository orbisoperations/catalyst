import {GraphQLClient} from 'graphql-request'

import {getConfig} from './config.js'

export interface DataChannel {
  endpoint: string
  name: string
  organization: string
}

export function getGraphqlClient(): GraphQLClient {
  const config = getConfig()

  const client = new GraphQLClient(config.catalystRegistrarEndpoint)

  return client
}
