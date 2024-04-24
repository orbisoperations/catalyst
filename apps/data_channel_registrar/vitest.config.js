"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
var config_1 = require("@cloudflare/vitest-pool-workers/config");
var tslog_1 = require("tslog");
var logger = new tslog_1.Logger({});
logger.info('Using built services from other workspaces within @catalyst');
logger.info('no external services used in this project');
// Setup files run outside isolated storage, and may be run multiple times.
logger.info("Setting up vite tests for the Data Channel Registrar...");
exports.default = (0, config_1.defineWorkersProject)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, {
                optimizeDeps: {
                    entries: ['@graphql-tools/executor-http'],
                },
                logLevel: 'info',
                clearScreen: false,
                test: {
                    poolOptions: {
                        workers: {
                            isolatedStorage: true,
                            singleWorker: true,
                            main: "src/worker.ts",
                            wrangler: { configPath: "./wrangler.toml" },
                            entrypoint: "RegistrarWorker",
                            miniflare: {
                                compatibilityDate: "2024-04-05",
                                compatibilityFlags: ["nodejs_compat"],
                            },
                        },
                    },
                },
            }];
    });
}); });
// export default defineWorkersConfig({
//   test: {
//
//     poolOptions: {
//       workers: {
//         main: "src/index.ts",
//         wrangler: { configPath: "./wrangler.toml" },
//         miniflare: {
//           d1Databases: {
//             "REGISTRAR_DB": "catalyst"
//           },
//           // modulesRoot: path.resolve("."),
//
//           // bindings: {
//           //   TEST_AUTH_PUBLIC_KEY: authKeypair.publicKey,
//           // },
//
//           workers: [
//             // Configuration for "auxiliary" Worker dependencies.
//             // Unfortunately, auxiliary Workers cannot load their configuration
//             // from `wrangler.toml` files, and must be configured with Miniflare
//             // `WorkerOptions`.
//             {
//               name: "authx_token_api",
//               modules: true,
//               modulesRoot: path.resolve("../authx_token_api"),
//               scriptPath: authxServicePath, // Built by `global-setup.ts`
//               compatibilityDate: "2024-01-01",
//               compatibilityFlags: ["nodejs_compat"],
//               // unsafeEphemeralDurableObjects: true,
//               durableObjects: {
//                 "HSM": "HSM"
//               },
//               // kvNamespaces: ["KV_NAMESPACE"],
//             },
//             {
//               name: "data_channel_registrar",
//               modules: true,
//               modulesRoot: path.resolve("../data_channel_registrar"),
//               scriptPath: dataChannelRegistrarPath, // Built by `global-setup.ts`
//               compatibilityDate: "2024-01-01",
//               compatibilityFlags: ["nodejs_compat"],
//               d1Databases: {
//                 "APP_DB": "catalyst"
//               },
//
//             },
//           ],
//         },
//       },
//     },
//   },
// });
