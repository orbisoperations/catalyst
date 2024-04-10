import { Card, CardBody, Text, Heading } from "@chakra-ui/react";
import QueryBox from "../QueryBox";
import { useState } from "react";


export default function MessagesLogCard() {
  const valueState = useState<string>('')

  return (
    <>
      <Card w="100%" h="100%" variant="outline">
        <CardBody
          display="flex"
          flexDirection="column"
          
          justifyContent="center"
        >
          <Heading size="md">Messages log</Heading>
          <Text fontSize="md" color="Gray 500" mb="16px">
            A description will go here to help people understand what the
            section is for.
          </Text>
          <QueryBox mWidth="100%" mHeight="100%" state={valueState} /> 
        </CardBody>
      </Card>
    </>
  );
}
