import { z } from "zod";
import * as Catalyst from "../catalyst";
export const AuthzedObject = z.object({
  objectType: Catalyst.EntityString,
  objectId: z.string(),
});
