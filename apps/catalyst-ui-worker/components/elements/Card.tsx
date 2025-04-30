import { Card, CardProps } from "@chakra-ui/card";
import { Box, Flex, Text } from "@chakra-ui/react";
import { PropsWithChildren } from "react";
import { OrbisButton } from ".";

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

export const ErrorCard = (props: {
  title: string;
  message: string;
  goBack?: () => void;
  retry?: () => void;
}) => {
  return (
    <OrbisCard
      title={props.title}
      header={props.title}
      actions={
        <Flex gap={5} align={"center"} justify={"space-between"}>
          {props.goBack && (
            <OrbisButton colorScheme="gray" onClick={props.goBack}>
              Go Back
            </OrbisButton>
          )}
          {props.retry && (
            <OrbisButton onClick={props.retry}>Retry</OrbisButton>
          )}
        </Flex>
      }
    >
      <Text>{props.message}</Text>
    </OrbisCard>
  );
};
