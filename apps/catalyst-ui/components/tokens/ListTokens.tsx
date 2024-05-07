"use client";
import {
  APIKeyText,
  CreateButton,
  OpenButton,
  OrbisBadge,
  OrbisButton,
  OrbisCard,
  OrbisTable,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Flex } from "@chakra-ui/layout";
import { useRouter } from "next/navigation";
import { Card, CardBody, Text } from "@chakra-ui/react";
import { rotateJWTKeyMaterial } from "@/app/actions/tokens";
import { useUser } from "../contexts/User/UserContext";
import { useEffect, useState } from "react";
import {
  IssuedJWTRegistry,
  IssuedJWTRegistryActionResponse,
} from "@catalyst/schema_zod";

type ListIssuedJWTRegistryProps = {
  listIJWTRegistry: (token: string) => Promise<IssuedJWTRegistry[]>;
};

export default function APIKeysComponent({
  listIJWTRegistry,
}: ListIssuedJWTRegistryProps) {
  const router = useRouter();
  const { user, token } = useUser();
  const [adminFlag, setAdminFlag] = useState<boolean>(false);

  const [issuedJWTRegistry, setIssuedJWTRegistry] = useState<any[]>([]);
  useEffect(() => {
    if (user !== undefined && token !== undefined) {
      setAdminFlag(true);
      listIJWTRegistry(token)
        .then((data) => {
          setIssuedJWTRegistry(data as IssuedJWTRegistry[]);
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      setAdminFlag(false);
    }
  }, [user, token]);

  return (
    <ListView
      actions={
        <Flex gap={5}>
          <CreateButton
            onClick={() => {
              router.push("/tokens/create");
            }}
          />
        </Flex>
      }
      topbaractions={navigationItems}
      headerTitle={{
        adjacent: <OrbisBadge>Hello</OrbisBadge>,
        text: "API Keys",
      }}
      positionChildren="top"
      topbartitle="API Keys"
      subtitle="Access Data through your own means"
      table={
        issuedJWTRegistry.length > 0 ? (
          <Card variant={"outline"} shadow={"md"}>
            <OrbisTable
              headers={["Name", "Description", "Expiration", "Owner"]}
              rows={issuedJWTRegistry.map(
                (jwt: {
                  id: string;
                  name: string;
                  description: string;
                  claims: string[];
                  expiry: number;
                  organization: string;
                }) => {
                  return [
                    <Flex key={jwt.id} justifyContent={"space-between"}>
                      <OpenButton
                        onClick={() => router.push("/tokens/" + jwt.id)}
                      >
                        {jwt.name}
                      </OpenButton>
                    </Flex>,
                    jwt.description,
                    new Date(jwt.expiry).toLocaleDateString(),
                    jwt.organization,
                  ];
                }
              )}
            />
          </Card>
        ) : (
          <Card>
            <CardBody>
              No tokens exist for{" "}
              {user !== undefined ? user.custom.org : "this user"}!
            </CardBody>
          </Card>
        )
      }
    >
      {user && token && user?.custom.isPlatformAdmin ? (
        <>
          <OrbisCard title="JWT Admin Pannel">
            <Text>JWT Admin Actions</Text>
            <OrbisButton
              onClick={async () => {
                console.log("rotating jwt material");
                rotateJWTKeyMaterial(token)
                  .then((res) => {
                    console.log(res);
                  })
                  .catch((e) => {
                    console.error("error rotating keys: ", e);
                  });
              }}
            >
              Rotate JWT Signing Material
            </OrbisButton>
          </OrbisCard>
        </>
      ) : (
        <></>
      )}
    </ListView>
  );
}
