import { describe, it, expect } from 'bun:test';
import { createYoga } from 'graphql-yoga';
import { convertJsonToCotXml } from './yourModule'; // Adjust the import based on your actual file structure
import { schema } from './yourSchemaModule'; // Adjust this as well
import { create } from 'xmlbuilder2';
import { server } from './yourServerModule'; // You will need to export your server instance for this

describe('GraphQL Schema Definitions', () => {
  it('should correctly define Point, Unit, and Event types', async () => {
    const pointType = schema.getType('Point');
    const unitType = schema.getType('Unit');
    const eventType = schema.getType('Event');

    // Test for existence
    expect(pointType).toBeDefined();
    expect(unitType).toBeDefined();
    expect(eventType).toBeDefined();

    // Further detailed tests can include checking field types, resolvers, etc.
    // Example:
    // expect(eventType.getFields()).toHaveProperty('point');
  });
});

describe('GraphQL Query Functionality', () => {
  // Assuming an instance of GraphQL server is available for tests
  const yoga = createYoga({ schema });

  it('should return the correct event for a given type', async () => {
    const query = `
      query GetEvent($type: String!) {
        event(type: $type) {
          type
          point {
            lat
            lon
            hae
          }
          unit {
            uid
            name
            type
          }
        }
      }
    `;
    const variables = { type: 'Infantry' };
    const response = await yoga.inject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data.event.type', 'Infantry');
    // Further assertions can be added here
  });
});

describe('JSON to CoT XML Conversion', () => {
  it('should correctly convert JSON to CoT XML format', () => {
    const json = {
      type: 'Infantry',
      point: { lat: 34.2101, lon: -77.8868, hae: 30.48 },
      unit: { uid: 'Unit123', name: 'Alpha Team', type: 'Infantry' }
    };

    const xml = convertJsonToCotXml(json);
    const expectedXml = create({
      Event: {
        '@type': 'Infantry',
        Point: { '@lat': '34.2101', '@lon': '-77.8868', '@hae': '30.48' },
        Unit: { '@uid': 'Unit123', '@name': 'Alpha Team', '@type': 'Infantry' }
      }
    }).end({ prettyPrint: true });

    expect(xml).toBe(expectedXml);
  });
});

describe('Server Route Handling', () => {
  it('should handle POST requests on "/" route', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/',
      body: { query: '{ event(type: "Infantry") { type } }' }
    });

    expect(response.statusCode).toBe(200);
    // Add further assertions based on the expected response structure
  });

  it('should handle GET requests on "/" route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/?query={event(type:"Infantry"){type}}'
    });

    expect(response.statusCode).toBe(200);
    // Add further assertions based on the expected response structure
  });
});
