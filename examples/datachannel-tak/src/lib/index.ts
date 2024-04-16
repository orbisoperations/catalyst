import { connect } from 'cloudflare:sockets';
import {generateLineCoordinates} from "./geoGen";
import convert from "xml-js";

export async function runTask(event: any, env: any, ctx: any) {

	// Expect this to be set on this environment variable to simplify implementation
	const token = env.CATALYST_API_TOKEN;

	const query = `
				query {
					aircraftWithinDistance(lat: 51.46888, lon: 0.45536, dist: 200) {
						icao
						call
						lat
						lon
						altitude
						trak
						speed
						type
      		}
				}
			`;

		// TODO: Replace this exact function with a call to catalyst to retrieve data
		async function getCatalystData(gqlQuery: string) {

			const queryResult: {
			data: {
				aircraftWithinDistance: {
					icao: string;
          call: string;
          lat: number;
          lon: number;
          altitude: number;
          trak: number;
          speed: number;
          type: string;
				}
			},
			} = await env.GATEWAY_API.fetch('/graphql', {
				headers: {
					'authorization': `Bearer ${token}`,
					'content-type': "application/json"
				},
				body: JSON.stringify({
					query: gqlQuery
				}),
			});

			return [queryResult.data.aircraftWithinDistance]
		}

		const forward2Tak = async () => {
			const data = await getCatalystData(query);

			console.log({data});

			const takAddr = { hostname: "localhost", port: 8999 };
			const socket = connect(takAddr);
			const writer = socket.writable.getWriter()
			const encoder = new TextEncoder();

			const now: string = new Date().toISOString();

      let stale = new Date(now);
      stale.setSeconds(stale.getSeconds() + 5);


			// Helpful CoTXML Documentation: https://www.mitre.org/sites/default/files/pdf/09_4937.pdf
			const cotEvents = data.map(item => {
				console.log(item);

				const now: string = new Date().toISOString();

				console.log({now});

				let stale = new Date(now);
				stale.setSeconds(stale.getSeconds() + 5);

				const cotEvent = {

					event: {
						_attributes: {
							version: '2.0',
							uid: item.call,
							type: 'a-f-G-U-C',
							time: now,
							start: now,
							stale: stale.toISOString()
						},
						point: {
							_attributes: {
								lat: item.lat,
								lon: item.lon,
								hae: '0',
								ce: '9999999',
								le: '9999999'
							}
						},
					}
				};


				const options = {compact: true, ignoreComment: true, spaces: 4};

				const xml = convert.js2xml(cotEvent, options);

				return xml;
			})

			const futureTx = cotEvents.map(async (e) => {
				const encoded = encoder.encode(e);
				await writer.write(encoded);
			})

			await Promise.all(futureTx);

			await socket.close();
		};

		await ctx.waitUntil(forward2Tak());
}


