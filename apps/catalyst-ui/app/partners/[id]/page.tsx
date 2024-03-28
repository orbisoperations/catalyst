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
import { useRouter } from "next/navigation";
export default function PartnersPage() {
  const router = useRouter();
  const channels = [
    {
      name: "Channel 1",
      shareId: "1",
      type: "Incoming",
    },
    {
      name: "Channel 2",
      shareid: "2",
      type: "Outgoing",
    },
  ];
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <ListView
      topbaractions={navigationItems}
      actions={
        <Flex gap={5}>
          <TrashButton
            onClick={() => {
              onOpen();
            }}
          />
        </Flex>
      }
      headerTitle={{
        adjacent: <OrbisBadge>Hello</OrbisBadge>,
        text: "Partner Name",
      }}
      positionChildren="bottom"
      subtitle=""
      table={
        <Flex gap={10}>
          <OrbisCard pb={0} header={"Shared Channels"} flex={2}>
            <OrbisTable
              headers={["Channel"]}
              rows={channels.map((channel) => [
                <Flex key={channel.shareId} justifyContent={"space-between"}>
                  <OpenButton
                    onClick={() => router.push("/channels/testDetail")}
                  >
                    {channel.name}
                  </OpenButton>
                  <Flex gap={5}>
                    {channel.type === "Outgoing" && (
                      <Switch colorScheme="green" defaultChecked />
                    )}
                    <OrbisBadge
                      colorScheme={
                        channel.type === "Incoming" ? "blue" : "green"
                      }
                    >
                      {channel.type == "Incoming" ? "Incoming" : "Outgoing"}
                    </OrbisBadge>
                  </Flex>
                </Flex>,
              ])}
              tableProps={{}}
            />
          </OrbisCard>
          <OrbisCard header="Partnership" flex={1} height={"min-content"}>
            <Stack divider={<StackDivider />}>
              <Box>Partners since 2021</Box>
              <Box>Outgoing Channel 1</Box>
              <Box>Incoming Channel 1</Box>
            </Stack>
          </OrbisCard>
        </Flex>
      }
      topbartitle="Partners"
    >
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Revoke Partnership</ModalHeader>
          <ModalBody>
            Are you sure you want to revoke this partnership? This action cannot
            be undone.
          </ModalBody>
          <ModalFooter>
            <Flex justify={"flex-end"} gap={5}>
              <OrbisButton colorScheme="red" onClick={onClose}>
                Delete
              </OrbisButton>
              <OrbisButton colorScheme="gray" onClick={onClose}>
                Cancel
              </OrbisButton>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ListView>
  );
}
