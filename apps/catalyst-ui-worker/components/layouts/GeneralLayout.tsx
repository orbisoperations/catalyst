"use client";
import { Box, Flex, PropsOf, Spinner, Text } from "@chakra-ui/react";
import { HelpModal } from "../elements";
import { Footer, TopBar } from "./components";

export type GeneralLayoutProps = PropsOf<typeof Box> & {
  title?: string;
  showSpinner?: boolean;
  actions?: { display: string; path: string }[];
};
export const GeneralLayout = (props: GeneralLayoutProps) => {
  return (
    <Flex
      flexDir={"column"}
      justifyContent={"space-between"}
      position={"relative"}
      height={"100vh"}
    >
      <TopBar title={props.title} actions={props.actions} zIndex={10} />
      {!props.showSpinner ? (
        <Box height={"90%"} overflowY={"auto"} {...props} p={5} />
      ) : (
        <Flex>
          <Spinner size="xl" mx={"auto"} />
        </Flex>
      )}
      <Footer>
        <Flex justify={"space-between"} w="100%" align={"center"}>
          <Text fontSize={"sm"} color={"gray.600"}>
            Footer
          </Text>
          <HelpModal />
        </Flex>
      </Footer>
    </Flex>
  );
};
