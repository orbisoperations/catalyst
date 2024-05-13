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
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();


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
	CATALYST_DC_ID: string
}

const ALARM_MS = 5 * 1000 // 28s
export class TAKDataManager extends DurableObject<Env> {
	async alarmInit(enable: boolean) {
		if (enable) {
			console.log("enabling alarm")
			if (await this.ctx.storage.getAlarm() === null) {
				await this.ctx.storage.setAlarm(Date.now() + ALARM_MS)
			} else {
				console.log("alarm is already enabled")
			}
		} else {
			console.log("deleting alarm")
			await this.ctx.storage.deleteAlarm()
		}
	}

	async alarm() {
		try {
			console.log("starting alarm")
			const taskUUIDS = await runTask(this.env, this.ctx);
			console.log("got tak data")
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
					currentUUIDs.set(key, ttl)
				}
			})

			await this.ctx.blockConcurrencyWhile(async () => {
				await this.ctx.storage.put("catalyst-uuids", currentUUIDs)
			})
			console.log(`sent stuff to tak`);
			console.log("catalyst graphlq uuids: ", currentUUIDs.size)


			// get all points on taK
			const unitResp = await fetch(this.env.TAK_UI + "unit", {
				method: "GET",
				headers: {
					"Authorization": `Basic ${btoa(this.env.TAK_USER + ":" + this.env.TAK_PASSWORD)}`
				}
			})
			if (unitResp.status != 200) {
				console.log("error with tak data points", await unitResp.text())
			} else {
				console.log("got tak data points")
				const allTAKPoints: {
					uid: string,
					callsign: string,
					lat: number,
					lon: number,
					stale_time: string
					type: string

				}[] = await unitResp.json()
				console.log("all points on the map: ", allTAKPoints.length)
				const allTAKPointsUnique = new Map<string, {
					uid: string,
					callsign: string,
					lat: number,
					lon: number,
					stale_time: string
					type: string
				}>()
				allTAKPoints.forEach(point => {
					allTAKPointsUnique.set(point.uid, point)
				})
				console.log("unique points on map: ", allTAKPointsUnique.size)
				//console.log(allTAKPoints)
				const takGenPoints = Array.from(allTAKPointsUnique.entries()).filter(([uid, point]) => {
					// if point is not being tracked and still valid
					return !currentUUIDs.has(uid) && (new Date(point.stale_time).getTime() > Date.now())
				}).map(([key, point]) => point)
				console.log("tak generated point: ", currentUUIDs.size, takGenPoints.length, allTAKPointsUnique.size)
				console.log(takGenPoints)
				await this.ctx.storage.put("tak-uuids", takGenPoints)
			}
		} catch (e) {
			console.error(e)
		}
		await this.ctx.storage.setAlarm(Date.now() + ALARM_MS)
	}

	async getTAKPoints() {
		return (await this.ctx.storage.get<{uid: string, callsign: string, lat: number, lon: number, stale_time: string, type: string}[]>("tak-uuids")) ??
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
	CATALYST_DC_ID: string
}

const app: Hono<{Bindings: bindings, Variables: Variables}> = new Hono()

app.use("*", async (c, next) => {
	const id = c.env.TAK_MANAGER.idFromName(c.env.NAMESPACE!)
	const stub = c.env.TAK_MANAGER.get(id)
	if (c.env.ENABLED === "true") {
		console.log("enabling alarm")
		try {
			await stub.alarmInit(true)
		} catch (e) {
			console.error(e)
		}
		console.log("enabled alarm")
	} else {
		console.log("disabled alarm")
		await stub.alarmInit(false)
	}
	await next()
})
app.use("/graphql", async (c) => {
	const typeDefs = c.env.NAMESPACE === "broken-haze" ? `
type TAK2Marker {
    uid: ID!
    callsign: String!
    lat: Float!
    lon: Float!
    expiry: Float!
    namespace: String!
	type: String!
}

type Query {
    TAK2Markers: [TAK2Marker!]!
    _sdl: String!
}` :
		`
type TAK1Marker {
    uid: ID!
    callsign: String!
    lat: Float!
    lon: Float!
    expiry: Float!
    namespace: String!
	type: String!
}

type Query {
    TAK1Markers: [TAK1Marker!]!
    _sdl: String!
}`

	console.log(typeDefs)
	const resFunc = async(_,{},c: Context) => {
		console.log("makrers handler", c.env.ENABLED)
		const enabled = c.env.ENABLED === "true"
		if (!enabled || !Boolean(c.get('valid'))) return []

		const id = c.env.TAK_MANAGER.idFromName(c.env.NAMESPACE!)
		const stub: DurableObjectStub<TAKDataManager> = c.env.TAK_MANAGER.get(id)
		console.log(await stub.getTAKPoints())
		return (await stub.getTAKPoints()).map(point => {
			return {
				namespace: c.env.NAMESPACE!,
				expiry: new Date(point.stale_time).getTime(),
				...point
			}
		})
	}
	const resolver = c.env.NAMESPACE === "broken-haze" ?
		{
			TAK2Markers: resFunc
		} :
		{
			TAK1Markers: resFunc
		}
	const schema = createSchema({
		typeDefs: typeDefs,
		resolvers: {
			Query: {
				_sdl: () => typeDefs,
				...resolver
				}
			}
		})

	const JWKS = createRemoteJWKSet(new URL(c.env.CATALYST_GATEWAY_URL.replace("graphql", ".well-known/jwks.json")))
	const token = c.req.header("Authorization") ? c.req.header("Authorization")!.split(" ")[1] : ""
	let valid = false
	try {
		const { payload, protectedHeader } = await jwtVerify(token, JWKS)
		valid = payload.claims != undefined && (payload.claims as string[]).includes(c.env.CATALYST_DC_ID)
		console.log("user is able to access claim: ", valid)
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
	return c.text("ok", 200)
})
export default class TAKWorker extends WorkerEntrypoint<Env>{
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async fetch(req: Request) {
		return app.fetch(req, this.env, this.ctx)
	}
};
