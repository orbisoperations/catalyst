const apiUrl = 'https://datachannel-adsb-staging.securedatadistro.workers.dev/graphql';

async function testAircraftWithinDistance() {
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

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });

    const { data, errors } = await response.json();

    if (errors) {
        console.error('GraphQL Errors:', errors);
    } else {
        console.log('Aircraft within distance:');
        console.log(JSON.stringify(data.aircraftWithinDistance, null, 2));
    }
}

testAircraftWithinDistance();