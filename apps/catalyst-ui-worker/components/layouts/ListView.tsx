'use client';
import { Box, Container, Flex, PropsOf, Spinner, Text } from '@chakra-ui/react';
import { HelpModal, OrbisTable } from '../elements';
import { Footer, ListedHeader, TopBar } from './components';

export type ListViewProps = PropsOf<typeof Box> & {
    headerTitle?: { text: string; adjacent?: JSX.Element };
    subtitle?: string;
    showspinner?: boolean;
    actions?: JSX.Element;
    topbartitle?: string;
    topbaractions?: { display: string; path: string }[];
    positionChildren?: 'top' | 'bottom';
    table?: ReturnType<typeof OrbisTable>;
};
export const ListView = (props: ListViewProps) => {
    const { actions, headerTitle: title, subtitle, children, positionChildren = 'bottom', table, ...boxProps } = props;
    return (
        <Flex flexDir={'column'} justifyContent={'space-between'} position={'relative'} height={'100vh'}>
            <TopBar title={props.topbartitle} actions={props.topbaractions} zIndex={10} />
            <Box height={'85%'} overflowY={'auto'} {...boxProps}>
                {!props.showspinner ? (
                    <Container maxW="container.xl" p={2}>
                        <Box position={'relative'} p={5}>
                            <ListedHeader title={title} actions={actions} subtitle={subtitle} />
                            {positionChildren === 'top' && <Box>{children}</Box>}
                            <Box>{table}</Box>
                            {positionChildren === 'bottom' && <Box>{children}</Box>}
                        </Box>
                    </Container>
                ) : (
                    <Flex height={'100%'}>
                        <Spinner size="xl" m={'auto'} />
                    </Flex>
                )}
            </Box>
            <Footer>
                <Flex justify={'space-between'} w="100%" align={'center'}>
                    <Text fontSize={'sm'} color={'gray.600'}></Text>
                    <HelpModal />
                </Flex>
            </Footer>
        </Flex>
    );
};
