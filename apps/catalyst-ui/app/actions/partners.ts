"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";

function getMatcher() {
  // @ts-ignore
  return getRequestContext().env.ORGANIZATION_MATCHMAKING;
}

export async function listInvites(token: string) {
  const matcher = getMatcher();
  const result = await matcher.listInvites({ cfToken: token });
  if (result.success) {
    return result.invite;
  }
  console.error("List Invite Error:", result.error);
  return [];
}

export async function sendInvite(
  receivingOrg: string,
  token: string,
  message: string
) {
  const matcher = getMatcher();
  const result = await matcher.sendInvite(
    receivingOrg,
    { cfToken: token },
    message
  );
  if (result.success) {
    return result.invite;
  }
  console.error("Send Invite Error:", result.error);
  return undefined;
}

export async function readInvite(inviteId: string, token: string) {
  const matcher = getMatcher();
  const result = await matcher.readInvite(inviteId, { cfToken: token });
  if (result.success) {
    return result.invite;
  }
  console.error("Read Invite Error:", result.error);
  return undefined;
}

export async function declineInvite(inviteId: string, token: string) {
  const matcher = getMatcher();
  console.log({ inviteId, token });
  const result = await matcher.declineInvite(inviteId, { cfToken: token });
  if (result.success) {
    return result.invite;
  }
  console.error("Decline Invite Error:", result.error);
  return undefined;
}

export async function acceptInvite(inviteId: string, token: string) {
  const matcher = getMatcher();
  const result = await matcher.acceptInvite(inviteId, { cfToken: token });

  if (result.success) {
    return result.invite;
  }
  console.error("Accept Invite Error:", result.error);
  return undefined;
}

export async function togglePartnership(orgId: string, token: string) {
  const matcher = getMatcher();
  const result = await matcher.togglePartnership(orgId, { cfToken: token });
  if (result.success) {
    return result.invite;
  }
  console.error("Toggle Partner Status Error:", result.error);
  return undefined;
}
