import { Flex, Text, TextProps } from "@chakra-ui/react";
import { CopyButton, DisplayButton, GenerateButton } from ".";
import { MouseEventHandler, useState } from "react";

export const APIKeyText = (
  props: TextProps & {
    children?: string;
    allowGenerate?: boolean;
    allowDisplay?: boolean;
    allowCopy?: boolean;
    generateFunction?:  MouseEventHandler<HTMLButtonElement>
  }
) => {
  const { children, allowGenerate, allowCopy, allowDisplay, ...rest } = props;
  const obscured = children ? (
    children.slice(0, 5) +
    children.slice(5, children.length).replace(/./g, "*")) : "";
  const [displayText, setDisplayText] = useState(obscured);
  const toggleText = () => {
    setDisplayText(displayText === obscured ? (children ?? "") : obscured);
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
      {...rest}
    >
      <Text>{displayText}</Text>
      {allowCopy && (
        <CopyButton copytext={children} variant={"ghost"} colorScheme="blue" />
      )}
      {allowDisplay && (
        <DisplayButton
          variant={"ghost"}
          colorScheme="blue"
          visible={false}
          toggletext={() => toggleText()}
        />
      )}
      {allowGenerate && <GenerateButton variant={"ghost"} colorScheme="blue" onClick={props.generateFunction} />}
    </Flex>
  );
};
