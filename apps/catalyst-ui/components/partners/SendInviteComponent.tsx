"use client";

import { OrbisButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import {
  Flex,
  FormControl,
  Grid,
  Input,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "../contexts/User/UserContext";
type CreateInviteProps = {
  sendInvite: (
    receivingOrg: string,
    token: string,
    message: string
  ) => Promise<any>;
};
export default function CreateInviteComponent({
  sendInvite,
}: CreateInviteProps) {
  const router = useRouter();
  const { token, user } = useUser();
  const [displayError, setDisplayError] = useState<boolean>(false);
  return (
    <DetailedView
      topbartitle="Invite Partner"
      topbaractions={navigationItems}
      showspinner={false}
      actions={<></>}
      subtitle="Invite a partner to start sharing data."
      headerTitle={{ text: "Invite Parner" }}
    >
      <form
        action={(formData) => {
          const org = formData.get("orgId");
          const message = formData.get("message");
          if (org === user?.custom.org) {
            setDisplayError(true);
            return;
          }
          if (typeof org === "string" && typeof message === "string") {
            sendInvite(
              org,
              token ?? "",
              message.trim() === ""
                ? user?.custom.org + " invited you to partner with them"
                : message
            ).then((res) => {
              router.back();
            });
          } else {
            alert("Organization ID can't be empty");
          }
        }}
      >
        <Grid gap={5}>
          <FormControl isRequired>
            <label htmlFor="orgId">Organization ID</label>
            <Input
              rounded={"md"}
              name="orgId"
              type="text"
              onChange={() => setDisplayError(false)}
            />
            {displayError && (
              <Text
                color={"red"}
                fontSize={"sm"}
                mt={"1em"}
                fontWeight={"semibold"}
                textAlign={"center"}
              >
                You cannot invite your own organization
              </Text>
            )}
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
