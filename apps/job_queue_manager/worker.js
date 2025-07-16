// Cloudflare Worker entry that spins up our GraphQL Mesh container on demand.
// The Container class lets us run the Docker image in Cloudflare's new
// server-side container runtime.

import { Container } from '@cloudflare/containers';

/**
 * The container that runs our pre-built Mesh gateway image.
 * The Dockerfile already exposes port 4000, so we map that as defaultPort.
 */
export class MeshGatewayContainer extends Container {
    // The gateway listens on port 4000 inside the container
    defaultPort = 4000;

    /**
     * If no requests hit the instance for 5 minutes it will be paused to save
     * resources. It will spin up again on the next request.
     */
    sleepAfter = '5m';
}

/**
 * The Worker fetch handler. We route every incoming request to the same
 * MeshGatewayContainer Durable Object instance.
 */
export default {
    async fetch(request, env) {
        // A single global instance is usually enough. If you need per-user or
        // per-tenant isolation, derive the name from the request (cookie, header,
        // etc.) instead of the static string below.
        const id = env.MESH_GATEWAY.idFromName('mesh-gateway-root');

        // Retrieve (or create) the container instance.
        const container = env.MESH_GATEWAY.get(id);

        // Proxy the request to the container's default port.
        return container.fetch(request);
    },
};
