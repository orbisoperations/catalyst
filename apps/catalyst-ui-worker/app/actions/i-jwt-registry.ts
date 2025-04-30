"use server";
import { CloudflareEnv } from "@/env";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { IssuedJWTRegistry } from "@catalyst/schema_zod";
function getEnv() {
  return getCloudflareContext().env as CloudflareEnv;
}
function getIJWT() {
  return getEnv().ISSUED_JWT_WORKER;
}

export async function listIJWTRegistry(token: string) {
  const matcher = getIJWT();
  const resp = await matcher.list({ cfToken: token });
  if (!resp.success) {
    throw new Error("list ijwt registry failed");
  }
  return resp.data;
}

export async function getIJWTRegistry(token: string, id: string) {
  const matcher = getIJWT();
  const getResult = await matcher.get({ cfToken: token }, id);
  if (!getResult.success) {
    throw new Error("get ijwt registry failed");
  }
  return getResult.data;
}

export async function createIJWTRegistry(
  token: string,
  data: Omit<IssuedJWTRegistry, "id">,
) {
  const matcher = getIJWT();
  const resp = await matcher.create({ cfToken: token }, data);
  if (!resp.success) {
    throw new Error("create ijwt registry failed");
  }
  return resp.data;
}

export async function updateIJWTRegistry(
  token: string,
  data: IssuedJWTRegistry,
) {
  const matcher = getIJWT();
  const resp = await matcher.update({ cfToken: token }, data);
  if (!resp.success) {
    throw new Error("update ijwt registry failed");
  }
  return resp.data;
}

export async function deleteIJWTRegistry(token: string, id: string) {
  const matcher = getIJWT();
  const resp = await matcher.delete({ cfToken: token }, id);
  if (!resp) {
    throw new Error("delete ijwt registry failed");
  }
  return resp;
}
