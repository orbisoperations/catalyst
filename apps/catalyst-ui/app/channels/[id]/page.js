"use client";
"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.runtime = "edge";
var elements_1 = require("@/components/elements");
var layouts_1 = require("@/components/layouts");
var nav_utils_1 = require("@/utils/nav.utils");
var client_1 = require("@apollo/client");
var card_1 = require("@chakra-ui/card");
var layout_1 = require("@chakra-ui/layout");
var react_1 = require("@chakra-ui/react");
var solid_1 = require("@heroicons/react/20/solid");
var navigation_1 = require("next/navigation");
var react_2 = require("react");
function DataChannelDetailsPage() {
    var _a = (0, react_1.useDisclosure)(), isOpen = _a.isOpen, onOpen = _a.onOpen, onClose = _a.onClose;
    var editDisclosure = (0, react_1.useDisclosure)();
    var DELETE_QUERY = (0, client_1.gql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    mutation deleteChannel($id: String!) {\n      deleteDataChannel(id: $id)\n    }\n  "], ["\n    mutation deleteChannel($id: String!) {\n      deleteDataChannel(id: $id)\n    }\n  "])));
    var router = (0, navigation_1.useRouter)();
    var id = (0, navigation_1.useParams)().id;
    var deleteChannel = (0, client_1.useMutation)(DELETE_QUERY)[0];
    var _b = (0, react_2.useState)(), channel = _b[0], setChannel = _b[1];
    var _c = (0, react_2.useState)(), editChannel = _c[0], setEditChannel = _c[1];
    var organizations = [
        {
            name: "Organization 1",
            id: "org1",
        },
        {
            name: "Organization 2",
            id: "org2",
        },
        {
            name: "Organization 3",
            id: "org3",
        },
        {
            name: "Organization 4",
            id: "org4",
        },
    ];
    var GET_DATA_CHANNEL = (0, client_1.gql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n    query getDataChannel($id: String!) {\n      dataChannelById(id: $id) {\n        id\n        accessSwitch\n        name\n        description\n        endpoint\n        creatorOrganization\n      }\n    }\n  "], ["\n    query getDataChannel($id: String!) {\n      dataChannelById(id: $id) {\n        id\n        accessSwitch\n        name\n        description\n        endpoint\n        creatorOrganization\n      }\n    }\n  "])));
    var UPDATE_DATA_CHANNEL = (0, client_1.gql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n    mutation updateDataChannel(\n      $id: String!\n      $accessSwitch: Boolean!\n      $name: String!\n      $description: String!\n      $endpoint: String!\n      $creatorOrganization: String!\n    ) {\n      updateDataChannel(\n        input: {\n          id: $id\n          accessSwitch: $accessSwitch\n          name: $name\n          description: $description\n          endpoint: $endpoint\n          creatorOrganization: $creatorOrganization\n        }\n      ) {\n        id\n      }\n    }\n  "], ["\n    mutation updateDataChannel(\n      $id: String!\n      $accessSwitch: Boolean!\n      $name: String!\n      $description: String!\n      $endpoint: String!\n      $creatorOrganization: String!\n    ) {\n      updateDataChannel(\n        input: {\n          id: $id\n          accessSwitch: $accessSwitch\n          name: $name\n          description: $description\n          endpoint: $endpoint\n          creatorOrganization: $creatorOrganization\n        }\n      ) {\n        id\n      }\n    }\n  "])));
    var updateDataChannel = (0, client_1.useMutation)(UPDATE_DATA_CHANNEL)[0];
    var _d = (0, client_1.useQuery)(GET_DATA_CHANNEL, {
        variables: { id: id },
    }), data = _d.data, loading = _d.loading, refetch = _d.refetch;
    (0, react_2.useEffect)(function () {
        if (data && data.dataChannelById) {
            setChannel(data.dataChannelById);
            setEditChannel(data.dataChannelById);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);
    return (<layouts_1.DetailedView showSpinner={loading} actions={<layout_1.Flex gap={10}>
          <layout_1.Flex gap={2} align={"center"}>
            {channel && (<>
                <react_1.Switch colorScheme="green" defaultChecked={(channel === null || channel === void 0 ? void 0 : channel.accessSwitch) ? channel.accessSwitch : false} onChange={function (e) {
                    if (editChannel) {
                        var variables = __assign(__assign({}, editChannel), { accessSwitch: e.target.checked ? true : false });
                        updateDataChannel({
                            variables: variables,
                        }).then(function () {
                            refetch().then(function (res) {
                                setChannel(res.data.dataChannelById);
                                setEditChannel(res.data.dataChannelById);
                            });
                        });
                    }
                }}/>
                <layout_1.Text>Enable</layout_1.Text>
              </>)}
          </layout_1.Flex>
          <layout_1.Flex gap={5} align={"center"}>
            <elements_1.OrbisButton p={2} rounded={"full"} onClick={editDisclosure.onOpen}>
              <solid_1.PencilSquareIcon />
            </elements_1.OrbisButton>
            <elements_1.TrashButton onClick={onOpen}/>
          </layout_1.Flex>
        </layout_1.Flex>} headerTitle={{
            adjacent: (channel === null || channel === void 0 ? void 0 : channel.creatorOrganization) === "org2" ? (
            // TODO: Enable Shared with you badge
            <elements_1.OrbisBadge> Shared with you </elements_1.OrbisBadge>) : (<></>),
            text: channel ? ("Channel: " + channel.name) : "",
        }} subtitle={channel === null || channel === void 0 ? void 0 : channel.description} topbaractions={nav_utils_1.navigationItems} topbartitle="Data Channel Details">
      <div>
        <div id="delete-modal">
          <react_1.Modal isOpen={isOpen} onClose={onClose}>
            <react_1.ModalOverlay />
            <react_1.ModalContent>
              <react_1.ModalHeader>
                Are you sure you want to delete this channel?
              </react_1.ModalHeader>
              <react_1.ModalBody>
                <layout_1.Text>
                  Deleting this channel will remove all associated data
                </layout_1.Text>
              </react_1.ModalBody>
              <react_1.ModalFooter>
                <layout_1.Flex gap={5}>
                  <elements_1.OrbisButton colorScheme="gray" onClick={onClose}>
                    Cancel
                  </elements_1.OrbisButton>
                  <elements_1.OrbisButton colorScheme="red" onClick={function () {
            if (id && typeof id === "string")
                deleteChannel({ variables: { id: id } }).then(function () {
                    onClose();
                    router.push("/channels");
                });
        }}>
                    Delete
                  </elements_1.OrbisButton>
                </layout_1.Flex>
              </react_1.ModalFooter>
            </react_1.ModalContent>
          </react_1.Modal>
        </div>
        <div id="edit-modal">
          <react_1.Modal isOpen={editDisclosure.isOpen} onClose={editDisclosure.onClose}>
            <react_1.ModalOverlay />
            <react_1.ModalContent>
              <react_1.ModalHeader>Edit Data Channel</react_1.ModalHeader>
              <react_1.ModalBody>
                <form onSubmit={function (e) {
            var _a;
            e.preventDefault();
            var formData = new FormData(e.currentTarget);
            var data = {
                name: formData.get("name"),
                description: formData.get("description"),
                endpoint: formData.get("endpoint"),
                creatorOrganization: formData.get("organization"),
                accessSwitch: (_a = channel === null || channel === void 0 ? void 0 : channel.accessSwitch) !== null && _a !== void 0 ? _a : false
            };
            if (channel) {
                var variables = __assign(__assign({}, data), { id: channel.id });
                updateDataChannel({
                    variables: variables,
                }).then(function () {
                    refetch().then(function (res) {
                        setChannel(res.data.dataChannelById);
                        setEditChannel(res.data.dataChannelById);
                    });
                    editDisclosure.onClose();
                });
            }
        }}>
                  <layout_1.Grid gap={5}>
                    <react_1.FormControl display={"grid"} gap={2}>
                      <label htmlFor="name">Data Channel Name</label>
                      <react_1.Input rounded="md" name="name" required={true} value={editChannel === null || editChannel === void 0 ? void 0 : editChannel.name} onChange={function (e) {
            editChannel &&
                setEditChannel(__assign(__assign({}, editChannel), { name: e.target.value }));
        }} placeholder="Data Channel Name"/>
                    </react_1.FormControl>
                    <react_1.FormControl display={"grid"} gap={2}>
                      <label htmlFor="description">Description</label>
                      <react_1.Textarea rounded="md" name="description" required={true} value={editChannel === null || editChannel === void 0 ? void 0 : editChannel.description} onChange={function (e) {
            editChannel &&
                setEditChannel(__assign(__assign({}, editChannel), { description: e.target.value }));
        }} placeholder="Description"/>
                    </react_1.FormControl>
                    <react_1.FormControl display={"grid"} gap={2}>
                      <label htmlFor="endpoint">Endpoint URL</label>
                      <react_1.Input rounded="md" name="endpoint" required={true} value={editChannel === null || editChannel === void 0 ? void 0 : editChannel.endpoint} onChange={function (e) {
            editChannel &&
                setEditChannel(__assign(__assign({}, editChannel), { endpoint: e.target.value }));
        }} placeholder="Endpoint URL"/>
                    </react_1.FormControl>
                    <react_1.FormControl display={"none"}>
                      <label htmlFor="organization"></label>
                      <react_1.Input rounded="md" name="organization" required={true} value={"org1"}/>
                    </react_1.FormControl>
                    <layout_1.Flex justifyContent={"space-between"}>
                      <elements_1.OrbisButton colorScheme="gray" onClick={function () {
            editDisclosure.onClose();
            setEditChannel(channel);
        }}>
                        Cancel
                      </elements_1.OrbisButton>
                      <elements_1.OrbisButton type="submit">Save</elements_1.OrbisButton>
                    </layout_1.Flex>
                  </layout_1.Grid>
                </form>
              </react_1.ModalBody>
            </react_1.ModalContent>
          </react_1.Modal>
        </div>
        <form>
          <layout_1.Grid gap={5}>
            <react_1.FormControl display={"grid"} gap={2}>
              <label htmlFor="endpoint">Endpoint URL</label>
              <elements_1.APIKeyText w={'100%'} showAsClearText allowCopy>
                {channel === null || channel === void 0 ? void 0 : channel.endpoint}
              </elements_1.APIKeyText>
            </react_1.FormControl>

            <layout_1.Flex direction={"column"} gap={5}>
              <card_1.Card>
                <card_1.CardHeader>
                  <layout_1.Heading size="md">Available Metadata</layout_1.Heading>
                </card_1.CardHeader>

                <card_1.CardBody>
                  <layout_1.Stack divider={<layout_1.StackDivider />} spacing="4">
                    <layout_1.Box>
                      <layout_1.Heading size="xs" textTransform="uppercase">
                        Summary
                      </layout_1.Heading>
                      <layout_1.Text pt="2" fontSize="sm">
                        View a summary of all your clients over the last month.
                      </layout_1.Text>
                    </layout_1.Box>
                    <layout_1.Box>
                      <layout_1.Heading size="xs" textTransform="uppercase">
                        JSON
                      </layout_1.Heading>
                      <layout_1.Text pt="2" fontSize="sm">
                        {"{\"name\":\"John\", \"age\":30, \"car\":null}"}
                      </layout_1.Text>
                    </layout_1.Box>
                  </layout_1.Stack>
                </card_1.CardBody>
              </card_1.Card>
              {/* TODO: enable sharing view on the UI */}
              {(channel === null || channel === void 0 ? void 0 : channel.creatorOrganization) === "org2" && (<card_1.Card>
                  <card_1.CardHeader>
                    <layout_1.Flex justify={"space-between"} gap={5} align={"center"}>
                      <layout_1.Box>
                        <layout_1.Heading size="md">
                          Accessible to N organization(s)
                        </layout_1.Heading>
                        <layout_1.Text mt={2} fontSize={"small"}>
                          This data channel is being shared with the following
                          organizations
                        </layout_1.Text>
                      </layout_1.Box>
                      <elements_1.ShareButton />
                    </layout_1.Flex>
                  </card_1.CardHeader>
                  <card_1.CardBody>
                    <layout_1.Stack divider={<layout_1.StackDivider />} spacing="4">
                      {organizations.map(function (org) { return (<layout_1.Flex justify={"space-between"} key={org.id}>
                          <layout_1.Text>{org.name}</layout_1.Text>
                          <layout_1.Flex align={"center"} gap={10}>
                            <react_1.Switch colorScheme="green" size="sm"/>
                            <elements_1.TrashButton size="sm"/>
                          </layout_1.Flex>
                        </layout_1.Flex>); })}
                    </layout_1.Stack>
                  </card_1.CardBody>
                </card_1.Card>)}
            </layout_1.Flex>
          </layout_1.Grid>
        </form>
      </div>
    </layouts_1.DetailedView>);
}
exports.default = DataChannelDetailsPage;
var templateObject_1, templateObject_2, templateObject_3;
