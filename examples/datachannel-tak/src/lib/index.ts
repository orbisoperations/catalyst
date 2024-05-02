import { connect } from 'cloudflare:sockets';
import convert from "xml-js";


// TODO: Replace this exact function with a call to catalyst to retrieve data
function getData() {
	const apiUrl = 'https://datachannel-adsb.devintelops.io/graphql';

	async function getAircraftWithinDistance() {
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
    }
  `;

		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query }),
		});

		const { data, errors } = await response.json() as any;

		if (errors) {
			console.error('GraphQL Errors: ', JSON.stringify(errors));
		} else {
			console.log('Aircraft within distance:');
			console.log(JSON.stringify(data, null, 2));
			return data.aircraftWithinDistance;
		}
	}
	return getAircraftWithinDistance();
}


export async function runTask(event: any, env: any, ctx: any) {
		const sendStuffToTak = async (env: any) => {
			const data = await getData();

			console.log({data});

			const takHostname = env.TAK_HOST.replace('https://', '').replace('http://', '');
			const takPort = env.TAK_PORT;

			const takAddr = { hostname: takHostname, port: takPort };

			const socket = connect(takAddr);
			const writer = socket.writable.getWriter()
			const encoder = new TextEncoder();

			const now: string = new Date().toISOString();

      let stale = new Date(now);
      stale.setSeconds(stale.getSeconds() + 5);


			// TODO: Evaluate values in the CoT XML for something more accurate. ce="45.3" hae="1-42.6" 1e="99.5"
			// Documentation: https://www.mitre.org/sites/default/files/pdf/09_4937.pdf
			const cotEvents = data.map((item: any) => {

				const now: string = new Date().toISOString();


				let stale = new Date(now);
				stale.setSeconds(stale.getSeconds() + 60);
				console.log(item.alt_geom);
				const cotEvent = {
					event: {
						_attributes: {
							version: '2.0',
							uid: item.hex,
							time: now,
							start: now,
							type: 'b-m-p-s-m',
							how: 'h-g-i-g-o',

							stale: stale.toISOString()
						},
						point: {
							_attributes: {
								lat: item.lat,
								lon: item.lon,
								hae: item.alt_geom,
								ce: '9999999',
								le: '9999999',
								type: 'a-.-A',
							}
						},
						detail: {
							contact: {
								_attributes: {
									callsign: item.flight
								}
							},
						}
					}
				};


				const options = {compact: true, ignoreComment: true, spaces: 4};

				const xml = convert.js2xml(cotEvent, options);

				console.log({xml});
				return xml;
			})

			const futureTx = cotEvents.map(async (e: any) => {
				const encoded = encoder.encode(e);
				await writer.write(encoded);
			})

			await Promise.all(futureTx);

			await socket.close();
		};

		await ctx.waitUntil(sendStuffToTak(env));
}
