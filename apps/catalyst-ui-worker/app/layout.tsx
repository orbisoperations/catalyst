import { UserProvider } from '@/components/contexts/User/UserContext';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { OrbisProvider } from '@/components/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Catalyst',
    description:
        'Catalyst is a federated data grid that facilitates sharing between organizations, teams, and products through the use of standard, open source, secure, and tested technology.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <UserProvider>
                    <OrbisProvider>{children}</OrbisProvider>
                </UserProvider>
            </body>
        </html>
    );
}
