"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var pnpmls_json_1 = __importDefault(require("../pnpmls.json"));
var objs = pnpmls_json_1.default.map(function (e) {
    return [e.name, e];
});
var deps = [];
//console.log(objs)
while (objs.length > 0) {
    var _a = objs.pop(), depname = _a[0], depobj = _a[1];
    //console.log(depname, depobj)
    if ("dependencies" in depobj) {
        var subDeps = Object.entries(depobj['dependencies']);
        objs.push.apply(objs, subDeps);
    }
    deps.push({
        name: depname,
        version: ("version" in depobj) ? depobj["version"] : "No Version Provided",
        license: ("license" in depobj) ? depobj["license"] : "\"No License Provided\"",
    });
}
var licenses = new Map();
deps.forEach(function (d) {
    if (licenses.has(d.license)) {
        var existingDeps = licenses.get(d.license);
        licenses.set(d.license, __spreadArray([d.name], existingDeps, true));
    }
    else {
        licenses.set(d.license, [d.name]);
    }
});
var pkgCount = 0;
var licCount = 0;
licenses.forEach(function (v, k) {
    licCount += 1;
    pkgCount += v.length;
    console.log("license ".concat(k, " is used by ").concat(v.length, " packages"));
});
console.log("".concat(licCount, " license used across ").concat(pkgCount, " packages"));
//console.log(licenses)
