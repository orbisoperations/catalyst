#!/usr/bin/env node
import Pastel from 'pastel';

const app = new Pastel({
	name: "catalystctl",
	importMeta: import.meta,
	description: "catalystctl is a cli for managing the control plane of Catalyst"
});

await app.run();
