"use client";
export const runtime = "edge";
import {
  APIKeyText,
  OpenButton,
  OrbisBadge,
  OrbisCard,
  OrbisTable,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { DataChannel } from "@catalyst/schema_zod";
import { Flex } from "@chakra-ui/layout";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
import { Text } from "@chakra-ui/layout";
type PartnerDetailedComponentProps = {
  listPartnersChannels: (
    token: string,
    partnerId: string
  ) => Promise<DataChannel[] | undefined>;
};
export default function PartnerDetailedComponent({
  listPartnersChannels,
}: PartnerDetailedComponentProps) {
  const router = useRouter();
  const params = useParams();
  const { token } = useUser();
  const [channels, setChannels] = useState<DataChannel[]>([]);
  useEffect(() => {
    if (params.id && typeof params.id === "string" && token) {
      listPartnersChannels(token, params.id).then((data) => {
        if (data) {
          setChannels(data);
        }
      });
    }
  }, [params.id, token]);
  return (
    <DetailedView
      topbaractions={navigationItems}
      showspinner={!token}
      actions={<></>}
      headerTitle={{
        adjacent: <OrbisBadge>Hello</OrbisBadge>,
        text: (params.id as string) ?? "",
      }}
      positionChildren="bottom"
      subtitle=""
      topbartitle="Partners"
    >
      <Flex gap={10}>
        <OrbisCard pb={0} header={"Shared Channels"} flex={2}>
          <OrbisTable
            headers={["Channel"]}
            rows={channels.map((channel, index) => [
              <Flex
                key={index}
                justifyContent={"space-between"}
                alignItems={"center"}
              >
                <OpenButton
                  onClick={() => router.push(`/channels/${channel.id}`)}
                >
                  {channel.name}
                </OpenButton>
                <Text>{channel.description}</Text>
                <APIKeyText allowCopy showAsClearText>
                  {channel.id}
                </APIKeyText>
              </Flex>,
            ])}
          />
        </OrbisCard>
      </Flex>
    </DetailedView>
  );
}
