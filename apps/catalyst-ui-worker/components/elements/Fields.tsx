import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { CopyButton, DisplayButton, GenerateButton } from '.';
import { MouseEventHandler, useEffect, useState } from 'react';

export const APIKeyText = (
    props: FlexProps & {
        children?: string;
        allowGenerate?: boolean;
        allowDisplay?: boolean;
        allowCopy?: boolean;
        showAsClearText?: boolean;
        generateFunction?: MouseEventHandler<HTMLButtonElement>;
    }
) => {
    const { children, allowGenerate, allowCopy, showAsClearText, allowDisplay, generateFunction, ...rest } = props;
    const obscured = children ? children.slice(0, 5) + children.slice(5, children.length).replace(/./g, '*') : '';
    const [displayText, setDisplayText] = useState(showAsClearText ? children : obscured);
    const toggleText = () => {
        setDisplayText(displayText === obscured ? (children ?? '') : obscured);
    };
    useEffect(() => {
        setDisplayText(showAsClearText ? children : obscured);
    }, [children]);
    return (
        <Flex
            w={'fit-content'}
            className="border"
            align={'center'}
            justify={'space-between'}
            gap={5}
            paddingX={'.5em'}
            paddingY={'.25em'}
            borderRadius={'md'}
            {...rest}
        >
            <Text>{displayText}</Text>
            <Flex gap={2}>
                {allowCopy && <CopyButton copytext={children} variant={'ghost'} colorScheme="blue" />}
                {allowDisplay && (
                    <DisplayButton
                        variant={'ghost'}
                        colorScheme="blue"
                        visible={false}
                        toggletext={() => toggleText()}
                    />
                )}
                {allowGenerate && <GenerateButton variant={'ghost'} colorScheme="blue" onClick={generateFunction} />}
            </Flex>
        </Flex>
    );
};
