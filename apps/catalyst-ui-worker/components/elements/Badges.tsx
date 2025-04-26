import { Badge, Box } from "@chakra-ui/layout";
import { PropsOf } from "@emotion/react";

export const OrbisBadge = (props: PropsOf<typeof Badge>) => {
  const { children, ...badgeProps } = props;
  return (
    <Badge
      size={"xs"}
      fontSize={".6em"}
      padding={".5em"}
      height={"fit-content"}
      colorScheme="blue"
      borderRadius={0}
      {...badgeProps}
    >
      {props.children}
    </Badge>
  );
};

export const WarningBadge = (props: PropsOf<typeof Badge>) => {
  const { children, ...badgeProps } = props;
  return (
    <OrbisBadge colorScheme="yellow" {...badgeProps}>
      {props.children}
    </OrbisBadge>
  );
};

export const DangerBadge = (props: PropsOf<typeof Badge>) => {
  const { children, ...badgeProps } = props;
  return (
    <OrbisBadge colorScheme="red" {...badgeProps}>
      {props.children}
    </OrbisBadge>
  );
};

export const SuccessBadge = (props: PropsOf<typeof Badge>) => {
  const { children, ...badgeProps } = props;
  return (
    <OrbisBadge colorScheme="green" {...badgeProps}>
      {props.children}
    </OrbisBadge>
  );
};

export const InfoBadge = (props: PropsOf<typeof Badge>) => {
  const { children, ...badgeProps } = props;
  return (
    <OrbisBadge colorScheme="gray" {...badgeProps}>
      {props.children}
    </OrbisBadge>
  );
};
