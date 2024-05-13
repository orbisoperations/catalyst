import { VStack, HStack, Heading} from "@chakra-ui/react";
import SearchCard from "./section-cards/SearchCard";
import ResultCard from "./section-cards/QueryResultCard";
import GraphQLCard from "./section-cards/GraphQLCard";
import PollsCard from "./section-cards/PollsCard";
import MessagesLogCard from "./section-cards/MessageLogCard";

export default function ResponseContainer() {
  return (
    <HStack h="100svh" w="100%" p="50px">
      <VStack h="100%" w="30%">
        <SearchCard />
        <PollsCard />
      </VStack>

      <VStack h="100%" w="100%" p='30px' bg="#f7f7f7" style={{borderRadius: 5}}>
        <Heading alignSelf="start" size="lg">Results</Heading>
        <HStack h="100%" w="100%">
          <ResultCard />
          <GraphQLCard />
        </HStack>
        <MessagesLogCard />
      </VStack>
    </HStack>
  );
}
