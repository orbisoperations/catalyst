"use client";
export const runtime = "edge";
import { OrbisBadge, ShareButton, TrashButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
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
import { FormControl, Input, Switch } from "@chakra-ui/react";
import { useState } from "react";

export default function CreateChannelPage() {
  const [isOwner, setIsOwner] = useState(true);
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
  return (
    <OrbisProvider>
      <DetailedView
        actions={
          <Flex gap={10}>
            <Flex gap={2} align={"center"}>
              <Switch colorScheme="green" />
              <Text>Enable</Text>
            </Flex>
            <TrashButton />
          </Flex>
        }
        headerTitle={{
          adjacent: !isOwner ? (
            <OrbisBadge> Shared with you </OrbisBadge>
          ) : (
            <></>
          ),
          text: "N Metadata",
        }}
        subtitle="Description for the data channel"
        topbaractions={[]}
        topbartitle="Data Channel Details"
      >
        <div>
          <Flex gap={2} mb={5} align={"center"}>
            <Switch
              colorScheme="green"
              id="channel-status"
              size="md"
              isChecked={isOwner ? true : false}
              onChange={(e) => {
                setIsOwner((prev) => {
                  return e.target.checked;
                });
              }}
            />
            <Text> Is Owner (tmp control)</Text>
          </Flex>
          <form>
            <Grid gap={5}>
              <FormControl display={"grid"} gap={2}>
                <label htmlFor="endpoint">Endpoint URL</label>
                <Input
                  rounded="md"
                  name="endpoint"
                  required={true}
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
                          View a summary of all your clients over the last
                          month.
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
                {isOwner && (
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
    </OrbisProvider>
  );
}
