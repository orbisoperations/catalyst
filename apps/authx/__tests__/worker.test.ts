import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { parse } from "graphql";
import app from "../src/index"

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

		test("graphql health check", async() => {

			/*const req = new Request('http://localhost/graphql?query={health}', {
				method: 'PUT'
			})*/

			const res = await app.request('/graphql?query={health}');

            expect(res.status).toBe(200);

            expect(await res.json()).toStrictEqual({
                data: {
                    health: "ok",
                }
            })

		})

        test("graphql status check", async() => {
            const res = await app.request('/graphql?query={status{health}}');

            expect(res.status).toBe(200);

            expect(await res.json()).toStrictEqual({
                data: {
                    status: {
                        health: "ok"
                    }
                }
            })
        })
})
