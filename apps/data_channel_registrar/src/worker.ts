import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import {DataChannel} from "../../../packages/schema_zod"

export type Env = Record<string, string> & {
  DO: DurableObjectNamespace<Registrar>;
};

export default class RegistrarWorker extends WorkerEntrypoint<Env> {
  async create(doNamespace: string, dataChannel: Omit<DataChannel, "id">): Promise<DataChannel> {
    const doId = this.env.DO.idFromName(doNamespace)
    const stub = this.env.DO.get(doId)
    return stub.create(dataChannel)
  }
  async update(doNamespace: string, dataChannel: DataChannel){
    const doId = this.env.DO.idFromName(doNamespace)
    const stub = this.env.DO.get(doId)
    return stub.update(dataChannel)
  }
  async get(doNamespace: string, dataChannelId: string): Promise<DataChannel | undefined>{
    const doId = this.env.DO.idFromName(doNamespace)
    const stub = this.env.DO.get(doId)
    return stub.get(dataChannelId)
  }
  async list(doNamespace: string, filterClaims?: string[]) {
    const doId = this.env.DO.idFromName(doNamespace)
    const stub = this.env.DO.get(doId)
    const list = await stub.list()
    if (filterClaims) {
      const filtered = list.filter(dc => {
        return filterClaims.includes(dc.name)
      })

      return filtered
    }
    return list
  }
  delete(doNamespace: string, dataChannelID: string){
    const doId = this.env.DO.idFromName(doNamespace)
    const stub = this.env.DO.get(doId)
    return stub.delete(dataChannelID)
  }
}

export class Registrar extends  DurableObject {
  async list(){
    const allChannels = await this.ctx.storage.list<DataChannel>()
    return Array.from(allChannels.entries())
      .map(([, value]) => value)
      .filter(dc => dc.accessSwitch)
  }

  async get(id: string) {
    const dc = await this.ctx.storage.get<DataChannel>(id)
    return dc?.accessSwitch ? dc : undefined
      //TODO: implement claims
      // const {claims} = await c.req.json<{claims?: string[]}>()

      //TODO: implement claims
      // if (claims && dataChannel) {
      //     const filtered = claims.includes(dataChannel.id)
      //     return c.json(filtered,
      //         200)
      // } else {
      //     return c.json(`No data channel found: ${id}`, 500)
      // }
  }

  async create(dataChannel: Omit<DataChannel, "id">) {
    const newDC = Object.assign(dataChannel, {id: crypto.randomUUID()})
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put(newDC.id, newDC)
    })
    return newDC
  }

  async update (dataChannel: DataChannel) {
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put(dataChannel.id, dataChannel)
    })
    return dataChannel
  }

  async delete (id: string) {
    return this.ctx.storage.delete(id)
  }
}


