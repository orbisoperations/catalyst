import { connect } from 'cloudflare:sockets';
import {generateLineCoordinates} from "./geoGen";
import convert from "xml-js";

export async function runTask(event: any, env: any, ctx: any) {

		// TODO: Replace this exact function with a call to catalyst to retrieve data
		function getTestData() {
			return [...generateTestEntities(100)]
		}

		const sendStuffToTak = async () => {
			const data = await getTestData();

			console.log({data});

			const takAddr = { hostname: "localhost", port: 8999 };
			const socket = connect(takAddr);
			const writer = socket.writable.getWriter()
			const encoder = new TextEncoder();

			const now: string = new Date().toISOString();

      let stale = new Date(now);
      stale.setSeconds(stale.getSeconds() + 5);


			// TODO: Evaluate values in the CoT XML for something more accurate. ce="45.3" hae="1-42.6" 1e="99.5"
			// Documentation: https://www.mitre.org/sites/default/files/pdf/09_4937.pdf
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
							uid: item.id,
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
						// detail: {
						// 	contact: {
						// 		_attributes: {
						// 			callsign: 'Unit1'
						// 		}
						// 	},
						// 	remarks: {
						// 		_text: 'Example CoT event'
						// 	}
						// }
					}
				};


				const options = {compact: true, ignoreComment: true, spaces: 4};

				const xml = convert.js2xml(cotEvent, options);

				console.log({xml});
				return xml;
			})

			const futureTx = cotEvents.map(async (e) => {
				const encoded = encoder.encode(e);
				await writer.write(encoded);
			})

			await Promise.all(futureTx);

			await socket.close();
		};

		await ctx.waitUntil(sendStuffToTak());
}

function generateTestEntities(n: number) {
	const testEntities = [];

	const track = generateLineCoordinates("New York City", "Houston", n)

	console.log({track});

	for (let i = 0; i < n; i++) {
		testEntities.push({
			id: i + 1,
			name: `Entity ${i + 1}`,
			lat: track[i].lat,
			lon: track[i].lng,
		});
	}
	return testEntities;
}
