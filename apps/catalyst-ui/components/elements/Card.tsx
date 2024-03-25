import { Card } from "@chakra-ui/card";
import { Box, Flex, Text } from "@chakra-ui/react";
import { PropsOf } from "@chakra-ui/system";
import { PropsWithChildren } from "react";

export type OrbisCardProps = PropsOf<"div"> & {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  paddingSize?: "sm" | "md" | "lg";
  title?: string;
  header?: string | JSX.Element;
  headerActions?: string | JSX.Element;
  actions?: string | JSX.Element;
} & PropsWithChildren;

export const OrbisCard = (props: OrbisCardProps) => {
  const {
    children,
    variant = "primary",
    size = "md",
    paddingSize = "md",
    content,
    title,
    header,
    headerActions,
    actions,
    ...divProps
  } = props;
  return (
    <div {...divProps}>
      <Card
        size={size}
        padding={
          paddingSize == "sm" ? "1em" : paddingSize == "md" ? "1.2em" : "1.5em"
        }
      >
        <Box
          display={"grid"}
          gridTemplateColumns={"1fr 1fr"}
          pb={"1em"}
          alignItems={"center"}
        >
          <div>
            <Text fontSize={"2xl"}>{header}</Text>
          </div>
          <div>
            <Flex justify={"end"}>{headerActions}</Flex>
          </div>
        </Box>
        {children}
        <Flex pt={"1em"}>{actions}</Flex>
      </Card>
    </div>
  );
};
