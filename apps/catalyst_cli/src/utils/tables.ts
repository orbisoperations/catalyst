import {ux} from '@oclif/core'

import {DataChannel} from './graphql.js'

export function displayTable(dataChannels: DataChannel[]) {
  if (dataChannels.length === 0) {
    ux.log('no data-channels found')
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ux.table(dataChannels as any, {
      organization: {},
      name: {},
      endpoint: {},
    })
  }
}
