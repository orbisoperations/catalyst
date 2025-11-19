'use client';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { UserRole } from '@catalyst/schemas';

export type CloudflareUser = {
    id: string;
    email: string;
    amr: string[];
    idp: {
        id: string;
        type: string;
    };
    geo: {
        country: string;
    };
    user_uuid: string;
    account_id: string;
    iat: number;
    ip: string;
    auth_status: string;
    common_name: string;
    service_token_id: string;
    service_token_status: boolean;
    is_warp: boolean;
    is_gateway: boolean;
    version: number;
    device_sessions: Record<string, unknown>;
    custom: Record<string, unknown>;
};

type UserContextType = {
    user?: CloudflareUser;
    token?: string;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

type UserProviderProps = {
    children: ReactNode;
};

function getOrgFromRoles(roles: Record<string, Record<string, string>>): string | undefined {
    const roleKeys = Object.keys(roles) as UserRole[];
    const key = roleKeys.find(
        (key) => key === 'platform-admin' || key === 'org-admin' || key === 'data-custodian' || key === 'org-user'
    );

    if (!key) return undefined;

    const role = roles[key];
    const orgKeys = Object.keys(role);
    if (orgKeys.length > 0) {
        const org = orgKeys[0];
        return role[org].split('.')[0];
    }

    return undefined;
}

function getIdentity() {
    return fetch(`${typeof window !== 'undefined' ? window.location.origin : ''}/cdn-cgi/access/get-identity`, {
        method: 'GET',
    }).then((res) => {
        return res.json() as Promise<CloudflareUser>;
    });
}

function syncUser() {
    return fetch('/api/v1/user/sync', {
        method: 'GET',
        credentials: 'include',
    }).then((res) => {
        return res.json() as Promise<{ token: string } | { error: string }>;
    });
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    // const router = useRouter();

    const [user, setUser] = useState<CloudflareUser | undefined>();
    const [token, setToken] = useState<string | undefined>();

    useEffect(() => {
        getIdentity().then((res) => {
            const roles = res?.custom['urn:zitadel:iam:org:project:roles'];
            res.custom.isAdmin = roles && (roles as Record<string, string>)['org-admin'] !== undefined;
            res.custom.isPlatformAdmin = roles && (roles as Record<string, string>)['platform-admin'] !== undefined;
            res.custom.org = getOrgFromRoles(roles as Record<string, Record<string, string>>);
            setUser(res);
        });

        syncUser().then((res) => {
            if ('token' in res) {
                setToken(res.token);
            }
        });
    }, []); //removed router from dependency array - put back if needed

    return <UserContext.Provider value={{ user, token }}>{children}</UserContext.Provider>;
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
