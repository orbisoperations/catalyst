/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import {
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
type ListChannelsProps = {
  listChannels: (token: string) => Promise<any[]>;
};

export default function DataChannelListComponents({
  listChannels,
}: ListChannelsProps) {
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const { token } = useUser();
  useEffect(() => {
    if (token === undefined) return;
    listChannels(token).then((data) => {
      setChannels(data);
    });
  }, [token]);

  // TODO: Update to use the dynamic organization id
  return (
    <ListView
      showSpinner={false}
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
        adjacent: <OrbisBadge>Hello</OrbisBadge>,
        text: "Data Channels",
      }}
      positionChildren="bottom"
      subtitle="All your data channels in one place."
      table={
        channels.length > 0 ? (
          <Card variant={"outline"} shadow={"md"}>
            <OrbisTable
              headers={["Data Channel", "Description", "Endpoint"]}
              rows={channels.map(
                (channel: {
                  id: string;
                  name: string;
                  description: string;
                  endpoint: string;
                }) => {
                  return [
                    <Flex key={"1"} justifyContent={"space-between"}>
                      <OpenButton
                        onClick={() => router.push("/channels/" + channel.id)}
                      >
                        {channel.name}
                      </OpenButton>
                      <OrbisBadge>Shared</OrbisBadge>
                    </Flex>,
                    channel.description,
                    channel.endpoint,
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
