import { describe, it, expect } from 'bun:test';
import {convertJsonToCotXml} from "../src";

describe('convertJsonToCotXml Function Tests', () => {
  it('correctly converts JSON to CoT XML format', () => {
    const jsonInput = {
      type: "ExampleType",
      point: {
        lat: 34.2101,
        lon: -77.8868,
        hae: 30.48,
      },
      unit: {
        uid: "Unit123",
        name: "Alpha Team",
        type: "Infantry",
      },
    };

    const expectedXmlOutput = `...`; // Provide the expected XML output as a string

    const result = convertJsonToCotXml(jsonInput);
    expect(result).toBe(expectedXmlOutput);
  });

  // Additional tests here to cover edge cases and error handling
});