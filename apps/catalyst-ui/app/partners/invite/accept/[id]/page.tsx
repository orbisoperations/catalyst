"use client";
export const runtime = "edge";
import { OrbisButton, OrbisCard } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { navigationItems } from "@/utils/nav.utils";
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
import { useRouter } from "next/navigation";
export default function AcceptInvitePage() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <OrbisProvider>
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
                  <ModalFooter display={"flex-end"} gap={2}>
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
                  </ModalFooter>
                </ModalContent>
              </Modal>
              <OrbisButton
                variant={"outline"}
                colorScheme="red"
                onClick={onOpen}
              >
                Reject
              </OrbisButton>

              <OrbisButton type="submit">Accept</OrbisButton>
            </Flex>
          }
        >
          <>
            <Text fontSize={"sm"} fontWeight={"bold"} mb={5}>
              Invitation message
            </Text>
            <p>
              I want to start sharing data with your company to support Mission
              X
            </p>
          </>
        </OrbisCard>
      </DetailedView>
    </OrbisProvider>
  );
}
