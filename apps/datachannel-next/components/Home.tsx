import { Heading, HStack, VStack, Box } from "@chakra-ui/react";
import PollsCard from "./section-cards/PollsCard";
import MessagesLogCard from "./section-cards/MessageLogCard";
import QueryItemsListComponent from "@/components/query-items-list/component";
import NewFeedWizardCard from "@/components/section-cards/NewFeedWizardCard";
import { QueryItemsProvider } from "@/components/query-items-list/context";

export default function Home() {
  return (
    <QueryItemsProvider>
      <HStack h="100svh" w="100%" p="50px">
        {/*Left*/}
        <VStack h="100%" w="45%">
          <NewFeedWizardCard />
          {/*<PollsCard/>*/}
        </VStack>

        {/*Right*/}
        <Box h="100%"
            w="100%"
            p="30px"
            bg="#f7f7f7"
            style={{ borderRadius: 5 }}>
          <Heading alignSelf="start" size="lg" mb="8px">
            Active Feeds
          </Heading>
          <HStack
          h="90%"
          w="100%"
          >
            <QueryItemsListComponent />
            <MessagesLogCard />
          </HStack>
        </Box>
      </HStack>
    </QueryItemsProvider>
  );
}
