/**
 * Mock Identity Server for E2E Tests
 *
 * Provides a local HTTP server that mocks the Cloudflare Access identity endpoint.
 * This allows the user-credentials-cache worker to validate users during E2E tests
 * without calling the real Cloudflare Access API.
 *
 * Features:
 * - Dynamic response configuration via /__set-response POST endpoint
 * - Reset to default via /__reset POST endpoint
 * - Main endpoint at /cdn-cgi/access/get-identity
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http';

export interface MockIdentityResponse {
    email: string;
    custom: {
        'urn:zitadel:iam:org:project:roles': Record<string, Record<string, string>>;
    };
}

const DEFAULT_RESPONSE: MockIdentityResponse = {
    email: 'test-user@example.com',
    custom: {
        'urn:zitadel:iam:org:project:roles': {
            'platform-admin': { 'test-org-id': 'test-org-id.domain' },
            'org-admin': { 'test-org-id': 'test-org-id.domain' },
            'org-user': { 'test-org-id': 'test-org-id.domain' },
            'data-custodian': { 'test-org-id': 'test-org-id.domain' },
        },
    },
};

export class MockIdentityServer {
    private server: Server | null = null;
    private currentResponse: MockIdentityResponse = structuredClone(DEFAULT_RESPONSE);
    private port: number;

    constructor(port = 9999) {
        this.port = port;
    }

    private static readonly STARTUP_TIMEOUT_MS = 5000;

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(
                    new Error(`Mock identity server startup timed out after ${MockIdentityServer.STARTUP_TIMEOUT_MS}ms`)
                );
            }, MockIdentityServer.STARTUP_TIMEOUT_MS);

            this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
                // Control endpoint to set response dynamically
                if (req.url === '/__set-response' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk) => (body += chunk));
                    req.on('end', () => {
                        try {
                            this.currentResponse = JSON.parse(body);
                            res.writeHead(200);
                            res.end('OK');
                        } catch {
                            res.writeHead(400);
                            res.end('Invalid JSON');
                        }
                    });
                    return;
                }

                // Reset endpoint
                if (req.url === '/__reset' && req.method === 'POST') {
                    this.currentResponse = structuredClone(DEFAULT_RESPONSE);
                    res.writeHead(200);
                    res.end('OK');
                    return;
                }

                // Main identity endpoint
                if (req.url?.includes('/cdn-cgi/access/get-identity')) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.currentResponse));
                    return;
                }

                res.writeHead(404);
                res.end('Not found');
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                clearTimeout(timeout);
                if (err.code === 'EADDRINUSE') {
                    reject(
                        new Error(
                            `Port ${this.port} is already in use. Ensure no other mock identity server or service is running on this port.`
                        )
                    );
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, () => {
                clearTimeout(timeout);
                console.log(`    Mock identity server listening on port ${this.port}`);
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }

    /** Set mock response (called from test code) */
    async setResponse(response: MockIdentityResponse): Promise<void> {
        const resp = await fetch(`http://localhost:${this.port}/__set-response`, {
            method: 'POST',
            body: JSON.stringify(response),
        });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Failed to set mock identity: ${resp.status} ${text}`);
        }
    }

    /** Reset to default response (called from test code) */
    async reset(): Promise<void> {
        const resp = await fetch(`http://localhost:${this.port}/__reset`, { method: 'POST' });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Failed to reset mock identity: ${resp.status} ${text}`);
        }
    }

    getPort(): number {
        return this.port;
    }
}

let instance: MockIdentityServer | null = null;

export function getMockIdentityServer(): MockIdentityServer {
    if (!instance) {
        instance = new MockIdentityServer();
    }
    return instance;
}

export async function clearMockIdentityServer(): Promise<void> {
    if (instance) {
        await instance.stop();
        instance = null;
    }
}
