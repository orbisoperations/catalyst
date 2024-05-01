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
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
import { OrgInvite } from "../../../../packages/schema_zod";
type PartnersListComponentProps = {
  listInvites: (token: string) => Promise<OrgInvite[] | undefined>;
};
export default function PartnersListComponent({
  listInvites,
}: PartnersListComponentProps) {
  const router = useRouter();
  const [partners, setPartners] = useState<OrgInvite[]>([]);
  const [invitations, setInvitations] = useState<OrgInvite[]>([]);
  const { token, user } = useUser();
  useEffect(() => {
    if (token)
      listInvites(token).then((invites) => {
        const partners: OrgInvite[] = [];
        const invitations: OrgInvite[] = [];
        if (invites) {
          invites.forEach((invite) => {
            if (invite.status === "accepted") {
              partners.push(invite);
            }
            if (invite.status === "pending") {
              invitations.push(invite);
            }
          });
          setPartners(partners);
          setInvitations(invitations);
        }
      });
  }, [token]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
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
              rows={partners.map((partner) => [
                <Box key={partner.id}>
                  <Flex justifyContent={"space-between"}>
                    <OpenButton
                      onClick={() => router.push("/partners/" + partner.id)}
                    >
                      {partner.sender} - {partner.receiver}
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
          <OrbisCard
            header={`Invitations (${invitations.length})`}
            h={"min-content"}
            flex={2}
          >
            <Stack divider={<StackDivider />}>
              {invitations.map((invitation) => (
                <StackItem key={invitation.id}>
                  <OpenButton
                    onClick={() =>
                      router.push(`/partners/invite/accept/${invitation.id}`)
                    }
                  >
                    {invitation.sender} {invitation.receiver} wants to partner
                    with your organization. {invitation.status}
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
  );
}
