import { connect } from 'cloudflare:sockets';
import convert from "xml-js";
import {CatalystGatewayClient} from "./catalyst-gateway-client";

const TTL_S = 8
// TODO: Replace this exact function with a call to catalyst to retrieve data

export async function runTask(env: any, ctx: any) {

	const gatewayClient = new CatalystGatewayClient(env);

	const takHostname = env.TAK_HOST.replace('https://', '').replace('http://', '');
	const takPort = env.TAK_PORT;

	const takAddr = { hostname: takHostname, port: takPort };
	const socket = connect(takAddr);

	const sendStuffToTak = async (env: any, client: CatalystGatewayClient) => {
		const pointUUIDs = new Map<string, number>()
		console.log("querying catalyst for data")
		const data = await gatewayClient.useCatalystData();
		console.log(data)

		const writer = socket.writable.getWriter()
		const encoder = new TextEncoder();

		const now: string = new Date().toISOString();



		// TODO: Evaluate values in the CoT XML for something more accurate. ce="45.3" hae="1-42.6" 1e="99.5"
		// Documentation: https://www.mitre.org/sites/default/files/pdf/09_4937.pdf

		// airplane cot events
		const airplaneCOTEvents = data.airplanes ? data.airplanes.aircraftWithinDistance.map((item: any) => {
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

			pointUUIDs.set(item.hex, stale.getTime())
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
		}) : []
		console.log("created airplane cot events: ", airplaneCOTEvents.length, pointUUIDs.size)

		// earhtquakes
		const earthquakeCOTEvents = data.earthquakes ? data.earthquakes.earthquakes.map((item: any) => {
			const stale = new Date(item.expiry);

			pointUUIDs.set(item.uuid, stale.getTime())
			const cotEvent = {
				event: {
					_attributes: {
						version: '2.0',
						uid: item.uuid,
						time: now,
						start: now,
						how: 'm-g',
						stale: stale.toISOString(),
						type: "b-m-p-a",//'u-d-p',//'a-u-G',
						//category: "point",
						//color: "yellow",
						//weapon: 'd'
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
						contact: {
							_attributes: {
								callsign: `Earthquake Magnitude: ${item.LocalMagnitude}`
							}
						},
					}
				}
			};


			const options = {compact: true, ignoreComment: true, spaces: 4};

			const xml = convert.js2xml(cotEvent, options);

			//console.log({xml});
			return xml;
		}) : []
		console.log("created earthquake cot events: ", earthquakeCOTEvents.length, pointUUIDs.size)

		// line events
		const lineCOTEvents = data.line ? data.line.pings.map((item: any) => {

			console.log("line expiry", item.expiry,  new Date(item.expiry))
			let stale = new Date(item.expiry);

			pointUUIDs.set(item.UID, stale.getTime())
			const cotEvent = {
				event: {
					_attributes: {
						version: '2.0',
						uid: item.UID,
						time: now,
						start: now,
						how: 'h-t',
						stale: stale.toISOString(),
						type: "b-m-p-w-GOTO",//'f-d-p',//'a-u-G',
					},
					point: {
						_attributes: {
							lat: item.lat,
							lon: item.lon,
							hae: 0,
							ce: '9999999',
							le: '9999999',
						}
					},
					detail: {
						contact: {
							_attributes: {
								callsign: item.title
							}
						},
					}
				}
			};


			const options = {compact: true, ignoreComment: true, spaces: 4};

			const xml = convert.js2xml(cotEvent, options);

			//console.log({xml});
			return xml;
		}) : []
		console.log("created line cot events: ", lineCOTEvents.length, pointUUIDs.size)

		const takData = data.tak === undefined ?
			undefined :
			'TAK1Markers' in data.tak ?
				data.tak.TAK1Markers//true
				:  'TAK2Markers' in data.tak ? // false
					data.tak.TAK2Markers
					: undefined

		const takCOTEvents = takData ? takData.map((item:any) => {

			pointUUIDs.set(item.uid, item.expiry)
			const cotEvent = {
				event: {
					_attributes: {
						version: '2.0',
						uid: item.uid,
						time: now,
						start: now,
						how: 'h-t',
						stale: new Date(item.expiry).toISOString(),
						type: item.type//"b-m-p-w-GOTO",//'f-d-p',//'a-u-G',
					},
					point: {
						_attributes: {
							lat: item.lat,
							lon: item.lon,
							hae: 0,
							ce: '9999999',
							le: '9999999',
						}
					},
					detail: {
						contact: {
							_attributes: {
								callsign: item.callsign
							}
						},
					}
				}
			};


			const options = {compact: true, ignoreComment: true, spaces: 4};

			const xml = convert.js2xml(cotEvent, options);

			//console.log({xml});
			return xml;
		}) : []
		console.log("created tak cot events: ", takCOTEvents.length, pointUUIDs.size)

		console.log("sending airplane, earthquake txn")
		console.log(await Promise.all([
			...airplaneCOTEvents.map(async (e: any) => {
				const encoded = encoder.encode(e);
				return await writer.write(encoded);
			}),
			...earthquakeCOTEvents.map(async (e: any) => {
				const encoded = encoder.encode(e);
				return await writer.write(encoded);
			}),
			...lineCOTEvents.map(async (e: any) => {
				const encoded = encoder.encode(e);
				return await writer.write(encoded);
			}),
			...takCOTEvents.map(async (e: any) =>
			{
				const encoded = encoder.encode(e);
				return await writer.write(encoded);
			})
		]))
		console.log("sent airplane, earthquake txn")


		console.log("sent points to tak: ", pointUUIDs.size)
		return pointUUIDs
	};
	let result;
	try {
		result = await sendStuffToTak(env, gatewayClient);
		await socket.close();
	} catch (e) {
		console.log(e);
		await socket.close();
	}
	return result;
}
