#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';

// Constants for commonly config-related strings
const LOCAL_ORG_ID = 'localdevorg';
const OBJECT_TYPES = {
    ORGANIZATION: 'orbisops_catalyst_dev/organization',
    USER: 'orbisops_catalyst_dev/user',
    DATA_CHANNEL: 'orbisops_catalyst_dev/data_channel',
} as const;
const RELATIONS = {
    DATA_CUSTODIAN: 'data_custodian',
    USER: 'user',
    MEMBER: 'member',
} as const;
const API_ENDPOINTS = {
    SCHEMA_READ: '/v1/schema/read',
    SCHEMA_WRITE: '/v1/schema/write',
    RELATIONSHIPS_READ: '/v1/relationships/read',
    RELATIONSHIPS_WRITE: '/v1/relationships/write',
    PERMISSIONS_CHECK: '/v1/permissions/check',
} as const;

interface LocalSetupConfig {
    containerName: string;
    schemaFile: string;
    ports: {
        grpc: number;
        http: number;
    };
    presharedKey: string;
    timeouts: {
        containerReady: number; // milliseconds
        schemaReady: number; // milliseconds
        permissionRetry: number; // milliseconds
        permissionRetryInterval: number; // milliseconds
    };
}

const localConfig: LocalSetupConfig = {
    containerName: 'authzed-container',
    schemaFile: './apps/authx_authzed_api/schema.zaml',
    ports: {
        grpc: 50051,
        http: 8449,
    },
    // Required for SpiceDB gRPC connections. This value must match the key used by all local services connecting to SpiceDB.
    // See: https://authzed.com/docs/spicedb/using-spicedb/grpc#authentication
    presharedKey: 'atoken',
    timeouts: {
        containerReady: 10000, // 10 seconds
        schemaReady: 20000, // 20 seconds
        permissionRetry: 2000, // 2 seconds
        permissionRetryInterval: 1000, // 1 second
    },
};

class LocalAuthzedSetup {
    constructor() {}

    private log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
        const colors = {
            info: '\x1b[36m', // Cyan
            success: '\x1b[32m', // Green
            warn: '\x1b[33m', // Yellow
            error: '\x1b[31m', // Red
        };
        const reset = '\x1b[0m';
        console.log(`${colors[type]}${message}${reset}`);
    }

    private execCommand(command: string, options: { cwd?: string; stdio?: unknown } = {}): string {
        try {
            return execSync(command, {
                encoding: 'utf8',
                stdio: options.stdio || 'pipe',
                cwd: options.cwd || process.cwd(),
            });
        } catch {
            throw new Error(`Command failed: ${command}`);
        }
    }

    private async checkContainerStatus(): Promise<'running' | 'stopped' | 'not-exists'> {
        try {
            const output = this.execCommand(
                `podman ps -a --filter "name=authzed-container" --format "{{.Names}}:{{.Status}}"`
            );
            if (output.includes('authzed-container:Up')) {
                return 'running';
            } else if (output.includes('authzed-container')) {
                return 'stopped';
            }
            return 'not-exists';
        } catch {
            return 'not-exists';
        }
    }

    private checkPersistenceExists(): boolean {
        // With Podman Compose, we check if the postgres volume exists
        try {
            const output = this.execCommand('podman volume ls --format "{{.Name}}"');
            return output.includes('spicedb_data');
        } catch {
            return false;
        }
    }

    private async stopAndRemoveContainer(): Promise<void> {
        this.log('Stopping and removing existing containers...', 'warn');
        try {
            this.execCommand('podman compose -f scripts/local-authzed/docker-compose.authzed.yml down', {
                stdio: 'ignore',
            });
        } catch {
            // Ignore errors when stopping containers
        }
        this.log('Containers removed', 'success');
    }

    private async startContainer(): Promise<void> {
        this.log('Starting local Authzed with PostgreSQL using Podman Compose...', 'info');

        this.execCommand('podman compose -f scripts/local-authzed/docker-compose.authzed.yml up -d', { cwd: '.' });

        // Wait for container to be ready by checking the API endpoint
        this.log('Waiting for containers to be ready...', 'info');
        await this.waitForContainerReady();

        this.log('Local Authzed container started successfully', 'success');
    }

    private async waitForContainerReady(): Promise<void> {
        const deadline = Date.now() + localConfig.timeouts.containerReady;
        let attempt = 0;
        while (Date.now() < deadline) {
            attempt++;
            try {
                // Use the /v1/schema/read endpoint for readiness
                const response = await fetch(`http://localhost:${localConfig.ports.http}${API_ENDPOINTS.SCHEMA_READ}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localConfig.presharedKey}`,
                    },
                    body: JSON.stringify({}),
                });
                this.log(`Health check attempt ${attempt}: status ${response.status}`, 'info');
                if (response.ok || response.status === 400 || response.status === 404) {
                    // 400 is expected when no schema is loaded yet, but it means the API is ready
                    // 404 is also expected when no schema is loaded yet
                    this.log(`Container ready after ${attempt} attempts`, 'success');
                    return;
                }
            } catch {
                // Ignore errors during health check
            }
            await new Promise((resolve) => setTimeout(resolve, localConfig.timeouts.permissionRetryInterval));
        }
        throw new Error(
            `Container failed to become ready after waiting ${localConfig.timeouts.containerReady / 1000} seconds`
        );
    }

    private async addUserAsDataCustodian(email: string): Promise<void> {
        this.log(`Adding ${email} as data custodian to local Authzed...`, 'info');

        // Base64 encode the email (as done in the Authzed client)
        const encodedEmail = Buffer.from(email).toString('base64');

        // Create the relationship requests using TOUCH for idempotency
        const dataCustodianRequest = {
            updates: [
                {
                    operation: 'OPERATION_TOUCH',
                    relationship: {
                        resource: {
                            objectType: OBJECT_TYPES.ORGANIZATION,
                            objectId: LOCAL_ORG_ID,
                        },
                        relation: RELATIONS.DATA_CUSTODIAN,
                        subject: {
                            object: {
                                objectType: OBJECT_TYPES.USER,
                                objectId: encodedEmail,
                            },
                        },
                    },
                },
            ],
        };

        const userRequest = {
            updates: [
                {
                    operation: 'OPERATION_TOUCH',
                    relationship: {
                        resource: {
                            objectType: OBJECT_TYPES.ORGANIZATION,
                            objectId: LOCAL_ORG_ID,
                        },
                        relation: RELATIONS.USER,
                        subject: {
                            object: {
                                objectType: OBJECT_TYPES.USER,
                                objectId: encodedEmail,
                            },
                        },
                    },
                },
            ],
        };

        try {
            // Add as data custodian
            const custodianResponse = await fetch(
                `http://localhost:${localConfig.ports.http}${API_ENDPOINTS.RELATIONSHIPS_WRITE}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localConfig.presharedKey}`,
                    },
                    body: JSON.stringify(dataCustodianRequest),
                }
            );

            if (!custodianResponse.ok) {
                const errorText = await custodianResponse.text();
                throw new Error(
                    `Failed to add data custodian role: ${custodianResponse.status}\nResponse: ${errorText}`
                );
            }

            // Add as user
            const userResponse = await fetch(
                `http://localhost:${localConfig.ports.http}${API_ENDPOINTS.RELATIONSHIPS_WRITE}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localConfig.presharedKey}`,
                    },
                    body: JSON.stringify(userRequest),
                }
            );

            if (!userResponse.ok) {
                const errorText = await userResponse.text();
                throw new Error(`Failed to add user role: ${userResponse.status}\nResponse: ${errorText}`);
            }

            this.log('User roles configured successfully in local Authzed', 'success');
        } catch (error) {
            this.log(`Failed to configure user roles in local Authzed: ${error}`, 'error');
            throw error;
        }
    }

    private async checkUserPermissions(email: string): Promise<boolean> {
        try {
            const encodedEmail = Buffer.from(email).toString('base64');

            // Check member permission (which includes data_custodian + user + admin)
            const memberCheck = await fetch(
                `http://localhost:${localConfig.ports.http}${API_ENDPOINTS.PERMISSIONS_CHECK}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localConfig.presharedKey}`,
                    },
                    body: JSON.stringify({
                        permission: RELATIONS.MEMBER,
                        resource: {
                            objectType: OBJECT_TYPES.ORGANIZATION,
                            objectId: LOCAL_ORG_ID,
                        },
                        subject: {
                            object: {
                                objectType: OBJECT_TYPES.USER,
                                objectId: encodedEmail,
                            },
                        },
                    }),
                }
            );

            if (!memberCheck.ok) {
                const errorText = await memberCheck.text();
                this.log(`Permission check failed with status ${memberCheck.status}: ${errorText}`, 'warn');
                return false;
            }

            const memberResult = (await memberCheck.json()) as { permissionship: string };
            this.log(`Permission check result: ${JSON.stringify(memberResult)}`, 'info');

            return memberResult.permissionship === 'PERMISSIONSHIP_HAS_PERMISSION';
        } catch {
            // Ignore errors during permission check
        }
        return false;
    }

    private async testAuthzedAPI(): Promise<boolean> {
        try {
            // Test with a simple schema read first
            const response = await fetch(`http://localhost:${localConfig.ports.http}${API_ENDPOINTS.SCHEMA_READ}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localConfig.presharedKey}`,
                },
                body: JSON.stringify({}),
            });

            if (response.ok) {
                return true;
            } else {
                this.log(`Local Authzed schema API returned status ${response.status}`, 'warn');
                return false;
            }
        } catch {
            // Ignore errors during API test
        }
        return false;
    }

    private async findExistingUser(): Promise<string | null> {
        // Try to find any user with data_custodian permission by checking for relationships
        try {
            const response = await fetch(
                `http://localhost:${localConfig.ports.http}${API_ENDPOINTS.RELATIONSHIPS_READ}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localConfig.presharedKey}`,
                    },
                    body: JSON.stringify({
                        consistency: {
                            requirement: 'REQUIRE_FRESH',
                        },
                        relationshipFilter: {
                            resourceType: OBJECT_TYPES.ORGANIZATION,
                            optionalRelation: RELATIONS.DATA_CUSTODIAN,
                        },
                    }),
                }
            );

            if (response.ok) {
                const data = (await response.json()) as { relationships: unknown[] };
                if (data.relationships && data.relationships.length > 0) {
                    const relationships = data.relationships as Array<{ subject: { object: { objectId: string } } }>;
                    const userId = relationships[0].subject.object.objectId;
                    return Buffer.from(userId, 'base64').toString('utf8');
                }
            }
        } catch {
            // Ignore errors when checking for existing users
        }
        return null;
    }

    async setup(): Promise<void> {
        this.log('🔐 Local Authzed Setup Script', 'info');
        this.log('Checking local persistence and container status...', 'info');

        // Ensure containers and persistence
        const persistenceExists = this.checkPersistenceExists();
        this.log(`Local PostgreSQL volume exists: ${persistenceExists}`, 'info');
        const containerStatus = await this.checkContainerStatus();
        this.log(`Local container status: ${containerStatus}`, 'info');

        if (persistenceExists) {
            this.log('Local PostgreSQL volume exists. Checking if containers are running...', 'info');
            if (containerStatus === 'not-exists') {
                this.log("Local containers don't exist but volume does. Starting containers...", 'warn');
                await this.startContainer();
            } else if (containerStatus === 'stopped') {
                this.log('Local containers are stopped. Starting them...', 'warn');
                this.execCommand('podman compose -f scripts/local-authzed/docker-compose.authzed.yml up -d');
            } else {
                this.log('Local containers are already running', 'success');
            }
        } else {
            this.log('No local PostgreSQL volume found. Setting up fresh local Authzed instance...', 'warn');
            if (containerStatus !== 'not-exists') {
                await this.stopAndRemoveContainer();
            }
            await this.startContainer();
        }

        // Load schema and wait for readiness
        await this.loadSchema();
        await this.waitForSchemaReady([OBJECT_TYPES.ORGANIZATION, OBJECT_TYPES.DATA_CHANNEL, OBJECT_TYPES.USER]);

        // Check for an existing user with required permissions
        const existingUser = await this.findExistingUser();
        if (existingUser) {
            const hasPermissions = await this.checkUserPermissions(existingUser);
            if (hasPermissions) {
                this.log('Existing user already has the required permissions in local Authzed', 'success');
                this.log('✅ Local Authzed setup complete!', 'success');
                return;
            }
        }

        // No user found, prompt for email and set up
        const email = await this.question(
            'Enter your OrbisOps email address (this will be used to grant you both data_custodian and user permissions in the local Authzed instance): '
        );
        if (!email || !email.includes('@')) {
            this.log('Invalid email address or input cancelled', 'error');
            process.exit(1);
        }
        await this.addUserAsDataCustodian(email);
        this.log('Verifying user permissions in local Authzed...', 'info');

        // Retry permission check with delays to handle timing issues
        let hasPermissions = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            this.log(`Permission verification attempt ${attempt}/3...`, 'info');
            hasPermissions = await this.checkUserPermissions(email);
            if (hasPermissions) {
                break;
            }
            if (attempt < 3) {
                this.log(
                    `Permission check failed, waiting ${localConfig.timeouts.permissionRetry / 1000} seconds before retry...`,
                    'warn'
                );
                await new Promise((resolve) => setTimeout(resolve, localConfig.timeouts.permissionRetry));
            }
        }

        if (!hasPermissions) {
            this.log('Failed to verify user permissions after creation in local Authzed', 'error');
            throw new Error('User permissions verification failed in local Authzed');
        }
        this.log('User permissions verified successfully in local Authzed', 'success');
        this.log('✅ Local Authzed setup complete!', 'success');
    }

    close(): void {
        // No longer using readline interface
    }

    private async question(prompt: string): Promise<string> {
        // Note: We're not using readline because it captures SIGINT signals internally
        // and prevents our custom SIGINT handler from working properly. This causes
        // Ctrl+C to exit with code 0 instead of code 1, making it impossible for
        // the shell script to distinguish between user cancellation and success.
        // Using process.stdin directly gives us full control over signal handling.
        return new Promise((resolve, reject) => {
            // Set up stdin to be readable
            process.stdin.setRawMode(false);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            // Handle SIGINT during the question
            const handleSigInt = () => {
                process.stdin.pause();
                reject(new Error('User cancelled'));
            };

            process.once('SIGINT', handleSigInt);

            // Display the prompt
            process.stdout.write(prompt);

            // Read from stdin
            process.stdin.once('data', (data) => {
                // Remove the SIGINT handler since we got input
                process.removeListener('SIGINT', handleSigInt);
                process.stdin.pause();

                const answer = data.toString().trim();
                resolve(answer);
            });
        });
    }

    private async loadSchema(): Promise<void> {
        this.log('Loading schema into local Authzed...', 'info');

        try {
            const schemaContent = fs.readFileSync(localConfig.schemaFile, 'utf8');
            const lines = schemaContent.split('\n').filter((line) => line.trim() !== '');

            const zedLines = lines.map((line) => {
                return line.trim();
            });

            const response = await fetch(`http://localhost:${localConfig.ports.http}${API_ENDPOINTS.SCHEMA_WRITE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localConfig.presharedKey}`,
                },
                body: JSON.stringify({
                    schema: zedLines.join('\n'),
                }),
            });

            if (response.ok) {
                this.log('Schema loaded successfully', 'success');
            } else {
                const errorText = await response.text();
                this.log(`Failed to load schema: ${response.status} ${errorText}`, 'error');
                throw new Error(`Schema load failed: ${response.status}`);
            }
        } catch (err) {
            this.log(`Error loading schema: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
            throw err;
        }
    }

    private async waitForSchemaReady(expectedDefinitions: string[]): Promise<void> {
        this.log('Waiting for schema to be available...', 'info');

        const deadline = Date.now() + localConfig.timeouts.schemaReady;
        let attempt = 0;

        while (Date.now() < deadline) {
            attempt++;
            try {
                const response = await fetch(`http://localhost:${localConfig.ports.http}${API_ENDPOINTS.SCHEMA_READ}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localConfig.presharedKey}`,
                    },
                    body: JSON.stringify({}),
                });

                if (response.ok) {
                    const data = (await response.json()) as { objectDefinitions: Array<{ name: string }> };
                    const found = expectedDefinitions.every((def) => {
                        return data.objectDefinitions.some((objDef) => objDef.name === def);
                    });

                    if (found) {
                        this.log(`Schema ready after ${attempt} attempts`, 'success');
                        return;
                    }
                }
            } catch {
                // Ignore errors during schema check
            }

            await new Promise((resolve) => setTimeout(resolve, localConfig.timeouts.permissionRetryInterval));
        }

        throw new Error(
            `Schema not available in local Authzed after waiting ${localConfig.timeouts.schemaReady / 1000} seconds`
        );
    }
}

// Main execution
async function main() {
    const localSetup = new LocalAuthzedSetup();

    try {
        await localSetup.setup();
    } catch (err) {
        console.error('Setup failed:', err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
    } finally {
        localSetup.close();
    }
}

// Run the script
main();
