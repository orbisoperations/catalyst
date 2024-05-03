"use client";
export const runtime = "edge";
import { OrbisButton, OrbisCard } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { OrgInvite } from "@catalyst/schema_zod";
import {
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
type AcceptInviteComponentProps = {
  acceptInvite: (
    inviteId: string,
    token: string
  ) => Promise<OrgInvite | undefined>;
  declineInvite: (
    inviteId: string,
    token: string
  ) => Promise<OrgInvite | undefined>;
};
export default function AcceptInviteComponent({
  acceptInvite,
  declineInvite,
}: AcceptInviteComponentProps) {
  const router = useRouter();
  const params = useParams();
  const [id, setId] = useState("");
  const { token } = useUser();
  useEffect(() => {
    const inviteId = params.id;
    if (typeof inviteId === "string") {
      setId(inviteId);
    }
  }, [params.id]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <DetailedView
      topbartitle="Accept Invite"
      topbaractions={navigationItems}
      actions={<></>}
      subtitle="Organization N wants to share data with you."
      headerTitle={{ text: "Accept Invite" }}
    >
      <OrbisCard
        actions={
          <Flex gap={5}>
            <Modal isOpen={isOpen} onClose={onClose}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Accept Invite</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <Text fontSize={"sm"} fontWeight={"bold"} mb={5}>
                    Reject Invite
                  </Text>
                  <p>
                    Are you sure you want to reject this invite? This action
                    cannot be undone.
                  </p>
                </ModalBody>
                <ModalFooter display={"flex"} gap={2}>
                  <OrbisButton
                    colorScheme="red"
                    onClick={() => {
                      if (token) {
                        declineInvite(id, token);
                        onClose();
                        router.back();
                      }
                    }}
                  >
                    Reject
                  </OrbisButton>
                  <OrbisButton colorScheme="gray" onClick={onClose}>
                    Cancel
                  </OrbisButton>
                </ModalFooter>
              </ModalContent>
            </Modal>
            <OrbisButton variant={"outline"} colorScheme="red" onClick={onOpen}>
              Reject
            </OrbisButton>

            <OrbisButton
              onClick={() => {
                if (token) acceptInvite(id, token).then(router.back);
              }}
            >
              Accept
            </OrbisButton>
          </Flex>
        }
      >
        <>
          <Text fontSize={"sm"} fontWeight={"bold"} mb={5}>
            Invitation message
          </Text>
          <p>
            I want to start sharing data with your company to support Mission X
          </p>
        </>
      </OrbisCard>
    </DetailedView>
  );
}
