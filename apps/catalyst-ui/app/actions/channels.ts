"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";

import z from "zod";
import {
  DataChannel,
  DataChannelActionResponse,
} from "../../../../packages/schema_zod";
import { CloudflareEnv } from "@/env";

export async function createDataChannel(formData: FormData, token: string) {
  const {
    // @ts-ignore
    CATALYST_DATA_CHANNEL_REGISTRAR_API: api,
  } = getRequestContext().env as CloudflareEnv;
  // zitadel roles muust inclide org-admin or data-custodian
  const tokenObject = {
    cfToken: token,
  };

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
  const newChannel = await api.create("default", parsed.data, tokenObject);
  return newChannel;
}

export async function listChannels(token: string) {
  const {
    // @ts-ignore
    CATALYST_DATA_CHANNEL_REGISTRAR_API: api,
  } = getRequestContext().env as CloudflareEnv;

  const tokenObject = {
    cfToken: token,
  };

  const channels = await api.list("default", tokenObject);
  return channels;
}

export async function listPartnersChannels(token: string, partnerId: string) {
  const channelsResponse = await listChannels(token);
  if (!channelsResponse.success) return undefined;
  const allChannels = channelsResponse.data as DataChannel[];
  return allChannels.filter(
    (channel) => channel.creatorOrganization === partnerId
  );
}

export async function getChannel(channelId: string, token: string) {
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;

  const tokenObject = {
    cfToken: token,
  };

  const channelResp: DataChannelActionResponse = await api.read(
    "default",
    channelId,
    tokenObject
  );
  if (channelResp.success) {
    console.log("found data channels: ", channelResp.data);
    return channelResp.data as DataChannel;
  }
  console.error(channelResp.error);
  throw new Error("unable to find data channel");
}

export async function updateChannel(formData: FormData, token: string) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api, AUTHX_AUTHZED_API: authx } =
    getRequestContext().env as CloudflareEnv;
  const tokenObject = {
    cfToken: token,
  };
  const dataChannel = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    endpoint: formData.get("endpoint") as string,
    creatorOrganization: formData.get("organization") as string,
    accessSwitch: formData.get("accessSwitch") === "on" ? true : false,
    id: formData.get("id") as string,
  };
  const parsed = DataChannel.safeParse(dataChannel);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error("Invalid data channel");
  }
  return await api.update("default", parsed.data, tokenObject);
}

export async function handleSwitch(
  channelId: string,
  accessSwitch: boolean,
  token: string
) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  const tokenObject = {
    cfToken: token,
  };
  const channelResp = await api.read("default", channelId, tokenObject);
  if (!channelResp.success) {
    throw new Error("unable to toggle datachannel");
  }
  let channel = channelResp.data as DataChannel;
  channel.accessSwitch = accessSwitch;
  return await api.update("default", channel, tokenObject);
}

export async function deleteChannel(channelID: string, token: string) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api } = getRequestContext()
    .env as CloudflareEnv;
  const tokenObject = {
    cfToken: token,
  };
  return await api.remove("default", channelID, tokenObject);
}
