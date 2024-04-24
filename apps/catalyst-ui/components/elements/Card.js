"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrbisCard = void 0;
var card_1 = require("@chakra-ui/card");
var react_1 = require("@chakra-ui/react");
var OrbisCard = function (props) {
    var children = props.children, _a = props.size, size = _a === void 0 ? "md" : _a, _b = props.paddingSize, paddingSize = _b === void 0 ? "md" : _b, content = props.content, title = props.title, header = props.header, headerActions = props.headerActions, actions = props.actions, cardProps = __rest(props, ["children", "size", "paddingSize", "content", "title", "header", "headerActions", "actions"]);
    return (<card_1.Card size={size} padding={paddingSize == "sm"
            ? "8px"
            : paddingSize == "md"
                ? "16px"
                : paddingSize == "lg"
                    ? "24px"
                    : "0px"} variant={"outline"} shadow={"sm"} {...cardProps}>
      <react_1.Box display={"grid"} gridTemplateColumns={"1fr 1fr"} alignItems={"center"}>
        {header && <react_1.Text fontSize={"2xl"}>{header}</react_1.Text>}

        {headerActions && <react_1.Flex justify={"end"}>{headerActions}</react_1.Flex>}
      </react_1.Box>
      {children}
      {actions && <react_1.Flex pt={"8px"}>{actions}</react_1.Flex>}
    </card_1.Card>);
};
exports.OrbisCard = OrbisCard;
