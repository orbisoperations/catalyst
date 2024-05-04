"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { JWTRequest } from "../types";
export async function getPublicKey() {
  // @ts-ignore
  const tokens = getRequestContext().env.AUTHX_TOKEN_API;

  return await tokens.getPublicKey();
}

/*
* WARNING - this an admin function  and will invalidate all active tokens
*/
export async function rotateJWTKeyMaterial(cfToken: string) {
  const tokenObject = {
    cfToken: cfToken,
  };
  // @ts-ignore
  const tokens = getRequestContext().env.AUTHX_TOKEN_API;

  return await tokens.rotateKey(tokenObject)
}

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
  const tokens = getRequestContext().env.AUTHX_TOKEN_API;
  if (expiration.unit === "days" && expiration.value > 365) {
    throw new Error("Expiration time cannot be greater than 365 days");
  }
  if (expiration.unit === "weeks" && expiration.value > 52) {
    throw new Error("Expiration time cannot be greater than 52 weeks");
  }
  const exp =
    60 *
    60 *
    24 *
    (expiration.unit === "days" ? expiration.value : expiration.value * 7);

  return await tokens.signJWT(jwtRequest, exp, tokenObject);
}
