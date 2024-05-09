/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {runTask} from "./lib";
import {DurableObject, WorkerEntrypoint} from "cloudflare:workers"
import { createSchema, createYoga } from "graphql-yoga";
import { Context, Hono } from "hono";
import {createRemoteJWKSet, jwtVerify} from "jose"



export interface Env {
	CATALYST_GATEWAY_URL: string;
	CATALYST_GATEWAY_TOKEN: string;
	ENABLED: string
	NAMESPACE: string
	TAK_MANAGER: DurableObjectNamespace<TAKDataManager>
	TAK_HOST: string
	TAK_USER: string
	TAK_PASSWORD: string
	TAK_UI: string
}

const ALARM_MS = 28 * 1000 // 10s
export class TAKDataManager extends DurableObject<Env> {
	async alarmInit(enable: boolean) {
		if (enable) {
			if (await this.ctx.storage.getAlarm() === null) {
				await this.alarm()
				await this.ctx.storage.setAlarm(Date.now() + ALARM_MS)
			}
		} else {
			await this.ctx.storage.deleteAlarm()
		}
	}

	async alarm() {
		const taskUUIDS = await runTask(this.env, this.ctx);
		const currentUUIDs = await this.ctx.storage.get<Map<string, number>>("catalyst-uuids") ?? new Map<string, number>()

		// pruge cache first
		const now = Date.now()

		// clear by ttl
		Array.from(currentUUIDs).forEach(([key, ttl]) => {
			if (ttl < now) {
				currentUUIDs.delete(key)
			}
		})

		// add new points
		Array.from(taskUUIDS.entries()).forEach(([key, ttl]) => {
			if (!currentUUIDs.has(key) && ttl >= now) {
				currentUUIDs.set(key,ttl)
			}
		})

		await this.ctx.blockConcurrencyWhile(async () => {
			await this.ctx.storage.put("catalyst-uuids", currentUUIDs)
		})
		// You could store this result in KV, write to a D1 Database, or publish to a Queue.
		// In this template, we'll just log the result:
		console.log(`sent stuff to tak`);
		console.log("catalyst graphlq uuids: ",currentUUIDs.size)


		// get all points on taK
		const unitResp = await fetch(this.env.TAK_UI+"unit", {
			method: "GET",
			headers: {
				"Authorization": `Basic ${btoa(this.env.TAK_USER + ":" + this.env.TAK_PASSWORD)}`
			}
		})

		const allTAKPoints: {uid: string, callsign: string, lat: number, lon: number, stale_time: string}[] =  await unitResp.json()
		console.log("all points on the map: ", allTAKPoints.length)
		const allTAKPointsUnique = new Map<string, {uid: string, callsign: string, lat: number, lon: number, stale_time: string}> ()
		allTAKPoints.forEach(point => {
			allTAKPointsUnique.set(point.uid, point)
		})
		console.log("unique points on map: ", allTAKPointsUnique.size)
		//console.log(allTAKPoints)
		const takGenPoints = Array.from(allTAKPointsUnique.entries()).filter(([uid, point]) => {
			// if point is not being tracked and still valid
			return !currentUUIDs.has(uid) && (new Date(point.stale_time).getTime() > Date.now())
		}).map(([key, point]) => point)
		console.log("tak generated point: ",currentUUIDs.size, takGenPoints.length, allTAKPointsUnique.size)
		console.log(takGenPoints)
		await this.ctx.storage.put("tak-uuids", takGenPoints)
		await this.ctx.storage.setAlarm(Date.now() + ALARM_MS)
	}

	async getTAKPoints() {
		return await this.ctx.storage.get<{uid: string, callsign: string, lat: number, lon: number, stale_time: string}[]>("tak-uuids") ??
			[] as {uid: string, callsign: string, lat: number, lon: number, stale_time: string}[]
	}
}


type Variables = {
	valid: boolean
}

type bindings = {
	CATALYST_GATEWAY_URL: string;
	CATALYST_GATEWAY_TOKEN: string;
	ENABLED: string
	NAMESPACE: string
	TAK_MANAGER: DurableObjectNamespace<TAKDataManager>
	TAK_HOST: string
	TAK_USER: string
	TAK_PASSWORD: string
	TAK_UI: string
}

const app: Hono<{Bindings: bindings, Variables: Variables}> = new Hono()

const typeDefs = `
type TAKMarkers {
    uid: String!
    callsign: String!
    lat: Float!
    lon: Float!
    expiry: Float!
    namespace: String!
}

type Query {
    TAKMarkers: [TAKMarkers!]!
    _sdl: String!
}`

const schema = createSchema({
	typeDefs: typeDefs,
	resolvers: {
		Query: {
			_sdl: () => typeDefs,
			TAKMarkers: async(_,{},c: Context) => {
				const enabled = c.env.ENABLED === "true"
				if (!enabled || !Boolean(c.get('valid'))) return []

				const id = c.env.TAK_MANAGER.idFromName(c.env.NAMESPACE!)
				const stub: DurableObjectStub<TAKDataManager> = c.env.TAK_MANAGER.get(id)
				return (await stub.getTAKPoints()).map(point => {
					return {
						namespace: c.env.NAMESPACE!,
						...point
					}
				})
			}
		}
	}
})

app.use("/graphql", async (c) => {
	const JWKS = createRemoteJWKSet(new URL(c.env.CATALYST_GATEWAY_URL.replace("graphql", ".well-known/jwks.json")))
	const token = c.req.header("Authorization") ? c.req.header("Authorization")!.split(" ")[1] : ""
	let valid = false
	try {
		const { payload, protectedHeader } = await jwtVerify(token, JWKS)
		//valid = payload.claims != undefined && (payload.claims as string[]).includes(c.env.CATALYST_APP_ID)
		valid = true
	} catch (e) {
		console.error("error validating jwt: ", e)
		valid = false
	}
	c.set('valid', valid)
	const yoga = createYoga({
		schema: schema,
		graphqlEndpoint: "/graphql",
	});
	console.log("graphql handler")
	return yoga.handle(c.req.raw as Request, c);
})

app.use('/', async (c) => {
	const id = c.env.TAK_MANAGER.idFromName(c.env.NAMESPACE!)
	const stub = c.env.TAK_MANAGER.get(id)
	if (c.env.ENABLED === "true") {
		console.log("enabled alarm")
		await stub.alarmInit(true)
	} else {
		console.log("disabled alarm")
		await stub.alarmInit(false)
	}

	await stub.getTAKPoints()

	return c.text("ok", 200)
})
export default class TAKWorker extends WorkerEntrypoint<Env>{
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async fetch(req: Request) {
		return app.fetch(req, this.env, this.ctx)
	}
};
