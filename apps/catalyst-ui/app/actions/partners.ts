"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";

function getMatcher() {
  // @ts-ignore
  return getRequestContext().env.ORGANIZATION_MATCHMAKING;
}

export async function listInvites(token: string) {
  const matcher = getMatcher();
  const result = await matcher.listInvites({ cfToken: token });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.invite;
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
  if (!result.success) {
    throw new Error("Sending Invite Failed");
  }
  return result.invite;
}

export async function readInvite(inviteId: string, token: string) {
  const matcher = getMatcher();
  const result = await matcher.readInvite(inviteId, { cfToken: token });
  if (!result.success) {
    throw new Error("Reading Invite Failed");
  }
  return result.invite;
}

export async function declineInvite(inviteId: string, token: string) {
  const matcher = getMatcher();
  console.log({ inviteId, token });
  const result = await matcher.declineInvite(inviteId, { cfToken: token });
  if (!result.success) {
    throw new Error("Declining Invite Failed");
  }
  return result.invite;
}

export async function acceptInvite(inviteId: string, token: string) {
  const matcher = getMatcher();
  const result = await matcher.acceptInvite(inviteId, { cfToken: token });

  if (!result.success) {
    throw new Error("Accepting Invite Failed");
  }
  return result.invite;
}

export async function togglePartnership(orgId: string, token: string) {
  const matcher = getMatcher();
  const result = await matcher.togglePartnership(orgId, { cfToken: token });
  if (!result.success) {
    throw new Error("Toggling Partnership Failed");
  }
  return result.invite;
}
