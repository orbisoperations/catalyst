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
import {
  Box,
  Flex,
  Stack,
  StackDivider,
  StackItem,
  Text,
} from "@chakra-ui/layout";
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
  declineInvite: (
    inviteId: string,
    token: string
  ) => Promise<OrgInvite | undefined>;
  togglePartnership(
    orgId: string,
    token: string
  ): Promise<OrgInvite | undefined>;
};
export default function PartnersListComponent({
  listInvites,
  declineInvite,
  togglePartnership,
}: PartnersListComponentProps) {
  const router = useRouter();
  const [partners, setPartners] = useState<OrgInvite[]>([]);
  const [invitations, setInvitations] = useState<OrgInvite[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<OrgInvite | null>(
    null
  );
  const { token, user } = useUser();
  function fetchInvites() {
    if (token)
      return listInvites(token).then((invites) => {
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
    return Promise.resolve();
  }

  function deletePartner(inviteID: string) {
    return declineInvite(inviteID, token ?? "").then(fetchInvites);
  }
  useEffect(() => {
    fetchInvites();
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
                      {partner.sender === user?.custom.org
                        ? partner.receiver
                        : partner.sender}
                    </OpenButton>
                    <Flex gap={10} align={"center"}>
                      <Switch
                        colorScheme="green"
                        defaultChecked={partner.isActive}
                        onChange={() => {
                          togglePartnership(partner.id, token ?? "").then(
                            fetchInvites
                          );
                        }}
                      />
                      <TrashButton
                        onClick={() => {
                          setSelectedPartner(partner);
                          onOpen();
                        }}
                      />
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
                    <OrgInviteMessage
                      org={user?.custom.org}
                      invite={invitation}
                    />
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
                  deletePartner(selectedPartner?.id ?? "");
                  onClose();
                }}
              >
                Cancel Partnership
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

const OrgInviteMessage = ({
  invite,
  org,
}: {
  invite: OrgInvite;
  org: string;
}) => {
  const [message, setMessage] = useState<string>();
  useEffect(() => {
    if (invite.sender === org) {
      setMessage(
        `You invited ${invite.receiver} to partner with your organization.`
      );
    } else {
      setMessage(
        `${invite.sender} invited your organization to partner with them.`
      );
    }
  }, [invite, org]);
  return <Text>{message}</Text>;
};