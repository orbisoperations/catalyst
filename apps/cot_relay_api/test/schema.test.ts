// import { describe, it, expect } from 'bun:test';
// import { schema } from '../src'; // Adjust the import path as necessary
//
// describe('GraphQL Schema Integrity Tests', () => {
//   it('Event type has the correct fields', () => {
//     const eventType = schema.getType('Event');
//     expect(eventType).toBeDefined();
//
//     // Convert to configuration object to access fields
//     const eventConfig = eventType?.toConfig();
//     // Now check for the existence of the fields within the fields object
//     expect(eventConfig?.).toHaveProperty('type');
//     expect(eventConfig?.extensions).toHaveProperty('point');
//     expect(eventConfig?.extensions).toHaveProperty('unit');
//   });
//
//   it('Point type has the correct fields', () => {
//     const pointType = schema.getType('Point');
//     expect(pointType).toBeDefined();
//
//     // Convert to configuration object to access fields
//     const pointConfig = pointType?.toConfig();
//     // Now check for the existence of the fields within the fields object
//     expect(pointConfig?.astNode).toHaveProperty('lat');
//     expect(pointConfig?.astNode).toHaveProperty('lon');
//     expect(pointConfig?.astNode).toHaveProperty('hae');
//   });
//
//   it('Unit type has the correct fields', () => {
//     const unitType = schema.getType('Unit');
//     expect(unitType).toBeDefined();
//
//     // Convert to configuration object to access fields
//     const unitConfig = unitType?.toConfig();
//     // Now check for the existence of the fields within the fields object
//     expect(unitConfig?.astNode).toHaveProperty('uid');
//     expect(unitConfig?.astNode).toHaveProperty('name');
//     expect(unitConfig?.astNode).toHaveProperty('type');
//   });
// });