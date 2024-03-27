import { Card, CardProps } from "@chakra-ui/card";
import { Box, Flex, Text } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

export type OrbisCardProps = CardProps & {
  size?: "sm" | "md" | "lg";
  paddingSize?: "sm" | "md" | "lg" | "none";
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
        paddingSize == "sm"
          ? "8px"
          : paddingSize == "md"
          ? "16px"
          : paddingSize == "lg"
          ? "24px"
          : "0px"
      }
      variant={"outline"}
      shadow={"sm"}
      {...cardProps}
    >
      <Box
        display={"grid"}
        gridTemplateColumns={"1fr 1fr"}
        pb={"8px"}
        alignItems={"center"}
      >
        {header && <Text fontSize={"2xl"}>{header}</Text>}

        {headerActions && <Flex justify={"end"}>{headerActions}</Flex>}
      </Box>
      {children}
      {actions && <Flex pt={"8px"}>{actions}</Flex>}
    </Card>
  );
};
