#!/usr/bin/env node
import Pastel from 'pastel';

const app = new Pastel({
	name: "catalyst",
	importMeta: import.meta,
	description: "catalyst is a cli for managing the control plane of Catalyst"
});

await app.run();
