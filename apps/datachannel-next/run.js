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
var node_http_1 = require("node:http");
var next_1 = require("next");
var socket_io_1 = require("socket.io");
var tslog_1 = require("tslog");
var net_1 = require("net");
var dev = process.env.NODE_ENV !== 'production';
var hostname = 'localhost';
var port = 3000;
var takHost = 'tak-server-2-broken-haze-8097.fly.dev';
var takPort = 8999;
var logger = new tslog_1.Logger({
    name: 'run.js',
});
var app = (0, next_1.default)({ dev: dev, hostname: hostname, port: port });
var handler = app.getRequestHandler();
var io;
var startServer = function () { return __awaiter(void 0, void 0, void 0, function () {
    var httpServer, client, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, app.prepare()];
            case 1:
                _a.sent();
                httpServer = (0, node_http_1.createServer)(handler);
                io = new socket_io_1.Server(httpServer);
                io.on('connection', onSocketConnection);
                client = net_1.default.createConnection(takPort, takHost, onTakServerConnected);
                client.on('data', onTakServerData);
                client.on('error', onTakServerError);
                client.on('end', onTakServerDisconnected);
                httpServer.listen(port, function () {
                    logger.info("> Ready on http://".concat(hostname, ":").concat(port));
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger.error(error_1);
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
var onSocketConnection = function (socket) {
    logger.info("Client Connected ".concat(socket.id));
    // Add any additional socket event handlers here
};
var onTakServerConnected = function () {
    logger.info("TAK Connected: ".concat(takHost));
    io.emit("TAK Connected: ".concat(takHost));
};
var onTakServerData = function (data) {
    io.emit('cot', data);
};
var onTakServerError = function (error) {
    logger.error('Disconnected from TAK server');
    logger.error(error);
    io.emit('Tak Integration Status: Error');
    process.exit(1);
};
var onTakServerDisconnected = function () {
    logger.info('Disconnected from TAK server');
};
startServer();
