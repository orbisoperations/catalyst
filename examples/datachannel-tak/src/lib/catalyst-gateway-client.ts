import * as process from "node:process";
import {Env} from "..";

const takQuery = (selector: string) => {
	switch (selector) {
		case "broken-haze":
			return `query {
				TAK1Markers {
					uid
					callsign
					lat
					lon
					namespace
					type
					expiry
				  }
			}`
		case "empty-violet":
		return `query {
			TAK2Markers {
				uid
				callsign
				lat
				lon
				namespace
				type
				expiry
			  }
			}`
		default: 
			return undefined
	}
}

export class CatalystGatewayClient {
	private url: string;
	private token: string;
	private takQuery?: string;

	// As a user, I plugin a gateway URL
	constructor(env: Env) {
		this.url = env.CATALYST_GATEWAY_URL;
		this.token = env.CATALYST_GATEWAY_TOKEN;
		this.takQuery = takQuery(env.NAMESPACE);
	}

	async useCatalystData() {
		const takqgl = this.takQuery ? [this.takQuery] : [] as string[]
		const queries = {
			airplanes: `query {
				aircraftWithinDistance(lat: 25.15090749876091, lon: 121.37875727934632, dist: 200) {
					hex
					flight
					lat
					lon
					alt_geom
					track
					gs
					t
				}
			}`,
			line: `query {
				pings {
					UID
					title
					city
					lat
					lon
					expiry
				}
			}`,
			earthquakes: `query {
				earthquakes {
					EpicenterLatitude
					EpicenterLongitude
					LocalMagnitude
					expiry
					uuid
				}
			}`,
			tak: this.takQuery
		}


		const doQGLQuery = async (query: string) => {
			const response = await fetch(this.url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.token}`,
				},
				body: JSON.stringify({query}),
			});
	
			console.log("catalyst resp", response)
			const {data, errors} = await response.json() as any;
	
			console.log({data});
	
			if (errors) {
				console.error('GraphQL Errors: ', JSON.stringify(errors));
				return undefined;
			}

			return data
		}
		
		return {
			airplanes: await doQGLQuery(queries.airplanes),
			line: await doQGLQuery(queries.line),
			earthquakes: await doQGLQuery(queries.earthquakes),
			tak: queries.tak ? await doQGLQuery(queries.tak) : undefined
		}
	}
}




