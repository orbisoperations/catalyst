import {createStorage} from "unstorage";
import httpDriver from "unstorage/drivers/http";

// Maps to an unstorage http server in the backend.
export const storage = createStorage({
  driver: httpDriver({
    base: "/state",
  }),
});