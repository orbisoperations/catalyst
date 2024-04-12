import { connect } from 'cloudflare:sockets';
import {generateLineCoordinates} from "./geoGen";
import * as mgrs from "mgrs";

export async function runTask(event: any, env: any, ctx: any) {

		function getTestData() {
			return [...generateTestEntities(20)]
		}

		const sendStuffToTak = async () => {
			const data = await getTestData();

			const takAddr = { hostname: "localhost", port: 8999 };
			const socket = connect(takAddr);
			const writer = socket.writable.getWriter()
			const encoder = new TextEncoder();


			const cotEvents = data.map(item => {
				console.log(item);
				let cotEvent = `
<event version="2.0" uid="Marker" type="a-f-G-U-C" time="2024-06-15T19:22:35Z" start="2024-06-15T19:22:35Z" stale="2025-06-15T20:22:35Z" how="h-g-i-g-o">
  <point mgrs="${item.mgrs}" hae="0" ce="9999999.0" le="9999999.0"/>
  <detail>
    <link uid="Platform" type="a-f-G-U-C" relation="p-p"/>
    <__event>
      <remarks>${item.name}</remarks>
    </__event>
  </detail>
</event>
`;
				return cotEvent;
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

	const trackId = crypto.randomUUID();
	const track = generateLineCoordinates("New York City", "Houston", 100)

	for (let i = 0; i < n; i++) {
		testEntities.push({
			id: i + 1,
			name: `Entity ${i + 1}`,
			mgrs: mgrs.forward([track[0].lat, track[0].lng]),
		});
	}
	return testEntities;
}
