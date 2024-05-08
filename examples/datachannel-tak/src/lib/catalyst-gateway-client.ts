import * as process from "node:process";
import {Env} from "..";

export class CatalystGatewayClient {
	private url: string;
	private token: string;

	// As a user, I plugin a gateway URL
	constructor(env: Env) {
		this.url = env.CATALYST_GATEWAY_URL;
		this.token = env.CATALYST_GATEWAY_TOKEN;
	}

	async useADSBData() {
		const query = `
    query {
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
      	pings {
					UID
					title
					city
					lat
					lon
				}
				earthquakes {
					EpicenterLatitude
					EpicenterLongitude
					LocalMagnitude
				}
    	}
  `;

		const response = await fetch(this.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.token}`,
			},
			body: JSON.stringify({query}),
		});

		const {data, errors} = await response.json() as any;

		console.log({data});

		if (errors) {
			console.error('GraphQL Errors: ', JSON.stringify(errors));
			return;
		}

		console.log('Aircraft within distance:');
		console.log(JSON.stringify(data, null, 2));
		return data;
	}
}


