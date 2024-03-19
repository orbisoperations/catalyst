"use client";
import {
  CreateButton,
  OrbisBadge,
  OrbisTable,
  TrashButton,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { Flex } from "@chakra-ui/layout";
import { Card, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
export default function Home() {
  const router = useRouter();
  return (
    <OrbisProvider>
      <ListView
        actions={
          <Flex gap={5}>
            <CreateButton
              onClick={() => {
                router.push("/channels/create");
              }}
            />
          </Flex>
        }
        headerTitle={{
          adjacent: <OrbisBadge>Hello</OrbisBadge>,
          text: "Data Channels",
        }}
        positionChildren="bottom"
        subtitle="All your data channels in one place."
        table={
          <Card variant={"outline"} shadow={"md"}>
            <OrbisTable
              headers={["Data Channel", "Description", "Endpoint"]}
              rows={[
                [
                  <Flex key={"1"} justifyContent={"space-between"}>
                    <Text>Hello</Text>
                    <OrbisBadge>Shared</OrbisBadge>
                  </Flex>,
                  "world",
                  "https://example.com",
                ],
                ["hello", "world", "https://example.com"],
                ["hello", "world", "https://example.com"],
              ]}
              tableProps={{}}
            />
          </Card>
        }
        topbartitle="Data Channels"
      ></ListView>
    </OrbisProvider>
  );
}