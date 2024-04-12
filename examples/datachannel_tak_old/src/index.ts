import { connect } from 'cloudflare:sockets';
import {gql} from "@apollo/client";

export default {
  async scheduled(event: any, env: any, ctx: any) {

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

        let cotEvent = `<event version="2.0" uid="Marker" type="a-f-G-U-C" time="2024-06-15T19:22:35Z" start="2024-06-15T19:22:35Z" stale="2025-06-15T20:22:35Z" how="h-g-i-g-o">
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

    ctx.waitUntil(sendStuffToTak());
  },
}

function generateTestEntities(n: number) {
  const testEntities = [];
  for (let i = 0; i < n; i++) {
    testEntities.push({
      id: i + 1,
      name: `Entity ${i + 1}`,
      mgrs: getRandomMGRS(),
    });
  }
  return testEntities;
}


function getRandomMGRS(): string {
  let MGRS = '';

  // Get a random GZD (6 chars)
  for (let i = 0; i < 6; i++) {
    MGRS += Math.floor(Math.random() * 10); // random digit from 0 to 9
  }

  // Get a random grid reference (9 chars)
  for (let i = 0; i < 9; i++) {
    MGRS += Math.floor(Math.random() * 10); // random digit from 0 to 9
  }

  return MGRS;
}

const getData = async () => {
    const query = gql`
        query {
            airplanes
        }
    `;

  const catalystUrl = "http://localhost:5051/graphql";

  const dataResults = await fetch(catalystUrl, {
    method: "GET",
    body: JSON.stringify({query}),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const stringData = await dataResults.text();

  const parsedData = JSON.parse(stringData);
  console.log({parsedData});
  return parsedData;
};
