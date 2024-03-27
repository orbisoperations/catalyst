"use client";
import {
  APIKeyText,
  CreateButton,
  OpenButton,
  OrbisBadge,
  OrbisCard,
  OrbisTable,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { navigationItems } from "@/utils/nav.utils";
import { Flex } from "@chakra-ui/layout";
import { useRouter } from "next/navigation";
import { Text } from "@chakra-ui/react";

export default function APIKeys() {
  const router = useRouter();
  const apiKeys = [
    [
      <Flex justify={"space-between"} key={0} align={"center"}>
        <OpenButton
          onClick={() => {
            router.push("/api-keys/1");
          }}
        >
          <Text>TAK Server</Text>
        </OpenButton>
        <OrbisBadge colorScheme="green">Active</OrbisBadge>
      </Flex>,
      "Short Description here",
      <APIKeyText allowCopy allowDisplay key={1} border={"none"}>
        {"APXASDASaskASDdjhaFSDskdz"}
      </APIKeyText>,
      "User 1",
    ],
    [
      <Flex justify={"space-between"} key={0} align={"center"}>
        <OpenButton
          onClick={() => {
            router.push("/api-keys/1");
          }}
        >
          <Text>TAK Server 2</Text>
        </OpenButton>
        <OrbisBadge colorScheme="green">Active</OrbisBadge>
      </Flex>,
      "Short Description here",
      <APIKeyText allowCopy allowDisplay key={2} border={"none"}>
        {"APXASDASaskASDdjhaFSDskdz"}
      </APIKeyText>,
      "User 1",
    ],
    [
      <Flex justify={"space-between"} key={0} align={"center"}>
        <OpenButton
          onClick={() => {
            router.push("/api-keys/1");
          }}
        >
          <Text>TAK Server 3</Text>
        </OpenButton>
        <OrbisBadge colorScheme="green">Active</OrbisBadge>
      </Flex>,
      "Short Description here",
      <APIKeyText allowCopy allowDisplay key={3} border={"none"}>
        {"APXASDASaskASDdjhaFSDskdz"}
      </APIKeyText>,
      "User 1",
    ],
  ];
  return (
    <OrbisProvider>
      <ListView
        actions={
          <Flex gap={5}>
            <CreateButton
              onClick={() => {
                router.push("/api-keys/create");
              }}
            />
          </Flex>
        }
        headerTitle={{
          adjacent: <OrbisBadge>Hello</OrbisBadge>,
          text: "API Keys",
        }}
        positionChildren="top"
        topbartitle="API Keys"
        subtitle="Access Data through your own means"
        table={
          <OrbisCard>
            <OrbisTable
              headers={["Name", "Description", "Key", "Created By"]}
              rows={apiKeys}
              tableProps={{
                overflowX: "auto",
              }}
            />
          </OrbisCard>
        }
        topbaractions={navigationItems}
      />
    </OrbisProvider>
  );
}
