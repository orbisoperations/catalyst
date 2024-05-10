import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Text } from '@chakra-ui/react';

const Terminal = (props: { messages: any }) => {
  return (
      <Box
          bg="black"
          color="white"
          fontFamily="monospace"
          p={4}
          borderRadius="md"
          overflowY="auto"
          maxHeight="400px"
      >
        {props.messages.map((message: any, index: number) => (
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
                {message}
              </ReactMarkdown>
            </Box>
        ))}
      </Box>
  );
};

export default Terminal;