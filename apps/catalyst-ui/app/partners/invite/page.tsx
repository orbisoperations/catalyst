"use client";

import { OrbisButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { navigationItems } from "@/utils/nav.utils";
import { Flex, FormControl, Grid, Input, Textarea } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function AcceptInvitePage() {
  const router = useRouter();
  return (
    <OrbisProvider>
      <DetailedView
        topbartitle="Invite Partner"
        topbaractions={navigationItems}
        actions={<></>}
        subtitle="Invite a partner to start sharing data."
        headerTitle={{ text: "Invite Parner" }}
      >
        <form>
          <Grid gap={5}>
            <FormControl>
              <label htmlFor="orgId">Organization ID</label>
              <Input rounded={"md"} name="orgId" type="text" />
            </FormControl>
            <FormControl>
              <label htmlFor="message">Invite Message</label>
              <Textarea name="message" />
            </FormControl>
            <Flex justify={"space-between"}>
              <OrbisButton colorScheme="gray" onClick={() => router.back()}>
                Cancel
              </OrbisButton>
              <OrbisButton type="submit">Send Invite</OrbisButton>
            </Flex>
          </Grid>
        </form>
      </DetailedView>
    </OrbisProvider>
  );
}
