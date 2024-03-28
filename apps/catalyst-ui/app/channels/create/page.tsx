"use client";
import { useUser } from "@/components/contexts/User/UserContext";
import { OrbisButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import { navigationItems } from "@/utils/nav.utils";
import { Flex, Grid } from "@chakra-ui/layout";
import { FormControl, Input } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { FormEventHandler } from "react";
import { gql, useMutation } from "@apollo/client";


const CREATE_DATA_CHANNEL = gql`
    mutation createDataChannel($organization: String!, $name: String!, $endpoint: String!, $description: String!){
        createDataChannel(organization: $organization, name: $name, endpoint: $endpoint, description: $description) {
            organization
            name
            endpoint
            description
        }
    }`

export default function CreateChannelPage() {
  const router = useRouter();
  const user = useUser();

    const [createDataChannel, _] = useMutation(CREATE_DATA_CHANNEL, {
        onCompleted: (data) => {
            console.log('success');
        },
    });

    const handleSubmit:FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
        name: formData.get("name"),
        description: formData.get("description"),
        endpoint: formData.get("endpoint"),
        organization: formData.get("organization"),
        };
        console.log(data);

        const newDataChannel = await createDataChannel({variables: {data}}).then(() => {
            router.push('/channels');
        });

        console.log(newDataChannel);
        return newDataChannel;
    };

  return (
    <OrbisProvider>
      <DetailedView
        actions={<></>}
        headerTitle={{
          text: "Create Data Channel",
        }}
        subtitle=""
        topbaractions={navigationItems}
        topbartitle="Catalyst"
      >
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
              <Input
                  rounded="md"
                  name="organization"
                  required={true}
                  value={"org1"}
              />
            </FormControl>
              <Flex justifyContent={"space-between"}>
                <OrbisButton

                    colorScheme="gray"
                    type="submit"
                >
                  Cancel
                </OrbisButton>
                <OrbisButton type="submit">Create</OrbisButton>
              </Flex>
          </Grid>
        </form>
      </DetailedView>
    </OrbisProvider>
  );
}
