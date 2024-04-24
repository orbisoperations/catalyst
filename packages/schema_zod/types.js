"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataChannelId = exports.UserId = exports.OrgId = exports.DataChannel = void 0;
var zod_1 = require("zod");
exports.DataChannel = zod_1.z.object({
    id: zod_1.z.string(),
    accessSwitch: zod_1.z.boolean(),
    name: zod_1.z.string(),
    endpoint: zod_1.z.string(),
    description: zod_1.z.string(),
    creatorOrganization: zod_1.z.string(),
});
exports.OrgId = zod_1.z.string();
exports.UserId = zod_1.z.string();
exports.DataChannelId = zod_1.z.string();
