"use server";
import { CloudflareEnv } from "@/env";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { JWTRequest } from "../types";
import {DEFAULT_STANDARD_DURATIONS} from "@catalyst/schema_zod"
function getEnv() {
  return getCloudflareContext().env as CloudflareEnv;
}
function getAuthx() {
  return getEnv().AUTHX_TOKEN_API;
}
export async function getPublicKey() {
  // @ts-ignore
  const tokens = getAuthx();

  return await tokens.getPublicKey();
}

/*
 * WARNING - below is an admin function and will invalidate all active tokens
 */
export async function rotateJWTKeyMaterial(cfToken: string) {
  const tokenObject = {
    cfToken: cfToken,
  };
  // @ts-ignore
  const tokens = getAuthx();

  return await tokens.rotateKey(tokenObject);
}
/*
 * WARNING - above is an admin function and will invalidate all active tokens
 */

export async function signJWT(
  jwtRequest: JWTRequest,
  expiration: { value: number; unit: "days" | "weeks" } = {
    value: 7,
    unit: "days",
  },
  cfToken: string
) {
  const tokenObject = {
    cfToken: cfToken,
  };
  // @ts-ignore
  const tokens = getAuthx();
  if (expiration.unit === "days" && expiration.value > 365) {
    throw new Error("Expiration time cannot be greater than 365 days");
  }
  if (expiration.unit === "weeks" && expiration.value > 52) {
    throw new Error("Expiration time cannot be greater than 52 weeks");
  }
  // sets expiration in MS
  const exp =  expiration.unit === "days" ?
    expiration.value * DEFAULT_STANDARD_DURATIONS.D
    : expiration.value * DEFAULT_STANDARD_DURATIONS.W;

  const signedToken = await tokens.signJWT(jwtRequest, exp, tokenObject);
  if (!signedToken.success) {
    throw new Error("Failed to sign JWT");
  }
  return signedToken;
}
