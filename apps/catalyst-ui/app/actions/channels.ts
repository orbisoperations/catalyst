"use server";
import { CloudflareEnv } from "@/env";
import { getRequestContext } from "@cloudflare/next-on-pages";
import {
  DataChannel,
  JWTParsingResponse,
  PermissionCheckResponse,
  Token,
  zDataChannel,
} from "../../../../packages/schema_zod";

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
    accessSwitch: formData.get("accessSwitch") === "on",
    id: formData.get("id") as string,
  };

  const parsed = zDataChannel.safeParse(dataChannel);
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

export async function createChannelSchema(token: Token) {
  //TODO: Implement creation of channel schema and filters
  //1.) Create a new JWT token with the claims for the dataChannelId and partnerId
  //2.) Use the token to call the data channel gateway to get the schema
  //3.) Use the schema to create a new schema filter for the partner, default filter is an array of FALSE
  //4.) Return the schema filter
  const api = getRegistar();
  const jwtEntity: JWTParsingResponse =
    await getEnv().AUTHX_TOKEN_API.validateToken(token.catalystToken!);
  const parsedJWTEntity = JWTParsingResponse.safeParse(jwtEntity);
  if (!parsedJWTEntity.success) {
    throw new Error("token not valid for parsing");
  }

  const userId = parsedJWTEntity.data.entity!.split("/")[1];
  // The user must have read access to the data channel and the token must have the data channel id in the claims
  const canRead = parsedJWTEntity.data.claims.includes(dataChannelId);
  const partnerId = parsedJWTEntity.data.claims.['partnerId'];
  const endpoint = getEnv().DATA_CHANNEL_GATEWAY_URL;
  const headers = {
    "content-type": "application/json",
    Authorization: "<token>",
  };
  const graphqlQuery = {
    operationName: "fetchAuthor",
    query: `query fetchAuthor { author { id name } }`,
    variables: {},
  };

  const options = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(graphqlQuery),
  };

  const responseSchema = await fetch(endpoint, options);
  const data = await responseSchema.json();

  const channelSchemaFilterResp = await api.getChannelSchemaFilter(
    "default",
    partnerId,
    tokenObject,
  );
  if (!channelSchemaFilterResp) {
    throw new Error("Failed to get data channel schema filter for partner");
  }
  return channelSchemaFilterResp;
}

export async function updateChannelSchema(
  dataChannelId: string,
  partnerId: string,
  filter: string[],
  token: string,
) {
  //TODO: Implement updating of channel schema filters
  //1.) Use the token to extract the claims for the dataChannelId and partnerId to update the filters
  //2.) return the data channel schema filter
  const api = getRegistar();
  const tokenObject = {
    cfToken: token,
  };
  const channelSchemaFilterResp = await api.updateDataChannelSchemaFilter(
    "default",
    partnerId,
    filter,
    tokenObject,
  );
  if (!channelSchemaFilterResp) {
    throw new Error("Failed to update data channel schema filter for partner");
  }
  return channelSchemaFilterResp;
}

export async function getChannelSchema(token: Token) {
  //TODO: Implement getting of channel schema filters
  //1.) Use the token to extract the claims for the dataChannelId and partnerId to get the filters
  //2.) Get the data channel schema
  //3.) Merge the schema with the filters where any additional schema fields are added to the filter with a default value of FALSE
  //4.) Remove any schema field filters that are not in the schema
  //5.) return the data channel schema filters

}

export async function deleteChannelSchema(token: Token) {
  //TODO: Implement deletion of channel schema filters
  //1.) Use the token to extract the claims for the dataChannelId and partnerId to delete the filters
  //2.) return the boolean result of the operation
}
