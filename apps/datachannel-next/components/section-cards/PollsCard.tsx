import {
  Card,
  CardBody,
  Text,
  Heading,
  Flex,
  Input,
  Button,
} from "@chakra-ui/react";
import { ArrowRightIcon, CloseIcon } from '@chakra-ui/icons'

export default function PollsCard() {
  return (
    <>
      <Card w="100%" h="100%" variant="filled">
        <CardBody display="flex" flexDirection="column" justifyContent="center">
          <Heading size="md">Poll Settings</Heading>
          <Text fontSize="md">
            A description will go here to help people understand what the
            section is for.
          </Text>
          <Heading size="sm" mt="16px">Interval (in seconds)</Heading>
          <Input placeholder="Set interval /s" bg="white" mt="6px" />
          <Flex mt="16px">
            <Button colorScheme="blue" mr="10px"><ArrowRightIcon mr="10px" /> Start</Button>
            <Button colorScheme="red"><CloseIcon mr="10px" /> Stop</Button>
          </Flex>
        </CardBody>
      </Card>
    </>
  );
}
