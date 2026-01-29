/**
 * Vitest configuration factories for Cloudflare Workers
 *
 * Provides reusable factory functions to generate standardized vitest configs
 * for worker testing, reducing duplication across the monorepo.
 */

import { defineConfig } from 'vitest/config';
import { defineWorkersProject, defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import {
    STANDARD_COMPATIBILITY_DATE,
    STANDARD_COMPATIBILITY_FLAGS,
    STANDARD_TEST_PATTERNS,
    STANDARD_COVERAGE_CONFIG,
} from './vitest-config.js';

/**
 * Durable Object binding configuration
 */
export interface DurableObjectBinding {
    /** Binding name (e.g., 'KEY_PROVIDER') */
    name: string;
    /** DO class name (e.g., 'JWTKeyProvider') */
    className: string;
    /** Optional script name for cross-worker DO references */
    scriptName?: string;
}

/**
 * Service binding configuration
 */
export interface ServiceBinding {
    /** Binding name (e.g., 'AUTHZED') */
    name: string;
    /** Target worker name (e.g., 'authx_authzed_api') */
    workerName: string;
}

/**
 * Auxiliary worker configuration
 */
export interface AuxiliaryWorker {
    /** Worker name */
    name: string;
    /** Path to the built worker script */
    scriptPath: string;
    /** Module root directory (defaults to parent directory of scriptPath) */
    modulesRoot?: string;
    /** Worker entrypoint export name */
    entrypoint?: string;
    /** Durable objects this worker provides */
    durableObjects?: Record<string, string>;
    /** Service bindings this worker needs */
    serviceBindings?: Record<string, string>;
    /** Environment variable bindings */
    bindings?: Record<string, string>;
    /** Enable ephemeral DOs for testing */
    unsafeEphemeralDurableObjects?: boolean;
    /** Outbound service handler for mocking external services */
    outboundService?: (request: Request) => Response | Promise<Response>;
}

/**
 * Configuration options for a single test project (unit or integration)
 */
export interface TestProjectConfig {
    /** Project name ('unit' or 'integration') */
    name: 'unit' | 'integration';
    /** Test file patterns to include */
    include: string[];
    /** Path to main worker entry (defaults to 'src/index.ts') */
    main?: string;
    /** Whether to use isolated storage (defaults: false for unit, true for integration) */
    isolatedStorage?: boolean;
    /** Whether to use single worker mode (defaults to true) */
    singleWorker?: boolean;
    /** Path to wrangler config (typically for integration tests) */
    wranglerConfigPath?: string;
    /** Global setup script path */
    globalSetup?: string;
    /** Global teardown script path */
    globalTeardown?: string;
    /** Durable object bindings for this worker */
    durableObjects?: DurableObjectBinding[];
    /** Service bindings for this worker */
    serviceBindings?: ServiceBinding[];
    /** Auxiliary workers to spin up */
    auxiliaryWorkers?: AuxiliaryWorker[];
    /** Worker name (for integration tests) */
    workerName?: string;
}

/**
 * Configuration options for creating a standard test config
 */
export interface StandardTestConfigOptions {
    /** Unit test configuration */
    unit?: TestProjectConfig;
    /** Integration test configuration */
    integration?: TestProjectConfig;
    /** Override compatibility date */
    compatibilityDate?: string;
    /** Override compatibility flags */
    compatibilityFlags?: string[];
    /** Additional vite config options */
    viteOptions?: {
        optimizeDeps?: { entries?: string[] };
        logLevel?: 'info' | 'warn' | 'error' | 'silent';
        clearScreen?: boolean;
    };
}

/**
 * Converts DurableObjectBinding array to miniflare format
 */
function formatDurableObjects(
    bindings?: DurableObjectBinding[]
): Record<string, string | { className: string; scriptName: string }> | undefined {
    if (!bindings || bindings.length === 0) return undefined;

    const result: Record<string, string | { className: string; scriptName: string }> = {};
    for (const binding of bindings) {
        if (binding.scriptName) {
            result[binding.name] = {
                className: binding.className,
                scriptName: binding.scriptName,
            };
        } else {
            result[binding.name] = binding.className;
        }
    }
    return result;
}

/**
 * Converts ServiceBinding array to miniflare format
 */
function formatServiceBindings(bindings?: ServiceBinding[]): Record<string, string> | undefined {
    if (!bindings || bindings.length === 0) return undefined;

    const result: Record<string, string> = {};
    for (const binding of bindings) {
        result[binding.name] = binding.workerName;
    }
    return result;
}

/**
 * Miniflare worker configuration format
 * Uses index signature to satisfy Cloudflare's passthrough types
 */
interface MiniflareWorkerConfig {
    [key: string]: unknown;
    name: string;
    modules: boolean;
    modulesRoot: string;
    scriptPath: string;
    compatibilityDate: string;
    compatibilityFlags: string[];
    entrypoint?: string;
    durableObjects?: Record<string, string>;
    serviceBindings?: Record<string, string>;
    bindings?: Record<string, string>;
    unsafeEphemeralDurableObjects?: boolean;
    outboundService?: (request: Request) => Response | Promise<Response>;
}

/**
 * Converts AuxiliaryWorker to miniflare worker format
 */
function formatAuxiliaryWorker(worker: AuxiliaryWorker): MiniflareWorkerConfig {
    return {
        name: worker.name,
        modules: true,
        modulesRoot: worker.modulesRoot || worker.scriptPath.replace(/\/dist\/[^/]+$/, ''),
        scriptPath: worker.scriptPath,
        compatibilityDate: STANDARD_COMPATIBILITY_DATE,
        compatibilityFlags: [...STANDARD_COMPATIBILITY_FLAGS],
        ...(worker.entrypoint && { entrypoint: worker.entrypoint }),
        ...(worker.durableObjects && { durableObjects: worker.durableObjects }),
        ...(worker.serviceBindings && { serviceBindings: worker.serviceBindings }),
        ...(worker.bindings && { bindings: worker.bindings }),
        ...(worker.unsafeEphemeralDurableObjects && { unsafeEphemeralDurableObjects: true }),
        ...(worker.outboundService && { outboundService: worker.outboundService }),
    };
}

/**
 * Creates a test project configuration
 */
function createTestProject(config: TestProjectConfig, compatibilityDate: string, compatibilityFlags: string[]) {
    const durableObjects = formatDurableObjects(config.durableObjects);
    const serviceBindings = formatServiceBindings(config.serviceBindings);
    const auxiliaryWorkers = config.auxiliaryWorkers?.map(formatAuxiliaryWorker);

    // Default isolatedStorage based on test type: false for unit (faster), true for integration (clean state)
    const defaultIsolatedStorage = config.name === 'integration';

    return defineWorkersProject({
        test: {
            name: config.name,
            include: config.include,
            ...(config.globalSetup && { globalSetup: config.globalSetup }),
            ...(config.globalTeardown && { globalTeardown: config.globalTeardown }),
            poolOptions: {
                workers: {
                    ...(config.main && { main: config.main }),
                    singleWorker: config.singleWorker ?? true,
                    isolatedStorage: config.isolatedStorage ?? defaultIsolatedStorage,
                    ...(config.wranglerConfigPath && { wrangler: { configPath: config.wranglerConfigPath } }),
                    ...(serviceBindings && { serviceBindings }),
                    miniflare: {
                        compatibilityDate,
                        compatibilityFlags,
                        ...(config.workerName && { name: config.workerName }),
                        ...(durableObjects && { durableObjects }),
                        ...(auxiliaryWorkers && auxiliaryWorkers.length > 0 && { workers: auxiliaryWorkers }),
                    },
                },
            },
        },
    });
}

/**
 * Creates a standardized vitest configuration for Cloudflare Workers
 *
 * @param options - Configuration options
 * @returns A vitest configuration object
 *
 * @example
 * // Simple unit + integration tests
 * export default createStandardTestConfig({
 *   unit: {
 *     name: 'unit',
 *     include: [STANDARD_TEST_PATTERNS.unit],
 *     durableObjects: [{ name: 'KEY_PROVIDER', className: 'JWTKeyProvider' }],
 *   },
 *   integration: {
 *     name: 'integration',
 *     include: [STANDARD_TEST_PATTERNS.integration],
 *     globalSetup: './global-setup.ts',
 *     wranglerConfigPath: './wrangler.jsonc',
 *     durableObjects: [{ name: 'KEY_PROVIDER', className: 'JWTKeyProvider' }],
 *     auxiliaryWorkers: [
 *       {
 *         name: 'authzed',
 *         scriptPath: path.resolve('../authzed/dist/index.js'),
 *         entrypoint: 'AuthzedWorker',
 *       },
 *     ],
 *   },
 * });
 */
export function createStandardTestConfig(options: StandardTestConfigOptions) {
    const compatibilityDate = options.compatibilityDate ?? STANDARD_COMPATIBILITY_DATE;
    const compatibilityFlags = options.compatibilityFlags ?? [...STANDARD_COMPATIBILITY_FLAGS];

    // Projects array type matches vitest's UserProjectConfigExport
    // Using ReturnType directly causes type incompatibility with defineConfig's projects
    const projects: ReturnType<typeof createTestProject>[] = [];

    if (options.unit) {
        projects.push(createTestProject(options.unit, compatibilityDate, compatibilityFlags));
    }

    if (options.integration) {
        projects.push(createTestProject(options.integration, compatibilityDate, compatibilityFlags));
    }

    return defineConfig({
        ...(options.viteOptions && {
            ...(options.viteOptions.optimizeDeps && { optimizeDeps: options.viteOptions.optimizeDeps }),
            ...(options.viteOptions.logLevel && { logLevel: options.viteOptions.logLevel }),
            ...(options.viteOptions.clearScreen !== undefined && { clearScreen: options.viteOptions.clearScreen }),
        }),
        test: {
            coverage: {
                provider: STANDARD_COVERAGE_CONFIG.provider,
                reporter: [...STANDARD_COVERAGE_CONFIG.reporter],
                reportsDirectory: STANDARD_COVERAGE_CONFIG.reportsDirectory,
                include: [...STANDARD_COVERAGE_CONFIG.include],
                exclude: [...STANDARD_COVERAGE_CONFIG.exclude],
            },
            projects,
        },
    });
}

/**
 * Creates a simple unit test configuration
 *
 * @param main - Path to main worker entry (defaults to 'src/index.ts')
 * @param durableObjects - Durable object bindings
 * @param auxiliaryWorkers - Auxiliary workers for unit tests
 * @returns A vitest configuration for unit tests only
 */
export function createUnitTestConfig(
    main: string = 'src/index.ts',
    durableObjects?: DurableObjectBinding[],
    auxiliaryWorkers?: AuxiliaryWorker[]
) {
    return createStandardTestConfig({
        unit: {
            name: 'unit',
            include: [STANDARD_TEST_PATTERNS.unit],
            main,
            // Unit tests use isolatedStorage: false by default (faster, shared storage OK)
            durableObjects,
            auxiliaryWorkers,
        },
    });
}

/**
 * Creates a simple integration test configuration
 *
 * @param options - Integration test options
 * @returns A vitest configuration for integration tests only
 */
export function createIntegrationTestConfig(options: Omit<TestProjectConfig, 'name' | 'include'>) {
    return createStandardTestConfig({
        integration: {
            name: 'integration',
            include: [STANDARD_TEST_PATTERNS.integration],
            ...options,
        },
    });
}

/**
 * Options for simple worker test configuration
 */
export interface SimpleWorkerTestOptions {
    /** Path to wrangler config file (defaults to './wrangler.jsonc'). Set to null to skip wrangler loading. */
    wranglerConfigPath?: string | null;
    /** Use single worker mode (defaults to false) */
    singleWorker?: boolean;
    /** Use isolated storage (defaults to false) */
    isolatedStorage?: boolean;
    /** Global setup script path */
    globalSetup?: string;
    /** Global teardown script path */
    globalTeardown?: string;
    /** Environment variable bindings */
    bindings?: Record<string, string>;
    /** Vite log level */
    logLevel?: 'info' | 'warn' | 'error' | 'silent';
    /** Main worker entry path */
    main?: string;
    /** Max concurrency for tests */
    maxConcurrency?: number;
    /** Durable object bindings */
    durableObjects?: Record<string, string | { className: string; scriptName: string }>;
    /** Service bindings */
    serviceBindings?: Record<string, string>;
    /** Auxiliary workers */
    auxiliaryWorkers?: AuxiliaryWorker[];
    /** Enable unsafe ephemeral DOs */
    unsafeEphemeralDurableObjects?: boolean;
}

/**
 * Creates a simple vitest configuration for basic Cloudflare Workers
 *
 * Use this for workers that don't need unit/integration separation
 * and just need basic test configuration with wrangler.
 *
 * @param options - Configuration options
 * @returns A vitest configuration object
 *
 * @example
 * ```ts
 * import { createSimpleWorkerTestConfig } from '@catalyst/test-utils';
 *
 * export default createSimpleWorkerTestConfig();
 * ```
 *
 * @example
 * ```ts
 * // With custom options
 * export default createSimpleWorkerTestConfig({
 *   singleWorker: true,
 *   isolatedStorage: true,
 *   globalSetup: './global-setup.ts',
 *   bindings: { MY_VAR: 'value' },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Without wrangler (miniflare only)
 * export default createSimpleWorkerTestConfig({
 *   wranglerConfigPath: null,
 *   bindings: {},
 * });
 * ```
 */
export function createSimpleWorkerTestConfig(options: SimpleWorkerTestOptions = {}) {
    const useWrangler = options.wranglerConfigPath !== null;
    const auxiliaryWorkers = options.auxiliaryWorkers?.map(formatAuxiliaryWorker);

    return defineWorkersConfig({
        ...(options.logLevel && { logLevel: options.logLevel }),
        test: {
            ...(options.globalSetup && { globalSetup: options.globalSetup }),
            ...(options.globalTeardown && { globalTeardown: options.globalTeardown }),
            ...(options.maxConcurrency && { maxConcurrency: options.maxConcurrency }),
            poolOptions: {
                workers: {
                    ...(useWrangler && {
                        wrangler: { configPath: options.wranglerConfigPath ?? './wrangler.jsonc' },
                    }),
                    ...(options.main && { main: options.main }),
                    singleWorker: options.singleWorker ?? false,
                    isolatedStorage: options.isolatedStorage ?? false,
                    ...(options.serviceBindings && { serviceBindings: options.serviceBindings }),
                    miniflare: {
                        compatibilityDate: STANDARD_COMPATIBILITY_DATE,
                        compatibilityFlags: [...STANDARD_COMPATIBILITY_FLAGS],
                        ...(options.bindings && { bindings: options.bindings }),
                        ...(options.durableObjects && { durableObjects: options.durableObjects }),
                        ...(options.unsafeEphemeralDurableObjects && { unsafeEphemeralDurableObjects: true }),
                        ...(auxiliaryWorkers && auxiliaryWorkers.length > 0 && { workers: auxiliaryWorkers }),
                    },
                },
            },
            coverage: {
                provider: STANDARD_COVERAGE_CONFIG.provider,
                reporter: [...STANDARD_COVERAGE_CONFIG.reporter],
                reportsDirectory: STANDARD_COVERAGE_CONFIG.reportsDirectory,
                include: [...STANDARD_COVERAGE_CONFIG.include],
                exclude: [...STANDARD_COVERAGE_CONFIG.exclude],
            },
        },
    });
}
