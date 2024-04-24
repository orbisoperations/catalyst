"use server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import z from "zod";
const zDataChannel = z.object({
  name: z.string(),
  description: z.string(),
  endpoint: z.string(),
  creatorOrganization: z.string(),
  accessSwitch: z.boolean(),
  id: z.string(),
});
export async function getPublicKey() {
  // @ts-ignore
  const tokens = getRequestContext().env.AUTHX_TOKEN_API;

  return await tokens.getPublicKey();
}
