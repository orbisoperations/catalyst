"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.grabTokenInHeader = exports.VerifyingClient = exports.UrlqGraphqlClient = void 0;
var jose_1 = require("jose");
var core_1 = require("@urql/core");
var UrlqGraphqlClient = /** @class */ (function () {
    function UrlqGraphqlClient(endpoint) {
        this.client = new core_1.Client({
            url: endpoint,
            exchanges: [core_1.fetchExchange],
            preferGetMethod: "within-url-limit",
        });
    }
    UrlqGraphqlClient.prototype.getPublickKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = (0, core_1.gql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            query {\n                publicKey\n            }\n        "], ["\n            query {\n                publicKey\n            }\n        "])));
                        return [4 /*yield*/, this.client.query(query, {}).toPromise()];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data.publicKey];
                }
            });
        });
    };
    return UrlqGraphqlClient;
}());
exports.UrlqGraphqlClient = UrlqGraphqlClient;
var VerifyingClient = /** @class */ (function () {
    function VerifyingClient(publicKeyEndpoint) {
        this.publicKey = undefined;
        this.endpoint = publicKeyEndpoint;
    }
    VerifyingClient.prototype.verify = function (token, issuer, claims) {
        return __awaiter(this, void 0, void 0, function () {
            var client, pubKey, _a, jwtClaims, payload, e_1, dataChannelClaims;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.publicKey) return [3 /*break*/, 3];
                        client = new UrlqGraphqlClient(this.endpoint);
                        return [4 /*yield*/, client.getPublickKey()
                            // console.log(pubKey);
                        ];
                    case 1:
                        pubKey = _b.sent();
                        // console.log(pubKey);
                        _a = this;
                        return [4 /*yield*/, (0, jose_1.importSPKI)(pubKey, 'ES384')];
                    case 2:
                        // console.log(pubKey);
                        _a.publicKey = _b.sent();
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, (0, jose_1.jwtVerify)(token, this.publicKey)];
                    case 4:
                        payload = (_b.sent()).payload;
                        jwtClaims = payload;
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _b.sent();
                        console.error(e_1);
                        return [2 /*return*/, [false, { msg: "JWT Invalid", status: 401 }]];
                    case 6:
                        /// check that the issuer is good
                        if (jwtClaims.iss !== issuer) {
                            console.log("jwt issuer is bunk");
                            return [2 /*return*/, [false, { msg: "JWT Issuer Invalid", status: 401 }]];
                        }
                        // check that claims exist, non-exists is falsey, empty array can be true
                        if (!("claims" in jwtClaims)) {
                            console.log("jwt claims non-existent");
                            return [2 /*return*/, [false, { msg: "JWT Claims Missing", status: 401 }]];
                        }
                        dataChannelClaims = jwtClaims["claims"];
                        // check that our claims are in the claims
                        if (claims.filter(function (e) { return dataChannelClaims.includes(e); }).length != claims.length) {
                            return [2 /*return*/, [false, { msg: "JWT Claims Do Not Align", status: 401 }]];
                        }
                        return [2 /*return*/, [true]];
                }
            });
        });
    };
    return VerifyingClient;
}());
exports.VerifyingClient = VerifyingClient;
function grabTokenInHeader(authHeader) {
    // authheader should be in format "Bearer tokenstring"
    if (!authHeader) {
        return ["", {
                msg: "No Credenetials Supplied",
                status: 400
            }];
    }
    var headerElems = authHeader.split(" ");
    if (headerElems.length != 2) {
        return ["", {
                msg: "No Credenetials Supplied",
                status: 400
            }];
    }
    return [headerElems[1]];
}
exports.grabTokenInHeader = grabTokenInHeader;
var templateObject_1;
