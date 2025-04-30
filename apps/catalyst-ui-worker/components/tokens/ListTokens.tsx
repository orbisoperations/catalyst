"use client";
import { rotateJWTKeyMaterial } from "@/app/actions/tokens";
import {
  CreateButton,
  ErrorCard,
  OpenButton,
  OrbisButton,
  OrbisCard,
  OrbisTable,
} from "@/components/elements";
import { ListView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { IssuedJWTRegistry } from "@catalyst/schema_zod";
import { Box, Flex } from "@chakra-ui/layout";
import { Card, CardBody, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";

type ListIssuedJWTRegistryProps = {
  listIJWTRegistry: (token: string) => Promise<IssuedJWTRegistry[]>;
};

export default function APIKeysComponent({
  listIJWTRegistry,
}: ListIssuedJWTRegistryProps) {
  const router = useRouter();
  const { user, token } = useUser();
  const [adminFlag, setAdminFlag] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [issuedJWTRegistry, setIssuedJWTRegistry] = useState<any[]>([]);

  function fetchIssuedJWTRegistry() {
    setHasError(false);
    if (user !== undefined && token !== undefined) {
      setAdminFlag(user && token && user?.custom.isPlatformAdmin);
      listIJWTRegistry(token)
        .then((data) => {
          setIssuedJWTRegistry(data as IssuedJWTRegistry[]);
        })
        .catch((e) => {
          setHasError(true);
          setErrorMessage(
            "An error occurred while fetching the tokens. Please try again later.",
          );
          console.error(e);
        });
    } else {
      setAdminFlag(false);
    }
  }
  useEffect(fetchIssuedJWTRegistry, [user, token]);

  return (
    <ListView
      actions={
        !hasError ? (
          <Flex gap={5}>
            <CreateButton
              onClick={() => {
                router.push("/tokens/create");
              }}
            />
          </Flex>
        ) : undefined
      }
      topbaractions={navigationItems}
      headerTitle={{
        text: "API Keys",
      }}
      positionChildren="top"
      topbartitle="API Keys"
      subtitle="Access Data through your own means"
      table={
        hasError ? (
          <ErrorCard
            title="Error"
            message={errorMessage}
            retry={fetchIssuedJWTRegistry}
          />
        ) : (
          <Box>
            {adminFlag && (
              <>
                <OrbisCard title="JWT Admin Pannel" mb={5}>
                  <Text>JWT Admin Actions</Text>
                  <OrbisButton
                    onClick={async () => {
                      if (!token) return;
                      rotateJWTKeyMaterial(token)
                        .then((res) => {
                          console.log(res);
                        })
                        .catch((e) => {
                          setHasError(true);
                          setErrorMessage(
                            "An error occurred while rotating the key. Please try again later.",
                          );
                          console.error("error rotating keys: ", e);
                        });
                    }}
                  >
                    Rotate JWT Signing Material
                  </OrbisButton>
                </OrbisCard>
              </>
            )}
            {issuedJWTRegistry.length > 0 ? (
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
                    },
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
            )}
          </Box>
        )
      }
    ></ListView>
  );
}
