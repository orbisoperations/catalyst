"use client";
export const runtime = "edge";
import {
  OrbisBadge,
  OrbisButton,
  OrbisCard,
  OrbisTable,
  OrbisTabs,
  SelectableTable,
  TrashButton,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Box, Flex } from "@chakra-ui/layout";
import {
  Card,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function APIKeysDetails() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  return (
    <DetailedView
      topbaractions={navigationItems}
      topbartitle="API Keys"
      showspinner={false}
      headerTitle={{ text: "Create API Key" }}
      subtitle="Create a new API Key"
      actions={
        <Flex gap={10} align={"center"}>
          <Switch defaultChecked colorScheme="green" />
          <TrashButton onClick={onOpen} colorScheme="red" />
        </Flex>
      }
    >
      <Card p={2} mb={5} variant={"outline"} shadow={"sm"}>
        <Flex gap={2} mt={0} justify={"space-between"} px={5}>
          <Text>Created By: m.floresrivera@orbisops.com</Text>
          <Text>Created On: 2/2/2024</Text>
          <Text>Last Modified On: 2/2/2024</Text>
        </Flex>
      </Card>
      <Box mb={5}>
        <OrbisTabs
          tabsProps={{
            size: "md",
            variant: "enclosed",
            colorScheme: "blue",
          }}
          tabs={["Scopes", "Audit Log"]}
          content={[
            <Box key={1}>
              <OrbisCard header={"Key Scopes"}>
                <SelectableTable
                  headers={["", "Channel", "Description"]}
                  rows={[
                    [
                      <Flex key={0} justify={"space-between"}>
                        <Text>TAK Server</Text>
                        <OrbisBadge>Shared</OrbisBadge>
                      </Flex>,
                      "Short Description here",
                    ],
                    ["TAK Server 2", "Short Description here"],
                    ["TAK Server 3", "Short Description here"],
                  ]}
                  handleChange={(rows: number[]) => {
                    console.log({ rows });
                  }}
                />
              </OrbisCard>
            </Box>,
            <OrbisCard key={2} paddingSize="none">
              <OrbisTable
                tableProps={{ variant: "simple" }}
                headers={["Action", "Actor", "IP Address", "Event Date"]}
                rows={[
                  ["Created", "Mario", "127.0.0.1", "2/2/2024"],
                  ["Created", "Mario", "127.0.0.1", "2/2/2024"],
                  ["Created", "Mario", "127.0.0.1", "2/2/2024"],
                  ["Created", "Mario", "127.0.0.1", "2/2/2024"],
                  ["Created", "Mario", "127.0.0.1", "2/2/2024"],
                ]}
              ></OrbisTable>
            </OrbisCard>,
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
                  onClose();
                  router.back();
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
