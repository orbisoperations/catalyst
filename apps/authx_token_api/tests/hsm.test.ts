import {
    env,
    SELF,
    createExecutionContext,
    waitOnExecutionContext,
  } from "cloudflare:test";
  import { it, expect } from "vitest";
  import {KeyState} from "../src/do_hsm";
  
  it("can generate a new key", async () => {
    const key = new KeyState();
    await key.init();

  });

  /*
  it("adds via request (unit style)", async () => {
    const request = new Request("http://example.com/?a=1&b=2");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toBe("3");
  });
  it("adds via request (integration style)", async () => {
    const response = await SELF.fetch("http://example.com/?a=1&b=2");
    expect(await response.text()).toBe("3");
  });*/