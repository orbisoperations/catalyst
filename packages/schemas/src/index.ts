// Import Zod v4 for better performance and new features
// See: https://zod.dev/v4
import { z } from 'zod/v4';

// Re-export zod for convenience
export { z };

// Export core schemas
export * from './core';

// Export domain schemas
export * from './domains/auth';
export * from './domains/organization';
export * from './domains/datachannel';
export * from './domains/registry';

// Export constants
export * from './constants';

// Export Catalyst namespace (legacy compatibility)
export * as Catalyst from './catalyst';

// Export Authzed namespace
export * as Authzed from './authzed';
