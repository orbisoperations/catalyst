"use client";
import {
  CreateButton,
  OpenButton,
  OrbisBadge,
  OrbisTable,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { OperationVariables, gql, useQuery } from "@apollo/client";
import { Flex } from "@chakra-ui/layout";
import { Card, CardBody } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function DataChannelListPage() {
  const router = useRouter();
  const GET_DATA_CHANNEL_BY_CREATOR_ORG = gql`
    query dataChannelsByCreatorOrg($creatorOrganization: String!) {
      dataChannelsByCreatorOrg(creatorOrganization: $creatorOrganization) {
        description
        endpoint
        id
        name
        creatorOrganization
      }
    }
  `;
  // TODO: Update to use the dynamic organization id
  const orgVariable: OperationVariables = { creatorOrganization: "org1" };
  const { data, loading, error } = useQuery(GET_DATA_CHANNEL_BY_CREATOR_ORG, {
    variables: orgVariable,
  });

  useEffect(() => {
    console.log(loading, data);
  }, [loading]);

  return (
    <ListView
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
        (data && data.dataChannelsByCreatorOrg) ? 
        <Card variant={"outline"} shadow={"md"}>
            <OrbisTable
              headers={["Data Channel", "Description", "Endpoint"]}
              rows={data.dataChannelsByCreatorOrg.map(
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
          
        </Card> : 
        <Card>
          <CardBody>
          No Channels Available
          </CardBody>
        </Card>

      }
      topbartitle="Data Channels"
    ></ListView>
  );
}
