/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import {
  APIKeyText,
  CreateButton,
  OpenButton,
  OrbisBadge,
  OrbisButton,
  OrbisTable,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Box, Flex } from "@chakra-ui/layout";
import { Card, CardBody, Select } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
import { DataChannel, DataChannelActionResponse } from "@catalyst/schema_zod";
type ListChannelsProps = {
  listChannels: (token: string) => Promise<DataChannelActionResponse>;
};

export default function DataChannelListComponents({
  listChannels,
}: ListChannelsProps) {
  const router = useRouter();
  const [channels, setChannels] = useState<DataChannel[]>([]);
  const [allChannels, setAllChannels] = useState<DataChannel[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "subscribed" | "owned">(
    "all"
  );
  const { token, user } = useUser();
  function filterChannels(filterMode: "all" | "subscribed" | "owned" = "all") {
    let filteredChannels = allChannels;
    if (filterMode === "subscribed") {
      filteredChannels = filteredChannels.filter((channel) => {
        return channel.creatorOrganization !== user?.custom.org;
      });
    }
    if (filterMode === "owned") {
      filteredChannels = filteredChannels.filter((channel) => {
        return channel.creatorOrganization === user?.custom.org;
      });
    }
    setChannels(filteredChannels);
  }

  useEffect(() => {
    if (token) {
      listChannels(token).then((data) => {
        if (!data.success) return console.error(data.error);
        const response = (data.data as DataChannel[]).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setAllChannels(response);
        setChannels(response);
      });
    }
  }, [token]);

  // TODO: Update to use the dynamic organization id
  return (
    <ListView
      //$showspinner={false ? true : undefined}
      actions={
        <Flex gap={5}>
          <CreateButton
            onClick={() => {
              router.push("/channels/create");
            }}
          />
        </Flex>
      }
      topbaractions={navigationItems}
      headerTitle={{
        text: "Data Channels",
      }}
      positionChildren="bottom"
      subtitle="All your data channels in one place."
      table={
        <Flex gap={5} direction={"column"}>
          <Card p={2}>
            <Flex gap={5} align={"center"}>
              <Select
                value={filterMode}
                onChange={(e) => {
                  filterChannels(
                    e.target.value as "all" | "subscribed" | "owned"
                  );
                  setFilterMode(
                    e.target.value as "all" | "subscribed" | "owned"
                  );
                }}
              >
                <option defaultChecked value="all">
                  All Channels
                </option>
                <option value="subscribed">Subscribed Channels</option>
                <option value="owned">My Organization Channels</option>
              </Select>
              <OrbisButton
                onClick={() => {
                  filterChannels("all");
                  setFilterMode("all");
                }}
              >
                Clear Filter
              </OrbisButton>
            </Flex>
          </Card>
          {channels.length > 0 ? (
            <Card>
              <OrbisTable
                headers={["Data Channel", "Description", "Channel ID"]}
                rows={channels.map((channel, index) => {
                  return [
                    <Flex
                      key={"1"}
                      justifyContent={"space-between"}
                      alignItems={"center"}
                      gap={2}
                      justifyItems={"center"}
                    >
                      <OpenButton
                        onClick={() => router.push("/channels/" + channel.id)}
                      >
                        {channel.name}
                      </OpenButton>
                      {channel.creatorOrganization === user?.custom.org ? (
                        channel.accessSwitch ? (
                          <OrbisBadge>Published</OrbisBadge>
                        ) : (
                          <OrbisBadge colorScheme="red">Disabled</OrbisBadge>
                        )
                      ) : (
                        <OrbisBadge colorScheme="green">Subscribed</OrbisBadge>
                      )}
                    </Flex>,
                    channel.description,
                    <APIKeyText
                      allowCopy
                      showAsClearText
                      key={index + "-channel-id"}
                    >
                      {channel.id}
                    </APIKeyText>,
                  ];
                })}
              />
            </Card>
          ) : (
            <Card>
              <CardBody>No Channels Available</CardBody>
            </Card>
          )}
        </Flex>
      }
      topbartitle="Data Channels"
    />
  );
}
