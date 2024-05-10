"use server";
import { CloudflareEnv } from "@/env";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { IssuedJWTRegistry } from "../../../../packages/schema_zod";
function getEnv() {
  return getRequestContext().env as CloudflareEnv;
}
function getIJWT() {
  return getEnv().ISSUED_JWT_WORKER;
}

export async function listIJWTRegistry(token: string) {
  const matcher = getIJWT();
  try {
    const resp = await matcher.list({ cfToken: token });
    if (!resp.success) {
      throw new Error("list ijwt registry failed");
    }
    return resp.data;
  } catch (error) {
    console.error("List IssuedJWTRegistry Error:", error);
    return [];
  }
}

export async function getIJWTRegistry(token: string, id: string) {
  const matcher = getIJWT();
  const getResult = await matcher.get({ cfToken: token }, id);
  if (!getResult.success) {
    console.error("get ijwt registry failed", getResult.error);
    throw new Error("get ijwt registry failed");
  }
  return getResult.data;
}

export async function createIJWTRegistry(
  token: string,
  data: Omit<IssuedJWTRegistry, "id">
) {
  const matcher = getIJWT();
  try {
    const resp = await matcher.create({ cfToken: token }, data);
    if (!resp.success) {
      throw new Error("create ijwt registry failed");
    }
    return resp.data;
  } catch (error) {
    console.error("create ijwt registry failed", error);
    throw new Error("create ijwt registry failed");
  }
}

export async function updateIJWTRegistry(
  token: string,
  data: IssuedJWTRegistry
) {
  const matcher = getIJWT();
  try {
    const resp = await matcher.update({ cfToken: token }, data);
    if (!resp.success) {
      throw new Error("update ijwt registry failed");
    }
    return resp.data;
  } catch (error) {
    console.error("update ijwt registry failed", error);
    throw new Error("update ijwt registry failed");
  }
}

export async function deleteIJWTRegistry(token: string, id: string) {
  const matcher = getIJWT();
  try {
    const resp = await matcher.delete({ cfToken: token }, id);
    if (!resp) {
      throw new Error("delete ijwt registry failed");
    }
    return resp;
  } catch (error) {
    console.error("delete ijwt registry failed", error);
    throw new Error("delete ijwt registry failed");
  }
}
