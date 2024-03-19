"use client";
import {
  CreateButton,
  OrbisBadge,
  OrbisButton,
  TrashButton,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { Container, Flex, Grid } from "@chakra-ui/layout";
import { FormControl, Input } from "@chakra-ui/react";

export default function CreateChannelPage() {
  return (
    <OrbisProvider>
      <DetailedView
        actions={<></>}
        headerTitle={{
          text: "Create Data Channel",
        }}
        subtitle=""
        topbaractions={[
          {
            display: "Create",
            path: "/create",
          },
          {
            display: "Delete",
            path: "/delete",
          },
        ]}
        topbartitle="Detailed View"
      >
        <form>
          <Grid gap={5}>
            <FormControl display={"grid"} gap={2}>
              <label htmlFor="name">Data Channel Name</label>
              <Input
                rounded="md"
                name="name"
                required={true}
                placeholder="Data Channel Name"
              />
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
              <OrbisButton colorScheme="gray" type="submit">
                Create
              </OrbisButton>
              <OrbisButton type="submit">Create</OrbisButton>
            </Flex>
          </Grid>
        </form>
      </DetailedView>
    </OrbisProvider>
  );
}
