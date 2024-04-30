"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";

import z from "zod";
import { DataChannel } from "../../../../packages/schema_zod";
const zDataChannel = z.object({
  name: z.string(),
  description: z.string(),
  endpoint: z.string(),
  creatorOrganization: z.string(),
  accessSwitch: z.boolean(),
  id: z.string(),
});

type User = {
  orgId: string;
  userId: string;
  zitadelRoles: string[];
};

async function getUser(token: string) {
  const {
    // @ts-ignore
    USER_CREDS_CACHE: user_cache,
    // @ts-ignore
    AUTHX_AUTHZED_API: authx,
    // @ts-ignore
    CATALYST_DATA_CHANNEL_REGISTRAR_API: api,
  } = getRequestContext().env as CloudflareEnv;

  return user_cache.getUser(token) as unknown as User | undefined;
}

export async function createDataChannel(formData: FormData, token: string) {
  const {
    // @ts-ignore
    CATALYST_DATA_CHANNEL_REGISTRAR_API: api,
    // @ts-ignore
    USER_CREDS_CACHE: user_cache,
    // @ts-ignore
    AUTHX_AUTHZED_API: authx,
  } = getRequestContext().env as CloudflareEnv;
  const user = await getUser(token);
  // zitadel roles muust inclide org-admin or data-custodian
  const userParsed = z
    .object({
      orgId: z.string(),
      userId: z.string(),
      zitadelRoles: z.array(z.string(z.enum(["org-admin", "data-custodian"]))),
    })
    .safeParse(user);

  if (!userParsed.success) {
    throw new Error(`Invalid user: ${userParsed.error}`);
  }

  const canCreate = await authx.canCreateUpdateDeleteDataChannel(
    userParsed.data.orgId,
    userParsed.data.userId
  );

  if (!canCreate) {
    throw new Error("User does not have permission to create data channel");
  }

  console.log("should create channel");

  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    endpoint: formData.get("endpoint") as string,
    creatorOrganization: userParsed.data.orgId,
    accessSwitch: true,
  };

  const parsed = DataChannel.omit({ id: true }).safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error("Invalid data channel");
  }

  const newChannel = await api.create("default", parsed.data);
  await authx.addDataChannelToOrg(userParsed.data.orgId, newChannel.id);
  await authx.addOrgToDataChannel(newChannel.id, userParsed.data.orgId);
  return newChannel;
}

export async function listChannels(token: string) {
  const {
    // @ts-ignore
    USER_CREDS_CACHE: user_cache,
    // @ts-ignore
    AUTHX_AUTHZED_API: authx,
    // @ts-ignore
    CATALYST_DATA_CHANNEL_REGISTRAR_API: api,
  } = getRequestContext().env as CloudflareEnv;

  const user = await getUser(token);

  if (!user) return [];

  const allChannels = await api.list("default");

  const filteredChannels = await Promise.all(
    Array.from<DataChannel>(allChannels).map(async (channel) => {
      return [
        channel,
        await authx.canReadFromDataChannel(channel.id, user.userId),
      ];
    })
  ).then((permsArr) => {
    return permsArr
      .filter(([channel, allowed]) => {
        console.log("allowed", allowed, channel.id);
        return allowed;
      })
      .map(([dataChannel]) => dataChannel);
  });
  return filteredChannels;
}

export async function getChannel(channelId: string, token: string) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api, AUTHX_AUTHZED_API: authx } =
    getRequestContext().env as CloudflareEnv;
  const user = await getUser(token);
  if (!user) return undefined;
  const canRead = authx.canReadDataChannel(user.orgId, user.userId);
  if (!canRead) return undefined;

  return await api.get("default", channelId);
}

export async function updateChannel(formData: FormData) {
  // @ts-ignore
  const { CATALYST_DATA_CHANNEL_REGISTRAR_API: api, AUTHX_AUTHZED_API: authx } =
    getRequestContext().env as CloudflareEnv;
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
