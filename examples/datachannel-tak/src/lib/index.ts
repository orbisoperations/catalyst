import { connect } from 'cloudflare:sockets';
import convert from "xml-js";
import {CatalystGatewayClient} from "./catalyst-gateway-client";

const TTL_S = 30
// TODO: Replace this exact function with a call to catalyst to retrieve data

export async function runTask(env: any, ctx: any) {

	const gatewayClient = new CatalystGatewayClient(env);

		const sendStuffToTak = async (env: any) => {
			const data = await gatewayClient.useADSBData();

			//console.log({data});

			const takHostname = env.TAK_HOST.replace('https://', '').replace('http://', '');
			const takPort = env.TAK_PORT;

			const takAddr = { hostname: takHostname, port: takPort };

			const socket = connect(takAddr);
			const writer = socket.writable.getWriter()
			const encoder = new TextEncoder();

			const now: string = new Date().toISOString();

      let stale = new Date(now);
      stale.setSeconds(stale.getSeconds() + TTL_S);


			// TODO: Evaluate values in the CoT XML for something more accurate. ce="45.3" hae="1-42.6" 1e="99.5"
			// Documentation: https://www.mitre.org/sites/default/files/pdf/09_4937.pdf

			// airplane cot events
			const airplaneCOTEvents = data.aircraftWithinDistance.map((item: any) => {

				const now: string = new Date().toISOString();


				let stale = new Date(now);
				stale.setSeconds(stale.getSeconds() + TTL_S);
				//console.log(item.alt_geom);

				// ADSB data returns altitude in feet and tak reads it in meters
				function feetToMeters(feet?: number): number {
					if(!feet) {
						return 0;
					}
					const metersPerFoot = 0.3048;
					const meters = feet * metersPerFoot;
					return Math.round(meters);
				}

				const cotEvent = {
					event: {
						_attributes: {
							version: '2.0',
							uid: item.hex,
							time: now,
							start: now,
							type: 'a-f-A',
							how: 'm-g',
							stale: stale.toISOString()

						},
						point: {
							_attributes: {
								lat: item.lat,
								lon: item.lon,
								hae: feetToMeters(item.alt_geom),
								ce: '9999999',
								le: '9999999',
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

				//console.log("COTXML:", xml);
				return xml;
			})
			const earthquakeCOTEvents = data.earthquakes.map((item: any) => {

				const now: string = new Date().toISOString();


				let stale = new Date(now);
				stale.setSeconds(stale.getSeconds() + TTL_S);
				//console.log(item.alt_geom);

				// ADSB data returns altitude in feet and tak reads it in meters
				function feetToMeters(feet?: number): number {
					if(!feet) {
						return 0;
					}
					const metersPerFoot = 0.3048;
					const meters = feet * metersPerFoot;
					return Math.round(meters);
				}

				const cotEvent = {
					event: {
						_attributes: {
							version: '2.0',
							uid: crypto.randomUUID(),
							time: now,
							start: now,
							how: 'm-g',
							stale: stale.toISOString(),
							type: 'u-d-p',//'a-u-G',
							weapon: 'd'
						},
						point: {
							_attributes: {
								lat: item.EpicenterLatitude,
								lon: item.EpicenterLongitude,
								hae: 0,
								ce: '9999999',
								le: '9999999',
							}
						},
						detail: {
							__group: {
								_attributes: {
									name: item.LocalMagnitude
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

			console.log("sending airplane, earthquake txn")
			/*const futureTx = airplaneCOTEvents.map(async (e: any) => {
				const encoded = encoder.encode(e);
				return await writer.write(encoded);
			})*/

			await Promise.all([
				...airplaneCOTEvents.map(async (e: any) => {
					const encoded = encoder.encode(e);
					return await writer.write(encoded);
				}),
				...earthquakeCOTEvents.map(async (e: any) => {
					const encoded = encoder.encode(e);
					return await writer.write(encoded);
				})
			]);
			console.log("sent airplane, earthquake txn")

			await socket.close();
		};

		await ctx.waitUntil(sendStuffToTak(env));
}
