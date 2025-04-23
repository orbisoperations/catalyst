/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import {
  APIKeyText,
  EditButton,
  ErrorCard,
  OrbisBadge,
  OrbisButton,
  OrbisCard,
  TrashButton,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Card, CardBody, CardHeader } from "@chakra-ui/card";
import {
  Box,
  Flex,
  Grid,
  Heading,
  Stack,
  StackDivider,
  Text,
} from "@chakra-ui/layout";
import {
  FormControl,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DataChannel } from "../../../../packages/schema_zod";
import { useUser } from "../contexts/User/UserContext";

export const runtime = "edge";
type DataChannelDetailsProps = {
  channelDetails: (id: string, token: string) => Promise<DataChannel>;
  updateChannel: (data: FormData, token: string) => Promise<DataChannel>;
  deleteChannel: (id: string, token: string) => Promise<DataChannel>;
  handleSwitch: (
    channelId: string,
    accessSwitch: boolean,
    token: string
  ) => Promise<DataChannel>;
};

export default function DataChannelDetailsComponent({
  channelDetails,
  updateChannel,
  deleteChannel,
  handleSwitch,
}: DataChannelDetailsProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const editDisclosure = useDisclosure();
  const router = useRouter();
  const [gatewayUrl, setGatewayUrl] = useState<string>(
    "https://gateway.catalyst.intelops.io/graphql"
  );
  const { user, token } = useUser();
  const { id } = useParams();
  const [channel, setChannel] = useState<DataChannel>();
  const [hasError, setHasError] = useState<boolean>(false);
  const [editChannel, setEditChannel] = useState<DataChannel>();
  const [errorMessage, setErrorMessage] = useState<string>("");
  function fetchChannelDetails() {
    setHasError(false);
    if (id && typeof id === "string" && token)
      channelDetails(id, token)
        .then((data) => {
          setChannel(data);
          setEditChannel(data);
          editDisclosure.onClose();
        })
        .catch((e) => {
          setHasError(true);
          setErrorMessage(
            "An error occurred while fetching the channel details. Does the channel exist?"
          );
          console.error(e);
        });
  }

  useEffect(() => {
    "use client";
    if (window.location.origin) {
      const url = window.location.origin.includes("catalyst")
        ? window.location.origin
        : "https://catalyst.devintelops.io";
      setGatewayUrl(url.replace("catalyst", "gateway") + "/graphql");
    }
  }, []);
  useEffect(fetchChannelDetails, [token]);

  return (
    <DetailedView
      showspinner={!channel && !hasError}
      actions={
        !hasError &&
        channel &&
        channel.creatorOrganization === user?.custom.org ? (
          <Flex gap={10}>
            <Flex gap={2} align={"center"}>
              <Switch
                colorScheme="green"
                defaultChecked={channel?.accessSwitch ?? false}
                onChange={(e) => {
                  if (channel) {
                    handleSwitch(
                      channel.id,
                      e.target.checked ? true : false,
                      token ?? ""
                    )
                      .then(fetchChannelDetails)
                      .catch((e) => {
                        setHasError(true);
                        setErrorMessage(
                          "An error occurred while updating the channel. Please try again later."
                        );
                      });
                  }
                }}
              />
              <Text>Enable</Text>
            </Flex>
            <Flex gap={5} align={"center"}>
              <EditButton onClick={editDisclosure.onOpen} />
              <TrashButton onClick={onOpen} />
            </Flex>
          </Flex>
        ) : (
          <></>
        )
      }
      headerTitle={{
        adjacent:
          !channel?.creatorOrganization === (user?.custom.org || "") ? (
            // TODO: Enable Shared with you badge
            <OrbisBadge> Shared with you </OrbisBadge>
          ) : (
            <></>
          ),
        text: channel ? "Channel: " + channel.name : "",
      }}
      subtitle={channel?.description}
      topbaractions={navigationItems}
      topbartitle="Data Channel Details"
    >
      <div>
        <div id="modals">
          <div id="delete-modal">
            <Modal isOpen={isOpen} onClose={onClose}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>
                  Are you sure you want to delete this channel?
                </ModalHeader>
                <ModalBody>
                  <Text>
                    Deleting this channel will remove all associated data
                  </Text>
                </ModalBody>
                <ModalFooter>
                  <Flex gap={5}>
                    <OrbisButton colorScheme="gray" onClick={onClose}>
                      Cancel
                    </OrbisButton>
                    <OrbisButton
                      colorScheme="red"
                      onClick={() => {
                        if (id && typeof id === "string" && token)
                          deleteChannel(id, token)
                            .then(() => {
                              onClose();
                              router.push("/channels");
                            })
                            .catch((e) => {
                              onClose();
                              setHasError(true);
                              setErrorMessage(
                                "An error occurred while deleting the channel. Please try again later."
                              );
                            });
                      }}
                    >
                      Delete
                    </OrbisButton>
                  </Flex>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
          <div id="edit-modal">
            <Modal
              isOpen={editDisclosure.isOpen}
              onClose={editDisclosure.onClose}
            >
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Edit Data Channel</ModalHeader>
                <ModalBody>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      if (editChannel && token) {
                        formData.append("id", editChannel.id);
                        formData.append("organization", user?.custom.org);
                        formData.set(
                          "name",

                          user?.custom.org + "/" + formData.get("name")
                        );
                        updateChannel(formData, token)
                          .then(fetchChannelDetails)
                          .catch((e) => {
                            editDisclosure.onClose();
                            setHasError(true);
                            setErrorMessage(
                              "An error occurred while updating the channel. Please try again later."
                            );
                          });
                      }
                    }}
                  >
                    <Grid gap={5}>
                      <FormControl display={"grid"} gap={2}>
                        <label htmlFor="name">Data Channel Name</label>
                        <InputGroup>
                          <InputLeftAddon>{user?.custom.org}/</InputLeftAddon>
                          <Input
                            rounded="md"
                            name="name"
                            required={true}
                            defaultValue={editChannel?.name?.split("/")[1]}
                            onChange={(e) => {
                              editChannel &&
                                setEditChannel({
                                  ...editChannel,
                                  name: e.target.value,
                                });
                            }}
                            placeholder="Data Channel Name"
                          />
                        </InputGroup>
                      </FormControl>
                      <FormControl display={"grid"} gap={2}>
                        <label htmlFor="description">Description</label>
                        <Textarea
                          rounded="md"
                          name="description"
                          required={true}
                          value={editChannel?.description}
                          onChange={(e) => {
                            editChannel &&
                              setEditChannel({
                                ...editChannel,
                                description: e.target.value,
                              });
                          }}
                          placeholder="Description"
                        />
                      </FormControl>
                      <FormControl display={"grid"} gap={2}>
                        <label htmlFor="endpoint">Endpoint URL</label>
                        <Input
                          rounded="md"
                          name="endpoint"
                          required={true}
                          value={editChannel?.endpoint}
                          onChange={(e) => {
                            editChannel &&
                              setEditChannel({
                                ...editChannel,
                                endpoint: e.target.value,
                              });
                          }}
                          placeholder="Endpoint URL"
                        />
                      </FormControl>
                      <FormControl display={"none"}>
                        <label htmlFor="accessSwitch"></label>
                        <Input
                          rounded="md"
                          name="accessSwitch"
                          required={true}
                          defaultValue={
                            editChannel?.accessSwitch ? "on" : "off"
                          }
                        />
                      </FormControl>
                      <Flex justifyContent={"space-between"}>
                        <OrbisButton
                          colorScheme="gray"
                          onClick={() => {
                            editDisclosure.onClose();
                            setEditChannel(channel);
                          }}
                        >
                          Cancel
                        </OrbisButton>
                        <OrbisButton type="submit">Save</OrbisButton>
                      </Flex>
                    </Grid>
                  </form>
                </ModalBody>
              </ModalContent>
            </Modal>
          </div>
        </div>
        {hasError ? (
          <ErrorCard
            title="Error"
            message={errorMessage}
            goBack={router.back}
            retry={fetchChannelDetails}
          />
        ) : (
          <Grid gap={5}>
            <Grid gap={5} gridTemplateColumns={"1fr 1fr"}>
              <FormControl display={"grid"} gap={2}>
                <label htmlFor="gatewayUrl">Access URL</label>
                <APIKeyText width={"100%"} allowCopy showAsClearText>
                  {gatewayUrl}
                </APIKeyText>
              </FormControl>
              {channel?.creatorOrganization === user?.custom.org ? (
                <FormControl display={"grid"} gap={2}>
                  <label htmlFor="endpoint">Source URL</label>
                  <APIKeyText width={"100%"} allowCopy showAsClearText>
                    {channel?.endpoint}
                  </APIKeyText>
                </FormControl>
              ) : (
                <></>
              )}
              <FormControl display={"grid"} gap={2}>
                <label htmlFor="description">Channel ID</label>
                <APIKeyText width={"100%"} allowCopy showAsClearText>
                  {channel?.id}
                </APIKeyText>
              </FormControl>
            </Grid>

            <Flex direction={"column"} gap={5}>
              <Card>
                <CardHeader>
                  <Heading size="md">Available Metadata</Heading>
                </CardHeader>

                <CardBody>
                  <Stack divider={<StackDivider />} spacing="4">
                    <Box>
                      <Heading size="xs" textTransform="uppercase">
                        No Metadata Available
                      </Heading>
                      <Text pt="2" fontSize="sm">
                        Intentionally Left Blank
                      </Text>
                    </Box>
                  </Stack>
                </CardBody>
              </Card>
              {/* TODO: enable sharing view on the UI */}
              {/* channel?.creatorOrganization === "org2" && (
                <Card>
                  <CardHeader>
                    <Flex justify={"space-between"} gap={5} align={"center"}>
                      <Box>
                        <Heading size="md">
                          Accessible to N organization(s)
                        </Heading>
                        <Text mt={2} fontSize={"small"}>
                          This data channel is being shared with the following
                          organizations
                        </Text>
                      </Box>
                      <ShareButton />
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Stack divider={<StackDivider />} spacing="4">
                      {organizations.map((org) => (
                        <Flex justify={"space-between"} key={org.id}>
                          <Text>{org.name}</Text>
                          <Flex align={"center"} gap={10}>
                            <Switch colorScheme="green" size="sm" />
                            <TrashButton size="sm" />
                          </Flex>
                        </Flex>
                      ))}
                    </Stack>
                  </CardBody>
                </Card>
              ) */}
            </Flex>
          </Grid>
        )}
      </div>
    </DetailedView>
  );
}
