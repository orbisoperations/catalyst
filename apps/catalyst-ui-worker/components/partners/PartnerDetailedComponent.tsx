"use client";

import {
  APIKeyText,
  ErrorCard,
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
    partnerId: string,
  ) => Promise<DataChannel[]>;
};
export default function PartnerDetailedComponent({
  listPartnersChannels,
}: PartnerDetailedComponentProps) {
  const router = useRouter();
  const params = useParams();
  const { token } = useUser();
  const [hasError, setHasError] = useState<boolean>(false);
  const [channels, setChannels] = useState<DataChannel[]>([]);
  function fetchChannels() {
    setHasError(false);
    if (params.id && typeof params.id === "string" && token) {
      listPartnersChannels(token, params.id)
        .then(setChannels)
        .catch((e) => {
          setHasError(true);
        });
    }
  }
  useEffect(fetchChannels, [params.id, token]);
  return (
    <DetailedView
      topbaractions={navigationItems}
      showspinner={!token && !hasError}
      actions={<></>}
      headerTitle={{
        text: (params.id as string) ?? "",
      }}
      positionChildren="bottom"
      subtitle=""
      topbartitle="Partners"
    >
      <Flex gap={10}>
        {hasError ? (
          <ErrorCard
            title="Error"
            message={
              "An error occurred while fetching the channels. Please try again later."
            }
            retry={fetchChannels}
          />
        ) : (
          <OrbisCard pb={0} header={"Shared Channels"} flex={2}>
            {channels.length > 0 ? (
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
            ) : (
              <Text my={5}>
                {params.id} is not sharing any channels with you
              </Text>
            )}
          </OrbisCard>
        )}
      </Flex>
    </DetailedView>
  );
}
