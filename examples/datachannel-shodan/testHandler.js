const apiUrl = 'http://localhost:4008/graphql';


const location = {
    latitude:  51.46888,
    longitude: 0.45536
};

const searchRadiusNauticalMiles = 200;

async function testCriticalAssetsWithinDistance() {
    const query = `
    query {
      criticalAssetsWithinDistance(lat: ${location.latitude}, lon: ${location.longitude}, dist: ${searchRadiusNauticalMiles}) {
        ip
        port
        service
        location
        org
        product
        version
        lat
        lon
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
        console.log('Critical assets within distance:');
        console.log(JSON.stringify(data.criticalAssetsWithinDistance, null, 2));
    }
}

testCriticalAssetsWithinDistance();