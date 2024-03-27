"use client";
import {
  CreateButton,
  OpenButton,
  OrbisBadge,
  OrbisButton,
  OrbisCard,
  OrbisTable,
  TrashButton,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { navigationItems } from "@/utils/nav.utils";
import { Box, Flex, Stack, StackDivider, StackItem } from "@chakra-ui/layout";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
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
  const partners = [
    {
      name: "Partner 1",
      id: "1",
    },
    {
      name: "Partner 2",
      id: "2",
    },
  ];
  const invitations = [
    {
      organization: "Org 1",
      id: "1",
    },
    {
      organization: "Org 2",
      id: "2",
    },
  ];
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <OrbisProvider>
      <ListView
        topbaractions={navigationItems}
        actions={
          <Flex gap={5}>
            <CreateButton
              onClick={() => {
                router.push("/partners/invite");
              }}
            />
          </Flex>
        }
        headerTitle={{
          adjacent: <OrbisBadge>Hello</OrbisBadge>,
          text: "Partners",
        }}
        positionChildren="bottom"
        subtitle="Partners you can trust."
        table={
          <Flex gap={5}>
            <OrbisCard header={"Partners"} pb={0} flex={3} h="min-content">
              <OrbisTable
                headers={["Partner"]}
                rows={partners.map((channel) => [
                  <Box key={channel.id}>
                    <Flex justifyContent={"space-between"}>
                      <OpenButton
                        onClick={() => router.push("/partners/testDetail")}
                      >
                        {channel.name}
                      </OpenButton>
                      <Flex gap={10} align={"center"}>
                        <Switch colorScheme="green" defaultChecked />
                        <TrashButton onClick={onOpen} />
                      </Flex>
                    </Flex>
                  </Box>,
                ])}
                tableProps={{}}
              />
            </OrbisCard>
            <OrbisCard header={"Invitations"} h={"min-content"} flex={2}>
              <Stack divider={<StackDivider />}>
                {invitations.map((invitation) => (
                  <StackItem key={invitation.id}>
                    <OpenButton
                      onClick={() =>
                        router.push(`/partners/invite/accept/${invitation.id}`)
                      }
                    >
                      {invitation.organization} wants to partner with your
                      organization.
                    </OpenButton>
                  </StackItem>
                ))}
              </Stack>
            </OrbisCard>
          </Flex>
        }
        topbartitle="Partners"
      >
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Cancel Parnership</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <p>
                Are you sure you want to cancel this partnership? This action
                cannot be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Flex justify={"flex-end"} gap={5}>
                <OrbisButton
                  colorScheme="red"
                  onClick={() => {
                    onClose();
                    router.back();
                  }}
                >
                  Reject
                </OrbisButton>
                <OrbisButton colorScheme="gray" onClick={onClose}>
                  Cancel
                </OrbisButton>
              </Flex>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </ListView>
    </OrbisProvider>
  );
}
