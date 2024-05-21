import React, { useCallback, useState } from "react";
import { Card, CardBody, Text, Heading, Box, Flex } from "@chakra-ui/react";
import SocketConnection from "@/components/socket";
import ReactMarkdown from "react-markdown";

interface LogMessage {
  timestamp: string;
  message: string;
  source?: string;
  level: "info" | "warn" | "error" | "debug" | "trace";
}

class MessageUtil {
  static createMessage(args: LogMessage) {
    return {
      ...args,
    };
  }
}

const Terminal = ({ messages }: { messages: LogMessage[] }) => {
  return (
    <Box
      bg="black"
      color="white"
      fontFamily="monospace"
      p={4}
      borderRadius="md"
      overflowY="auto"
      maxHeight="400px"
      minHeight="90%"
      height="100%"
    >
      {messages.map((message, index) => (
        <Box key={index} mb={2}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => <Text fontSize="xl">{children}</Text>,
              h2: ({ children }) => <Text fontSize="lg">{children}</Text>,
              p: ({ children }) => <Text>{children}</Text>,
              code: ({ children }) => (
                <Box
                  as="pre"
                  bg="gray.800"
                  color="white"
                  p={2}
                  borderRadius="md"
                  overflowX="auto"
                >
                  <Text as="code">{children}</Text>
                </Box>
              ),
            }}
          >
            {`[${message.timestamp}] [${message.level.toUpperCase()}] ${
              message.source ? `[${message.source}] ` : ""
            }${message.message}`}
          </ReactMarkdown>
        </Box>
      ))}
    </Box>
  );
};

export default function MessagesLogCard() {
  const [messages, setMessages] = useState<LogMessage[]>([]);

  const handleMessage = useCallback((m: any) => {
    const newMessage = MessageUtil.createMessage({
      timestamp: new Date().toISOString(),
      message: m,
      level: "info",
      source: "cotxml",
    });
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  }, []);

  return (
    <>
      <Card w="100%" h="100%" variant="outline" p="10px">
        <CardBody display="flex" flexDirection="column" justifyContent="center">
          <Heading size="md" mr="2%" mt="8px">
            Live
          </Heading>
          <SocketConnection handleMessage={handleMessage} />
          <Terminal messages={messages} />
        </CardBody>
      </Card>
    </>
  );
}
