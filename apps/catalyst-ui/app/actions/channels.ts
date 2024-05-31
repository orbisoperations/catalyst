"use server";
import { CloudflareEnv } from "@/env";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { DataChannel } from "../../../../packages/schema_zod";
import { print } from "graphql/index";

function getEnv() {
  return getRequestContext().env as CloudflareEnv;
}

function getRegistar() {
  return getEnv().CATALYST_DATA_CHANNEL_REGISTRAR_API;
}

export async function createDataChannel(formData: FormData, token: string) {
  const api = getRegistar();
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
  if (!newChannel.success) {
    throw new Error("Failed to create data channel");
  }
  return newChannel.data as DataChannel;
}

export async function listChannels(token: string) {
  const api = getRegistar();

  const tokenObject = {
    cfToken: token,
  };

  const channels = await api.list("default", tokenObject);
  if (!channels.success) {
    throw new Error("Failed to list data channels");
  }
  return channels.data as DataChannel[];
}

export async function listPartnersChannels(token: string, partnerId: string) {
  const channelsResponse = await listChannels(token);
  return channelsResponse.filter(
    (channel) => channel.creatorOrganization === partnerId,
  );
}

export async function getChannel(channelId: string, token: string) {
  const api = getRegistar();
  const tokenObject = {
    cfToken: token,
  };

  const channelResp = await api.read("default", channelId, tokenObject);
  if (!channelResp.success) {
    throw new Error("Failed to get data channel");
  }
  return channelResp.data as DataChannel;
}

export async function getChannelSchema(
  dataChannelId: string,
  partnerId: string,
  token: string,
) {
  const api = getRegistar();
  const tokenObject = {
    cfToken: token,
  };
  const channelSchemaResp = await api.getChannelSchemaFilters(
    "default",
    partnerId,
    tokenObject,
  );
  if (!channelSchemaResp.success) {
    throw new Error("Failed to get data channel schema for partner");
  }
  return channelSchemaResp.data;
}

export async function updateChannel(formData: FormData, token: string) {
  const api = getRegistar();
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
  const updateOperation = await api.update("default", parsed.data, tokenObject);
  if (!updateOperation.success) {
    throw new Error("Failed to update data channel");
  }
  return updateOperation.data as DataChannel;
}

export async function handleSwitch(
  channelId: string,
  accessSwitch: boolean,
  token: string,
) {
  const api = getRegistar();
  const tokenObject = {
    cfToken: token,
  };
  const channelResp = await api.read("default", channelId, tokenObject);
  if (!channelResp.success) {
    throw new Error("unable to toggle datachannel");
  }
  let channel = channelResp.data as DataChannel;
  channel.accessSwitch = accessSwitch;
  const updateOperation = await api.update("default", channel, tokenObject);
  if (!updateOperation.success) {
    throw new Error("Failed to update data channel");
  }
  return updateOperation.data as DataChannel;
}

export async function deleteChannel(channelID: string, token: string) {
  // @ts-ignore
  const api = getRegistar();
  const tokenObject = {
    cfToken: token,
  };
  const deleteOperation = await api.remove("default", channelID, tokenObject);
  if (!deleteOperation.success) {
    throw new Error("Failed to delete data channel");
  }
  return deleteOperation.data as DataChannel;
}
