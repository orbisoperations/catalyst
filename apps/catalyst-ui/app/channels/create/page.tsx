"use client";
import { useUser } from "@/components/contexts/User/UserContext";
import { OrbisButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { gql, useMutation } from "@apollo/client";
import { Flex, Grid } from "@chakra-ui/layout";
import { Card, CardBody, FormControl, Input } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { FormEventHandler } from "react";

export default function CreateChannelPage() {
  const CREATE_DATA_CHANNEL = gql`
    mutation createDataChannel(
      $name: String!
      $description: String!
      $endpoint: String!
      $creatorOrganization: String!
    ) {
      createDataChannel(
        input: {
          name: $name
          description: $description
          endpoint: $endpoint
          creatorOrganization: $creatorOrganization
        }
      ) {
        id
      }
    }
  `;

  const router = useRouter();
  const user = useUser();
  const [createDataChannel, _] = useMutation(CREATE_DATA_CHANNEL, {
    onCompleted: (data) => {
      console.log("success");
    },
  });

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      endpoint: formData.get("endpoint"),
      creatorOrganization: formData.get("organization"),
    };

    try {
      const newDataChannel = await createDataChannel({
        variables: data,
      });

      router.push("/channels/" + newDataChannel.data.createDataChannel.id);
      return newDataChannel;
    } catch (error) {
      // TODO: Handle error for user
      console.error(error);
      alert("Error creating data channel");
      return error;
    }
  };

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
          <form onSubmit={handleSubmit}>
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
              <FormControl display={"none"}>
                <label htmlFor="organization"></label>
                {/*TODO: Get organization from user context*/}
                <Input
                  rounded="md"
                  name="organization"
                  required={true}
                  value={"org1"}
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
