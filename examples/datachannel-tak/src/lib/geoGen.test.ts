import {describe, test, expect} from 'bun:test';
import {generateLineCoordinates} from "./geoGen";

describe("outputSetOfCoordinatesInALine", () => {
	test("returns a set of coordinates for a valid route", () => {
		const startName = "New York City";
		const endName = "Los Angeles";
		const steps = 100;

		const result = generateLineCoordinates(startName, endName, steps);

		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBe(steps);

		// measures 2 decimal places
		const testPrecision = 8;

		const getNormalizedCoordinates = ([lat, lng]: [number, number]) => {
			return {
				lat: new Number(lat.toFixed(testPrecision)),
				lng: new Number(lng.toFixed(testPrecision)),
			};
		};
		const normalizedResult = getNormalizedCoordinates([
				result[result.length - 1]['lat'],
				result[result.length - 1]['lng']
			]
		);

		const expected = getNormalizedCoordinates([40.7128, -74.006]);

		expect(normalizedResult).toEqual(expected);


	});

	test("throws an error for an invalid start position name", () => {
		const startName = "Invalid City";
		const endName = "Los Angeles";
		const steps = 100;

		expect(() => {
			// @ts-expect-error startName is invalid
			generateLineCoordinates(startName, endName, steps);
		}).toThrow("Invalid start or end position name.");
	});

	test("throws an error for an invalid end position name", () => {
		const startName = "New York City";
		const endName = "Invalid City";
		const steps = 100;

		expect(() => {
			// @ts-expect-error endName is invalid
			generateLineCoordinates(startName, endName, steps);
		}).toThrow("Invalid start or end position name.");
	});

	test("uses the default number of steps if not provided", () => {
		const startName = "New York City";
		const endName = "Los Angeles";

		const result = generateLineCoordinates(startName, endName);

		expect(result.length).toBe(1000);
	});
});
