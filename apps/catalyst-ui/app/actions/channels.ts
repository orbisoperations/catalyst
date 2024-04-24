"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import z from "zod";
const zDataChannel = z.object({
  name: z.string(),
  description: z.string(),
  endpoint: z.string(),
  creatorOrganization: z.string(),
  accessSwitch: z.boolean(),
  id: z.string(),
});
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
  const parsed = zDataChannel.omit({ id: true }).safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error("Invalid data channel");
  }

  return await api.create("default", parsed.data);
}

export async function listChannels() {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  return await api.list("default");
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
