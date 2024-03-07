import { describe, it, expect } from 'bun:test';
import { doYoga } from '../src'; // Adjust the import path as necessary

describe('doYoga', () => {
  it('Processes GraphQL query and returns expected response', async () => {
    // Mock request and environment
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ query: '{ event(type: "ExampleType") { type point { lat lon hae } unit { uid name type } } }' }),
      headers: { 'Content-Type': 'application/json' },
    });

    console.log("requested data from doYoga", mockRequest)
    const mockEnv = { NODE_ENV: 'development' };
    const mockExecutionCtx = {}; // Define as needed

    const response = await doYoga(mockRequest, mockEnv, mockExecutionCtx);
    const data: any = await response.json();

    // Validate the structure and content of the response
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('event');
    // Further checks on the event structure and data as necessary
  });

  // Additional test to simulate environment variable changes and verify maskedErrors configuration
});