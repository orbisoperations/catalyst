import { connect } from 'cloudflare:sockets';
import convert from "xml-js";
import {CatalystGatewayClient} from "./catalyst-gateway-client";


// TODO: Replace this exact function with a call to catalyst to retrieve data

export async function runTask(event: any, env: any, ctx: any) {

	const gatewayClient = new CatalystGatewayClient(env);

		const sendStuffToTak = async (env: any) => {
			const data = await gatewayClient.useADSBData();

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
