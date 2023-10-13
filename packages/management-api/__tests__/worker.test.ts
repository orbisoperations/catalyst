import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import app from "../src/worker/index"

describe("health and status checks", () => {
    test("health check", async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('ok')
    })

    test("status check", async () => {
        const res = await app.request('/status')
        expect(res.status).toBe(200)
        expect(await res.json()).toStrictEqual({
            health: "ok",
        })
    })
})