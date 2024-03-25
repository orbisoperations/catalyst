import { Flex, Text, TextProps } from "@chakra-ui/react";
import { CopyButton, DisplayButton, GenerateButton } from ".";
import { useState } from "react";

export const APIKeyText = (
  props: TextProps & {
    children: string;
    allowGenerate?: boolean;
    allowDisplay?: boolean;
    allowCopy?: boolean;
  }
) => {
  const { children, allowGenerate, allowCopy, allowDisplay, ...rest } = props;
  const obscured =
    children.slice(0, 5) +
    children.slice(5, children.length).replace(/./g, "*");
  const [displayText, setDisplayText] = useState(obscured);
  const toggleText = () => {
    setDisplayText(displayText === obscured ? children : obscured);
  };
  return (
    <Flex
      w={"fit-content"}
      className="border"
      align={"center"}
      gap={5}
      paddingX={".5em"}
      paddingY={".25em"}
      borderRadius={"md"}
    >
      <Text>{displayText}</Text>
      {allowCopy && (
        <CopyButton copyText={children} variant={"ghost"} colorScheme="blue" />
      )}
      {allowDisplay && (
        <DisplayButton
          variant={"ghost"}
          colorScheme="blue"
          visible={false}
          toggle={toggleText}
        />
      )}
      {allowGenerate && <GenerateButton variant={"ghost"} colorScheme="blue" />}
    </Flex>
  );
};
