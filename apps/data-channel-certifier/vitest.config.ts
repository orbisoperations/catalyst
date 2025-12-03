import { createSimpleWorkerTestConfig } from '@catalyst/test-utils';

export default createSimpleWorkerTestConfig({
    // Do not load wrangler.jsonc in tests to avoid missing service errors
    wranglerConfigPath: null,
    bindings: {},
});
