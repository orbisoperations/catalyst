"use client";

import { OrbisButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Flex, FormControl, Grid, Input, Textarea } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useUser } from "../contexts/User/UserContext";
type CreateInviteProps = {
  sendInvite: (receivingOrg: string, token: string) => Promise<any>;
};
export default function CreateInviteComponent({
  sendInvite,
}: CreateInviteProps) {
  const router = useRouter();
  const { token } = useUser();
  return (
    <DetailedView
      topbartitle="Invite Partner"
      topbaractions={navigationItems}
      actions={<></>}
      subtitle="Invite a partner to start sharing data."
      headerTitle={{ text: "Invite Parner" }}
    >
      <form
        action={() => {
          sendInvite("receivingOrg", token ?? "").then((res) => {
            router.back();
          });
        }}
      >
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
  );
}
