import { Command} from '@oclif/core'

export default class DevIndex extends Command {

  static description = 'dev commands'

  static examples = [
    `$ oex dev
`,
  ]

  async run(): Promise<void> {
    this.log(`work with catalyst dev tools`)
  }
}
