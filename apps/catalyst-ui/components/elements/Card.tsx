import { Card, CardProps } from "@chakra-ui/card";
import { Box, Flex, Text } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

export type OrbisCardProps = CardProps & {
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
    size = "md",
    paddingSize = "md",
    content,
    title,
    header,
    headerActions,
    actions,
    ...cardProps
  } = props;
  return (
    <Card
      size={size}
      padding={
        paddingSize == "sm" ? "1em" : paddingSize == "md" ? "1.2em" : "1.5em"
      }
      {...cardProps}
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
  );
};
