"use client";
import { OrbisButton, OrbisCard, SelectableTable } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Flex } from "@chakra-ui/layout";
import { FormControl, Input } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function APIKeysCreate() {
  const router = useRouter();
  return (
    <DetailedView
      topbaractions={navigationItems}
      topbartitle="API Keys"
      headerTitle={{ text: "Create API Key" }}
      subtitle="Create a new API Key"
      actions={<OrbisButton onClick={router.back}>Create</OrbisButton>}
    >
      <Flex gap={2} mb={5}>
        <FormControl>
          <label htmlFor="apiKeyName">API Key Name</label>
          <Input rounded={"md"} name="apiKeyName" />
        </FormControl>
        <FormControl>
          <label htmlFor="apiKeyDescription">Description</label>
          <Input rounded={"md"} name="description" />
        </FormControl>
      </Flex>
      <OrbisCard>
        <SelectableTable
          headers={["", "Channel", "Description"]}
          rows={[
            ["TAK Server", "Short Description here"],
            ["TAK Server 2", "Short Description here"],
            ["TAK Server 3", "Short Description here"],
          ]}
          handleChange={(rows: number[]) => {
            console.log({ rows });
          }}
        />
      </OrbisCard>
    </DetailedView>
  );
}
