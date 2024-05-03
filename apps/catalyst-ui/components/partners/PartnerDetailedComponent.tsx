"use client";
export const runtime = "edge";
import {
  OpenButton,
  OrbisBadge,
  OrbisButton,
  OrbisCard,
  OrbisTable,
  TrashButton,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { DataChannel } from "@catalyst/schema_zod";
import { Box, Flex, Stack, StackDivider } from "@chakra-ui/layout";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  useDisclosure,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
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
    <ListView
      topbaractions={navigationItems}
      showspinner={!token}
      actions={<></>}
      headerTitle={{
        adjacent: <OrbisBadge>Hello</OrbisBadge>,
        text: (params.id as string) ?? "",
      }}
      positionChildren="bottom"
      subtitle=""
      table={
        <Flex gap={10}>
          <OrbisCard pb={0} header={"Shared Channels"} flex={2}>
            <OrbisTable
              headers={["Channel"]}
              rows={channels.map((channel, index) => [
                <Flex key={index} justifyContent={"space-between"}>
                  <OpenButton
                    onClick={() => router.push(`/channels/${channel.id}`)}
                  >
                    {channel.name}
                  </OpenButton>
                </Flex>,
              ])}
              tableProps={{}}
            />
          </OrbisCard>
        </Flex>
      }
      topbartitle="Partners"
    ></ListView>
  );
}
