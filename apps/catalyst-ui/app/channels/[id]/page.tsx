"use client";
export const runtime = "edge";
import {
  OrbisBadge,
  OrbisButton,
  ShareButton,
  TrashButton,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { gql, useMutation, useQuery } from "@apollo/client";
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
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DataChannel = {
  id: string;
  accessSwitch: boolean;
  name: string;
  description: string;
  endpoint: string;
  creatorOrganization: string;
};
export default function DataChannelDetailsPage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const editDisclosure = useDisclosure();
  const DELETE_QUERY = gql`
    mutation deleteChannel($id: String!) {
      deleteDataChannel(id: $id)
    }
  `;
  const router = useRouter();
  const { id } = useParams();
  const [deleteChannel] = useMutation(DELETE_QUERY);
  const [channel, setChannel] = useState<DataChannel>();
  const [editChannel, setEditChannel] = useState<DataChannel>();
  const organizations = [
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
  const GET_DATA_CHANNEL = gql`
    query getDataChannel($id: String!) {
      dataChannelById(id: $id) {
        id
        accessSwitch
        name
        description
        endpoint
        creatorOrganization
      }
    }
  `;
  const UPDATE_DATA_CHANNEL = gql`
    mutation updateDataChannel(
      $id: String!
      $accessSwitch: Boolean!
      $name: String!
      $description: String!
      $endpoint: String!
      $creatorOrganization: String!
    ) {
      updateDataChannel(
        input: {
          id: $id
          accessSwitch: $accessSwitch
          name: $name
          description: $description
          endpoint: $endpoint
          creatorOrganization: $creatorOrganization
        }
      ) {
        id
      }
    }
  `;

  const [updateDataChannel] = useMutation(UPDATE_DATA_CHANNEL);

  const { data, loading, refetch } = useQuery(GET_DATA_CHANNEL, {
    variables: { id },
  });

  useEffect(() => {
    if (data && data.dataChannelById) {
      setChannel(data.dataChannelById);
      setEditChannel(data.dataChannelById);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  return (
    <DetailedView
      actions={
        <Flex gap={10}>
          <Flex gap={2} align={"center"}>
            { channel && ( 
              <>
                <Switch colorScheme="green" defaultChecked={ channel?.accessSwitch ? channel.accessSwitch : false } onChange={e => {
                  if (editChannel) {
                    const variables = {
                        ...editChannel,
                      accessSwitch: e.target.checked ? true : false,
                    };
                    updateDataChannel({
                      variables,
                    }).then(() => {
                      refetch().then((res) => {
                        setChannel(res.data.dataChannelById);
                        setEditChannel(res.data.dataChannelById);
                      });
                    });
                  }
                }}/>
                <Text>Enable</Text>
              </>
            )}
          </Flex>
          <Flex gap={5} align={"center"}>
            <OrbisButton p={2} rounded={"full"} onClick={editDisclosure.onOpen}>
              <PencilSquareIcon />
            </OrbisButton>
            <TrashButton onClick={onOpen} />
          </Flex>
        </Flex>
      }
      headerTitle={{
        adjacent:
          channel?.creatorOrganization === "org2" ? (
            // TODO: Enable Shared with you badge
            <OrbisBadge> Shared with you </OrbisBadge>
          ) : (
            <></>
          ),
        text: channel ? ("Channel: " + channel.name) : "",
      }}
      subtitle={channel?.description}
      topbaractions={navigationItems}
      topbartitle="Data Channel Details"
    >
      <div>
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
                      if (id && typeof id === "string")
                        deleteChannel({ variables: { id } }).then(() => {
                          onClose();
                          router.push("/channels");
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
                    const data = {
                      name: formData.get("name"),
                      description: formData.get("description"),
                      endpoint: formData.get("endpoint"),
                      creatorOrganization: formData.get("organization"),
                    };
                    if (channel) {
                      const variables = {
                        id: channel.id,
                        ...data,
                      };
                      updateDataChannel({
                        variables,
                      }).then(() => {
                        refetch().then((res) => {
                          setChannel(res.data.dataChannelById);
                          setEditChannel(res.data.dataChannelById);
                        });
                        editDisclosure.onClose();
                      });
                    }
                  }}
                >
                  <Grid gap={5}>
                    <FormControl display={"grid"} gap={2}>
                      <label htmlFor="name">Data Channel Name</label>
                      <Input
                        rounded="md"
                        name="name"
                        required={true}
                        value={editChannel?.name}
                        onChange={(e) => {
                          editChannel &&
                            setEditChannel({
                              ...editChannel,
                              name: e.target.value,
                            });
                        }}
                        placeholder="Data Channel Name"
                      />
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
                      <label htmlFor="organization"></label>
                      <Input
                        rounded="md"
                        name="organization"
                        required={true}
                        value={"org1"}
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
        <form>
          <Grid gap={5}>
            <FormControl display={"grid"} gap={2}>
              <label htmlFor="endpoint">Endpoint URL</label>
              <Input
                rounded="md"
                name="endpoint"
                required={true}
                readOnly={true}
                value={channel?.endpoint ?? ""}
                placeholder="Endpoint URL"
              />
            </FormControl>

            <Flex direction={"column"} gap={5}>
              <Card>
                <CardHeader>
                  <Heading size="md">Available Metadata</Heading>
                </CardHeader>

                <CardBody>
                  <Stack divider={<StackDivider />} spacing="4">
                    <Box>
                      <Heading size="xs" textTransform="uppercase">
                        Summary
                      </Heading>
                      <Text pt="2" fontSize="sm">
                        View a summary of all your clients over the last month.
                      </Text>
                    </Box>
                    <Box>
                      <Heading size="xs" textTransform="uppercase">
                        JSON
                      </Heading>
                      <Text pt="2" fontSize="sm">
                        {`{"name":"John", "age":30, "car":null}`}
                      </Text>
                    </Box>
                  </Stack>
                </CardBody>
              </Card>
              {/* TODO: enable sharing view on the UI */}
              {channel?.creatorOrganization === "org2" && (
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
              )}
            </Flex>
          </Grid>
        </form>
      </div>
    </DetailedView>
  );
}
