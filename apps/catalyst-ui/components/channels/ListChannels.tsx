/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import {
  APIKeyText,
  CreateButton,
  OpenButton,
  OrbisBadge,
  OrbisTable,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Flex } from "@chakra-ui/layout";
import { Card, CardBody } from "@chakra-ui/react";
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
  const [channels, setChannels] = useState<any[]>([]);
  const { token, user } = useUser();
  useEffect(() => {
    if (token) {
      listChannels(token).then((data) => {
        if (!data.success) return console.error(data.error);
        setChannels(data.data as DataChannel[]);
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
        channels.length > 0 ? (
          <Card variant={"outline"} shadow={"md"}>
            <OrbisTable
              headers={[
                "Data Channel",
                "Description",
                "Endpoint",
                "Channel ID",
              ]}
              rows={channels.map(
                (
                  channel: {
                    id: string;
                    name: string;
                    description: string;
                    endpoint: string;
                    creatorOrganization: string;
                  },
                  index
                ) => {
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
                      {channel.creatorOrganization === user?.custom.org && (
                        <OrbisBadge>Shared</OrbisBadge>
                      )}
                    </Flex>,
                    channel.description,
                    channel.endpoint,
                    <APIKeyText
                      allowCopy
                      showAsClearText
                      key={index + "-channel-id"}
                    >
                      {channel.id}
                    </APIKeyText>,
                  ];
                }
              )}
            />
          </Card>
        ) : (
          <Card>
            <CardBody>No Channels Available</CardBody>
          </Card>
        )
      }
      topbartitle="Data Channels"
    ></ListView>
  );
}
