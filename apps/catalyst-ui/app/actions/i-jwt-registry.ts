"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { IssuedJWTRegistry } from "../../../../packages/schema_zod";

function getMatcher() {
  // @ts-ignore
  return getRequestContext().env.ISSUED_JWT_WORKER;
}

export async function listIJWTRegistry(token: string) {
  const matcher = getMatcher();
  try {
    return (await matcher.list({ cfToken: token })) as IssuedJWTRegistry[];
  } catch (error) {
    console.error("List IssuedJWTRegistry Error:", error);
    return [];
  }
}

export async function getIJWTRegistry(token: string, id: string) {
  const matcher = getMatcher();
  try {
    return (await matcher.get({ cfToken: token }, id)) as IssuedJWTRegistry;
  } catch (error) {
    console.error("Get IssuedJWTRegistry Error:", error);
    return undefined;
  }
}

export async function createIJWTRegistry(
  token: string,
  data: Omit<IssuedJWTRegistry, "id">
) {
  const matcher = getMatcher();
  try {
    return (await matcher.create(
      { cfToken: token },
      data
    )) as IssuedJWTRegistry;
  } catch (error) {
    console.error("Create IssuedJWTRegistry Error:", error);
    return undefined;
  }
}

export async function updateIJWTRegistry(
  token: string,
  data: IssuedJWTRegistry
) {
  const matcher = getMatcher();
  try {
    return (await matcher.update(
      { cfToken: token },
      data
    )) as IssuedJWTRegistry;
  } catch (error) {
    console.error("Update IssuedJWTRegistry Error:", error);
    return undefined;
  }
}

export async function deleteIJWTRegistry(token: string, id: string) {
  const matcher = getMatcher();
  try {
    return (await matcher.delete({ cfToken: token }, id)) as IssuedJWTRegistry;
  } catch (error) {
    console.error("Delete IssuedJWTRegistry Error:", error);
    return undefined;
  }
}
