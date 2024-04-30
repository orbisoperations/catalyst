"use client";
import { useUser } from "@/components/contexts/User/UserContext";
import { OrbisButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { DataChannel, DataChannelActionResponse } from "@catalyst/schema_zod";
import { Flex, Grid } from "@chakra-ui/layout";
import {
  Card,
  CardBody,
  FormControl,
  Input,
  InputGroup,
  InputLeftAddon,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";

type DataChannelFormProps = {
  createDataChannel: (
    fd: FormData,
    token: string
  ) => Promise<DataChannelActionResponse>;
};

export default function CreateChannelForm({
  createDataChannel,
}: DataChannelFormProps) {
  const router = useRouter();

  const { user, token } = useUser();

  return (
    <DetailedView
      actions={<></>}
      headerTitle={{
        text: "Create Data Channel",
      }}
      topbaractions={navigationItems}
      topbartitle="Catalyst"
    >
      <Card>
        <CardBody>
          <form
            action={async (fd) => {
              fd.set("organization", user?.custom.org);
              fd.set("name", user?.custom.org + "/" + fd.get("name"));
              const newChannel = await createDataChannel(fd, token ?? "");
              if (newChannel.success)
                router.push("/channels/" + (newChannel.data as DataChannel).id);
              else {
                console.error(newChannel.error);
                alert("Failed to create channel");
              }
            }}
          >
            <Grid gap={5}>
              <FormControl display={"grid"} gap={2}>
                <label htmlFor="name">Data Channel Name</label>
                <InputGroup>
                  <InputLeftAddon>{user?.custom.org}/</InputLeftAddon>

                  <Input
                    rounded="md"
                    name="name"
                    required={true}
                    placeholder="Data Channel Name"
                  />
                </InputGroup>
              </FormControl>
              <FormControl display={"grid"} gap={2}>
                <label htmlFor="description">Description</label>
                <Input
                  rounded="md"
                  name="description"
                  required={true}
                  placeholder="Description"
                />
              </FormControl>
              <FormControl display={"grid"} gap={2}>
                <label htmlFor="endpoint">Endpoint URL</label>
                <Input
                  rounded="md"
                  name="endpoint"
                  required={true}
                  placeholder="Endpoint URL"
                />
              </FormControl>
              <Flex justifyContent={"space-between"}>
                <OrbisButton colorScheme="gray" onClick={router.back}>
                  Cancel
                </OrbisButton>
                <OrbisButton type="submit">Create</OrbisButton>
              </Flex>
            </Grid>
          </form>
        </CardBody>
      </Card>
    </DetailedView>
  );
}
