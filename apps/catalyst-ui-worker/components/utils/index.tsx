'use client';
import theme from '@/theme/theme';
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { ChakraProvider } from '@chakra-ui/react';
import { PropsWithChildren } from 'react';
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import { __DEV__ } from '@apollo/client/utilities/globals';

if (__DEV__) {
    // Adds messages only in a dev environment
    loadDevMessages();
    loadErrorMessages();
}
export const OrbisProvider = ({ children }: PropsWithChildren) => {
    const gqlClient = new ApolloClient({
        uri: '/graphql',
        cache: new InMemoryCache(),
    });

    return (
        <ApolloProvider client={gqlClient}>
            <ChakraProvider theme={theme}>{children}</ChakraProvider>
        </ApolloProvider>
    );
};
