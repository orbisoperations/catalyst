import { generateRoute } from "geo-route-generator";
import * as mgrs from "mgrs";

interface NamedPosition {
	name: string;
	lat: number;
	lng: number;
}

export type NamedPositionLocationName = "New York City" |
"Los Angeles" |
	"Chicago" |
	"Houston" |
	"Miami";


const namedPositions: NamedPosition[] = [
	{
		name: "New York City",
		lat: 40.7128,
		lng: -74.0060,
	},
	{
		name: "Los Angeles",
		lat: 34.0522,
		lng: -118.2437,
	},
	{
		name: "Chicago",
		lat: 41.8781,
		lng: -87.6298,
	},
	{
		name: "Houston",
		lat: 29.7604,
		lng: -95.3698,
	},
	{
		name: "Miami",
		lat: 25.7617,
		lng: -80.1918,
	},
];

export function generateLineCoordinates(
	startName: NamedPositionLocationName,
	endName: NamedPositionLocationName,
	steps: number = 1000
) {
	const startPos = namedPositions.find((pos) => pos.name === startName);
	const finalPos = namedPositions.find((pos) => pos.name === endName);

	if (!startPos || !finalPos) {
		throw new Error("Invalid start or end position name.");
	}

	return generateRoute(
		{ lat: startPos.lat, lng: startPos.lng },
		{ lat: finalPos.lat, lng: finalPos.lng },
		steps
	);
}

export function convertLatLonToMGRS(lat: number, lng: number) {
	return mgrs.forward([lat, lng])
}
