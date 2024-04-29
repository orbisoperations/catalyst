"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import UserCredsCacheWorker from "../../../user_credentials_cache/src"
import AuthzedWorker from "../../../authx_authzed_api/src";

/*import z from "zod";
const zDataChannel = z.object({
  name: z.string(),
  description: z.string(),
  endpoint: z.string(),
  creatorOrganization: z.string(),
  accessSwitch: z.boolean(),
  id: z.string(),
});*/
import {DataChannel} from "../../../../packages/schema_zod"
export async function createDataChannel(formData: FormData) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    endpoint: formData.get("endpoint") as string,
    creatorOrganization: formData.get("organization") as string,
    accessSwitch: true,
  };
  const parsed = DataChannel.omit({ id: true }).safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error("Invalid data channel");
  }

  return await api.create("default", parsed.data);
}

export async function listChannels(token: string) {
  const user_cache: Service<UserCredsCacheWorker> = getRequestContext().env.USER_CREDS_CACHE
  const authx: Service<AuthzedWorker> = getRequestContext().env.AUTHX_AUTHZED_API
  const { 
    CATALYST_DATA_CHANNEL_REGISTRAR_API: api,
  } = getRequestContext()
    .env as CloudflareEnv;

  const user = await user_cache.getUser(token)
  const allChannels = await api.list("default");
  const filteredChannels = await Promise.all(Array.from<DataChannel>(allChannels).map(async (channel) => {
    return [channel, authx.canReadDataChannel(user.orgId, user.userId)]
  })).then(permsArr => {
    return permsArr.filter(([,allowed]) => allowed).map(([dataChannel]) => dataChannel)
  })
  return filteredChannels
}

export async function getChannel(channelId: string) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  return await api.get("default", channelId);
}

export async function updateChannel(formData: FormData) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  const dataChannel = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    endpoint: formData.get("endpoint") as string,
    creatorOrganization: formData.get("organization") as string,
    accessSwitch: formData.get("accessSwitch") === "on" ? true : false,
    id: formData.get("id") as string,
  };
  const parsed = zDataChannel.safeParse(dataChannel);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error("Invalid data channel");
  }
  return await api.update("default", parsed.data);
}

export async function handleSwitch(channelId: string, accessSwitch: boolean) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  const channel = await api.get("default", channelId);
  if (!channel) return channel;
  channel.accessSwitch = accessSwitch;
  return await api.update("default", channel);
}

export async function deleteChannel(channelID: string) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  return await api.delete("default", channelID);
}
