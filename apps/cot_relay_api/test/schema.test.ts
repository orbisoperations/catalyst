import { describe, it, expect } from 'bun:test';
import { schema } from '../src'; // Adjust the import path as necessary

describe('GraphQL Schema Integrity Tests', () => {
  it('Event type has the correct fields', () => {
    const eventType = schema.getType('Event');
    expect(eventType).toBeDefined();
    expect(eventType.getFields()).toHaveProperty('type');
    expect(eventType.getFields()).toHaveProperty('point');
    expect(eventType.getFields()).toHaveProperty('unit');
  });

  it('Point type has the correct fields', () => {
    const pointType = schema.getType('Point');
    expect(pointType).toBeDefined();
    expect(pointType.getFields()).toHaveProperty('lat');
    expect(pointType.getFields()).toHaveProperty('lon');
    expect(pointType.getFields()).toHaveProperty('hae');
  });

  it('Unit type has the correct fields', () => {
    const unitType = schema.getType('Unit');
    expect(unitType).toBeDefined();
    expect(unitType.getFields()).toHaveProperty('uid');
    expect(unitType.getFields()).toHaveProperty('name');
    expect(unitType.getFields()).toHaveProperty('type');
  });
});