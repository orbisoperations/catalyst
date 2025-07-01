'use client';
import { Box, Container, Flex, PropsOf, Spinner, Text } from '@chakra-ui/react';
import { DetailedHeader, Footer, TopBar } from './components';
import { HelpModal } from '../elements';

type DetailedViewProps = PropsOf<typeof Box> & {
    headerTitle?: { text?: string; adjacent?: JSX.Element };
    actions?: JSX.Element | undefined;
    showspinner: boolean;
    topbaractions?: { display: string; path: string }[];
    topbartitle?: string;
    subtitle?: string;
};
export const DetailedView = (props: DetailedViewProps) => {
    const { actions, headerTitle: title, subtitle, children, ...boxProps } = props;
    return (
        <Flex flexDir={'column'} justifyContent={'space-between'} position={'relative'} height={'100vh'}>
            <TopBar title={props.topbartitle} actions={props.topbaractions} zIndex={10} />
            <Box height={'85%'} overflowY={'auto'} {...boxProps}>
                {!props.showspinner ? (
                    <Container maxW="container.xl" p={2}>
                        <Box position={'relative'} p={5}>
                            <DetailedHeader title={title} actions={actions} subtitle={subtitle} />
                            <Box>{children}</Box>
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
