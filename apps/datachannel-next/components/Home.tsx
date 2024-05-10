import {Heading, HStack, VStack} from "@chakra-ui/react";
import PollsCard from "./section-cards/PollsCard";
import MessagesLogCard from "./section-cards/MessageLogCard";
import QueryItemsComponent from "@/components/query-items/component";
import QueryCreateCard from "@/components/section-cards/CreateQueryCard";

export default function Home() {


  return (
    <HStack h="100svh" w="100%" p="50px">
      {/*Left*/}
      <VStack h="100%" w="30%">
        <QueryCreateCard/>
        <PollsCard />
      </VStack>

      {/*Right*/}
      <VStack h="100%" w="100%" p='30px' bg="#f7f7f7" style={{borderRadius: 5}}>
        <Heading alignSelf="start" size="lg">Active Queries</Heading>
        <HStack h="100%" w="100%">
          <QueryItemsComponent/>
        </HStack>
        <MessagesLogCard />
      </VStack>
    </HStack>
  );
}
