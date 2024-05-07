"use client";
export const runtime = "edge";
import {
  APIKeyText,
  OrbisBadge,
  OrbisButton,
  OrbisCard,
  OrbisTable,
  OrbisTabs,
  TrashButton,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import {
  DataChannel,
  DataChannelActionResponse,
  IssuedJWTRegistry,
} from "@catalyst/schema_zod";
import { Box, Flex } from "@chakra-ui/layout";
import {
  Card,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
interface TokenDetailsProps {
  deleteIJWTRegistry: (
    token: string,
    id: string
  ) => Promise<IssuedJWTRegistry | undefined>;
  getIJWTRegistry: (
    token: string,
    id: string
  ) => Promise<IssuedJWTRegistry | undefined>;
  listChannels: (token: string) => Promise<DataChannelActionResponse>;
}
type DisplayedJWTRegistry = {
  claims: { name: string; id: string; description: string }[];
  name: string;
  id: string;
  description: string;
  organization: string;
  expiry: Date;
};
export default function TokenDetailsComponent({
  deleteIJWTRegistry,
  getIJWTRegistry,
  listChannels,
}: TokenDetailsProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { token, user } = useUser();
  const router = useRouter();
  const { id } = useParams();
  const [iJWTRegistry, setIJWTRegistry] = useState<
    DisplayedJWTRegistry | undefined
  >(undefined);

  useEffect(() => {
    if (token && id && typeof id === "string") {
      getIJWTRegistry(token, id).then((data) => {
        listChannels(token).then((channels) => {
          if (data && channels.success) {
            const claims = (channels.data as DataChannel[]).filter(
              (channel) => {
                return data.claims.includes(channel.id);
              }
            );
            const iJWTRegistry: DisplayedJWTRegistry = {
              ...data,
              claims,
            };
            setIJWTRegistry(iJWTRegistry);
          }
        });
      });
    }
  }, [token, id]);
  return (
    <DetailedView
      topbaractions={navigationItems}
      topbartitle="Token Details"
      showspinner={false}
      headerTitle={{ text: iJWTRegistry?.name }}
      subtitle={iJWTRegistry?.description}
      actions={
        <Flex gap={10} align={"center"}>
          <TrashButton onClick={onOpen} colorScheme="red" />
        </Flex>
      }
    >
      <Card p={2} mb={5} variant={"outline"} shadow={"sm"}>
        <Flex gap={2} mt={0} justify={"space-between"} px={5}>
          <Text>Created By: {iJWTRegistry?.organization}</Text>
          <Text>Valid Until: {iJWTRegistry?.expiry.toLocaleString()}</Text>
        </Flex>
      </Card>
      <Box mb={5}>
        <OrbisTabs
          tabsProps={{
            size: "md",
            variant: "enclosed",
            colorScheme: "blue",
          }}
          tabs={[
            "Scopes",
            // TODO: Enable Audit Log
            //, "Audit Log"
          ]}
          content={[
            <Box key={1}>
              <OrbisCard header={"Key Scopes"}>
                <OrbisTable
                  headers={["Channel", "Description", "Channel ID"]}
                  rows={iJWTRegistry?.claims.map((claim, index) => [
                    <Flex key={index + "-claim-name"} justify={"space-between"}>
                      <Text>{claim.name}</Text>
                      {user && !claim.name.includes(user.custom.org) && (
                        <OrbisBadge>Shared</OrbisBadge>
                      )}
                    </Flex>,
                    claim.description,
                    <APIKeyText
                      allowCopy
                      showAsClearText
                      key={index + "-claim-id"}
                    >
                      {claim.id}
                    </APIKeyText>,
                  ])}
                />
              </OrbisCard>
            </Box>,
            // TODO: Enable Audit Log
            // <OrbisCard key={2} paddingSize="none">
            //   <OrbisTable
            //     tableProps={{ variant: "simple" }}
            //     headers={["Action", "Actor", "IP Address", "Event Date"]}
            //     rows={[
            //       ["Created", "Mario", "127.0.0.1", "2/2/2024"],
            //       ["Created", "Mario", "127.0.0.1", "2/2/2024"],
            //       ["Created", "Mario", "127.0.0.1", "2/2/2024"],
            //       ["Created", "Mario", "127.0.0.1", "2/2/2024"],
            //       ["Created", "Mario", "127.0.0.1", "2/2/2024"],
            //     ]}
            //   ></OrbisTable>
            // </OrbisCard>,
          ]}
        />
      </Box>
      {/* Delete API Key Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Delete API Key</ModalHeader>
          <ModalBody>
            <Text>
              Are you sure you want to delete this API Key? This action cannot
              be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Flex justify={"flex-end"} gap={5}>
              <OrbisButton
                colorScheme="red"
                onClick={() => {
                  if (token && iJWTRegistry) {
                    deleteIJWTRegistry(token, iJWTRegistry.id).then(
                      async () => {
                        onClose();
                        router.back();
                      }
                    );
                  }
                }}
              >
                Delete
              </OrbisButton>
              <OrbisButton onClick={onClose} colorScheme="gray">
                Cancel
              </OrbisButton>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DetailedView>
  );
}
