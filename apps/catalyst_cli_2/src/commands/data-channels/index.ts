import { Command} from '@oclif/core'

export default class DataChannelIndex extends Command {

  static description = 'Say hello'

  static examples = [
    `$ oex data-channels
`,
  ]

  async run(): Promise<void> {
    this.log(`work with catalyst data channels`)
  }
}
