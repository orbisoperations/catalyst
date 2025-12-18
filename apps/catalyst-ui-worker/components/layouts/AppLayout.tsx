'use client';
import { useUser } from '@/components/contexts/User/UserContext';
import { Box, Flex, useDisclosure } from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { AppTopBar } from './AppTopBar';
import { AppFooter } from './AppFooter';
import { FeedbackModal, CreateChannelModal } from '@/components/modals';

type AppLayoutProps = {
    children: React.ReactNode;
};

export const AppLayout = ({ children }: AppLayoutProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, token } = useUser();
    const [orgName, setOrgName] = useState<string>(
        typeof window !== 'undefined' ? (window.localStorage.getItem('org') ?? '') : ''
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    const feedbackDisclosure = useDisclosure();
    const createChannelDisclosure = useDisclosure();

    useEffect(() => {
        if (user) {
            if (typeof window !== 'undefined') window.localStorage.setItem('org', String(user.custom.org));
            setOrgName(String(user.custom.org));
        }
    }, [user?.custom.org]);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <React.Fragment>
            <Flex height="100vh" overflow="hidden">
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={toggleSidebar}
                    user={user}
                    orgName={orgName}
                    onCreateChannel={createChannelDisclosure.onOpen}
                    onNewPartnership={() => router.push('/partners/invite')}
                    onCreateToken={() => router.push('/tokens/create')}
                />

                {/* Main Content Area */}
                <Flex flexDirection="column" flex={1} overflow="hidden">
                    <AppTopBar pathname={pathname} />

                    {/* Page Content */}
                    <Box flex={1} overflowY="auto" bg="var(--color-content-5)" p={8}>
                        {children}
                    </Box>

                    <AppFooter onFeedbackClick={feedbackDisclosure.onOpen} />
                </Flex>
            </Flex>

            <FeedbackModal disclosure={feedbackDisclosure} />
            <CreateChannelModal disclosure={createChannelDisclosure} user={user} token={token} />
        </React.Fragment>
    );
};
