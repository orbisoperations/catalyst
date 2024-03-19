"use client";
import {
  OrbisBadge,
  APIKeyText
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";
import {Grid, Box, Heading, Stack, StackDivider, Text} from "@chakra-ui/layout";
import {Card, CardHeader, CardBody} from "@chakra-ui/card";
import { FormControl, Input } from "@chakra-ui/react";

export default function CreateChannelPage() {
  return (
    <OrbisProvider>
<DetailedView
  actions={<></>}
  headerTitle={{
    adjacent: <OrbisBadge>{' '}Shared with you{' '}</OrbisBadge>,
    text: 'N Metadata'
  }}
  subtitle="Description for the data channel"
  topbarActions={[]}
  topbartitle="Data Channel Details"
>
  <div>
  <form>
          <Grid gap={5}>
            <FormControl display={"grid"} gap={2}>
              <label htmlFor="endpoint">Endpoint URL</label>
              <Input
                rounded="md"
                name="endpoint"
                required={true}
                placeholder="Endpoint URL"
              />
            </FormControl>

            <Card>
  <CardHeader>
    <Heading size='md'>Available Metadata</Heading>
  </CardHeader>

  <CardBody>
    <Stack divider={<StackDivider />} spacing='4'>
      <Box>
        <Heading size='xs' textTransform='uppercase'>
          Summary
        </Heading>
        <Text pt='2' fontSize='sm'>
          View a summary of all your clients over the last month.
        </Text>
      </Box>
      <Box>
        <Heading size='xs' textTransform='uppercase'>
          JSON
        </Heading>
        <Text pt='2' fontSize='sm'>
          {`{"name":"John", "age":30, "car":null}`}
        </Text>
      </Box>
    </Stack>
  </CardBody>
</Card>
      
          </Grid>
        </form>
  </div>
</DetailedView>
    </OrbisProvider>
  );
}
