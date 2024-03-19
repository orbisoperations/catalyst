'use client';
import theme from "@/theme/theme";
import { ChakraProvider } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

export const OrbisProvider = ({ children }: PropsWithChildren) => {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
};
