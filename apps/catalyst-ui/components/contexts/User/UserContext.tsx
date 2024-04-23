"use client";
import { useRouter } from "next/router";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

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
  device_sessions: Record<string, any>;
  custom: Record<string, any>;
};

type UserContextType = {
  user?: CloudflareUser;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

type UserProviderProps = {
  children: ReactNode;
};

function getOrgFromRoles(
  roles: Record<string, Record<string, string>>
): string | undefined {
  const roleKeys = Object.keys(roles);
  const key = roleKeys.find(
    (key) =>
      key === "platform-admin" || key === "org-admin" || key === "org-user"
  ) as "platform-admin" | "org-admin" | "org-user" | undefined;

  if (!key) return undefined;

  if (roleKeys.includes(key)) {
    const role = roles[key];
    const orgKeys = Object.keys(role);
    if (orgKeys.length > 0) {
      const org = orgKeys[0];
      return role[org].split(".")[0];
    } else {
      return undefined;
    }
  }
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // const router = useRouter();

  const [user, setUser] = useState<CloudflareUser | undefined>();

  useEffect(() => {
    fetch(`${window.location.origin}/cdn-cgi/access/get-identity`, {
      method: "GET",
    })
      .then((res) => {
        return res.json() as Promise<CloudflareUser>;
      })
      .then((res) => {
        console.log(res);
        const roles = res?.custom["urn:zitadel:iam:org:project:roles"];
        res.custom.isAdmin = roles && roles["org-admin"] !== undefined;
        res.custom.org = getOrgFromRoles(
          roles as Record<string, Record<string, string>>
        );
        console.log(res.custom.org);
        setUser(res);
      });
  }, []); //removed router from dependency array - put back if needed

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
