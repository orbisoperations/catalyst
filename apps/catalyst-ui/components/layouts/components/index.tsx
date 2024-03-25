import { BackButton, OrbisButton } from "../../elements";
import { Box, Flex, Grid, PropsOf, Text } from "@chakra-ui/react";

type TopBarProps = PropsOf<typeof Box> & {
  title?: string;
  actions?: { display: string; path: string }[];
  activeIndex?: number;
  customActions?: JSX.Element;
};

export const TopBar = (props: TopBarProps) => {
  const { title, actions, 
    customActions,
    ...boxProps } = props;
  return (
    <Box position={"sticky"} top={0} bg={"white"}>
      <Flex
        {...boxProps}
        shadow={"md"}
        padding={"1em"}
        justifyContent={"space-between"}
        alignItems={"center"}
        zIndex={10}
      >
        <div>{title}</div>
        <Flex gap={5} alignItems={"center"}>
          {actions?.map((action, index) => (
            <a href={action.path} key={index} className="">
              <OrbisButton variant={"ghost"}>{action.display}</OrbisButton>
            </a>
          ))}
          {customActions}
        </Flex>
      </Flex>
    </Box>
  );
};

export const Footer = (props: PropsOf<typeof Box>) => {
  const { children, ...boxProps } = props;
  return (
    <Box
      {...props}
      padding={"1em"}
      bg={"gray.50"}
      position={"sticky"}
      bottom={0}
      right={0}
      left={0}
    >
      <Flex>{children}</Flex>
    </Box>
  );
};

export const DetailedHeader = ({
  actions,
  title,
  subtitle,
}: {
  actions?: JSX.Element;
  subtitle: string;
  title: { text: string; adjacent?: JSX.Element };
}) => {
  return (
    <Grid
      gap={2}
      position={"sticky"}
      top={0}
      bg={"white"}
      zIndex={5}
      pb={"1em"}
    >
      <Flex gap={5} justifyContent={"space-between"}>
        <Flex
          gap={5}
          alignItems={"center"}
          justifyContent={"flex-start"}
          flex={1}
        >
          <Box>
            <Flex gap={5} align={"center"}>
              <Box>
                <BackButton />
              </Box>
              <Text
                fontSize={"2xl"}
                fontWeight={"bold"}
                color={"gray.800"}
                textTransform={"uppercase"}
              >
                {title?.text}
              </Text>
              <Box>{title?.adjacent}</Box>
            </Flex>
          </Box>
        </Flex>
        <Box>{actions}</Box>
      </Flex>
      <Text fontSize={"lg"} color={"gray.400"}>
        {subtitle}
      </Text>
    </Grid>
  );
};

export const ListedHeader = ({
  actions,
  title,
  subtitle,
}: {
  actions?: JSX.Element;
  subtitle: string;
  title: { text: string; adjacent?: JSX.Element };
}) => {
  return (
    <Grid
      gap={2}
      position={"sticky"}
      top={0}
      bg={"white"}
      zIndex={5}
      pb={"1em"}
    >
      <Flex gap={5} justifyContent={"space-between"}>
        <Flex
          gap={5}
          alignItems={"center"}
          justifyContent={"flex-start"}
          flex={1}
        >
          <Box>
            <Flex gap={5} align={"center"}>
              <Text
                fontSize={"2xl"}
                fontWeight={"bold"}
                color={"gray.800"}
                textTransform={"uppercase"}
              >
                {title?.text}
              </Text>
              <Box>{title?.adjacent}</Box>
            </Flex>
          </Box>
        </Flex>
        <Box>{actions}</Box>
      </Flex>
      <Text fontSize={"lg"} color={"gray.400"}>
        {subtitle}
      </Text>
    </Grid>
  );
};