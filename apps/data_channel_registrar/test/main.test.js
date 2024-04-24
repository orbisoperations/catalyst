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
var cloudflare_test_1 = require("cloudflare:test");
var vitest_1 = require("vitest");
var tslog_1 = require("tslog");
var logger = new tslog_1.Logger();
(0, vitest_1.describe)("Data Channel Registrar as Durable Object integration tests", function () {
    console.log(cloudflare_test_1.env);
    (0, vitest_1.it)('should fetch an empty array DO', function () { return __awaiter(void 0, void 0, void 0, function () {
        var list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(cloudflare_test_1.env);
                    return [4 /*yield*/, cloudflare_test_1.env.WORKER.list("default")];
                case 1:
                    list = _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    /*it('should create a Data Channel and return the id, also show in the DO list', async () => {
        const createResponse = await giveMeADataChannel();
        const dataChannelId: string = await createResponse.json();

        expect(createResponse.status).toEqual(200);
        expect(dataChannelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

        const listResponse = await SELF.fetch("http://dcd/list");
        const responseText = await listResponse.text()
        expect(listResponse.status).toEqual(200);
        expect(responseText).toEqual("[{\"name\":\"Data Channel 1\",\"endpoint\":\"https://example.com/data\",\"creatorOrganization\":\"Fake Organization\",\"id\":\""+dataChannelId+"\"}]");
    })

    it('requests data channel by id', async () => {
    const createdDataChannel = await giveMeADataChannel();
    const findId: string  = await createdDataChannel.json();

    const getDataChannelById = new Request ("http://dcd/"+findId, {
            method: "GET",
            headers: {"Content-Type": "application/json"}
        })
        const foundDataChannel = await SELF.fetch(getDataChannelById);

        expect(await foundDataChannel.text()).toEqual("{\"name\":\"Data Channel 1\",\"endpoint\":\"https://example.com/data\",\"creatorOrganization\":\"Fake Organization\",\"id\":\""+findId+"\"}");
        expect(foundDataChannel.status).toEqual(200);
    });

    it('update data channel by id, then retrieve it and make sure changed', async () => {
        const createdDataChannel = await giveMeADataChannel();
        const useId: string  = await createdDataChannel.json();

        const updateDataChannelById = new Request ("http://dcd/update", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                id: useId,
                name: "Data Channel 2",
                endpoint: "https://example.com/data2",
                creatorOrganization: "Ghost Organization"
            })
        })
        const alteredDataChannelId = await SELF.fetch( updateDataChannelById);
        const getAlteredDataChannelID: string = await alteredDataChannelId.json();

        const checkDataChannelById = new Request ("http://dcd/"+getAlteredDataChannelID, {
            method: "GET",
            headers: {"Content-Type": "application/json"}
        })

        const alteredDataChannel = await SELF.fetch(checkDataChannelById);
        expect(await alteredDataChannel.text()).toEqual("{\"id\":\""+useId+"\",\"name\":\"Data Channel 2\",\"endpoint\":\"https://example.com/data2\",\"creatorOrganization\":\"Ghost Organization\"}");
        expect(alteredDataChannel.status).toEqual(200);
    });

    it('delete data channel by id, then cannot retrieve', async () => {
        const shortLivedDataChannel = await giveMeADataChannel();
        const removeId: string = await shortLivedDataChannel.json();
        console.log(removeId, "MADE IT HERE>>>");
        const deleteDataChannelById = new Request ("http://dcd/delete/"+removeId, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        })
        console.log(deleteDataChannelById, "MADE IT HERE>>>");
        const success = await (await SELF.fetch( deleteDataChannelById)).json<{success: boolean}>();

        expect(success).toEqual(true);
        //
        // const checkDataChannelById = new Request ("http://dcd/"+removeId, {
        //     method: "GET",
        //     headers: {"Content-Type": "application/json"}
        // })
        //
        // const phantomDataChannel = await SELF.fetch(checkDataChannelById);
        // expect(await phantomDataChannel.text()).toEqual("o data channel found: "+removeId);
        // expect(phantomDataChannel.status).toEqual(500);
    });*/
});
