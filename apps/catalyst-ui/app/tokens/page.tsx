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
import { Text } from "@chakra-ui/react";
import { rotateJWTKeyMaterial } from "@/app/actions/tokens";
import { useUser } from "../../components/contexts/User/UserContext";
import { useEffect, useState } from "react";

export const runtime = "edge";


export default function APIKeys() {
  const router = useRouter();
  const { user, token } = useUser();
  const [adminFlag, setAdminFlag] = useState<boolean>(false) 
  useEffect(() => {
    console.log(user, token)
    if (user !== undefined && token !== undefined) {
      setAdminFlag(true)
    } else {
      setAdminFlag(false)
    }
  }, [user, token])
  const apiKeys = [
    [
      <Flex justify={"space-between"} key={0} align={"center"}>
        <OpenButton
          onClick={() => {
            router.push("/tokens/1");
          }}
        >
          <Text>TAK Server</Text>
        </OpenButton>
        <OrbisBadge colorScheme="green">Active</OrbisBadge>
      </Flex>,
      "Short Description here",
      <APIKeyText allowCopy allowDisplay key={1} border={"none"}>
        {"APXASDASaskASDdjhaFSDskdz"}
      </APIKeyText>,
      "User 1",
    ],
    [
      <Flex justify={"space-between"} key={0} align={"center"}>
        <OpenButton
          onClick={() => {
            router.push("/tokens/1");
          }}
        >
          <Text>TAK Server 2</Text>
        </OpenButton>
        <OrbisBadge colorScheme="green">Active</OrbisBadge>
      </Flex>,
      "Short Description here",
      <APIKeyText allowCopy allowDisplay key={2} border={"none"}>
        {"APXASDASaskASDdjhaFSDskdz"}
      </APIKeyText>,
      "User 1",
    ],
    [
      <Flex justify={"space-between"} key={0} align={"center"}>
        <OpenButton
          onClick={() => {
            router.push("/tokens/1");
          }}
        >
          <Text>TAK Server 3</Text>
        </OpenButton>
        <OrbisBadge colorScheme="green">Active</OrbisBadge>
      </Flex>,
      "Short Description here",
      <APIKeyText allowCopy allowDisplay key={3} border={"none"}>
        {"APXASDASaskASDdjhaFSDskdz"}
      </APIKeyText>,
      "User 1",
    ],
  ];
  return (
    <>
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
      headerTitle={{
        adjacent: <OrbisBadge>Hello</OrbisBadge>,
        text: "API Keys",
      }}
      positionChildren="top"
      topbartitle="API Keys"
      subtitle="Access Data through your own means"
      table={
        <OrbisCard>
          <OrbisTable
            headers={["Name", "Description", "Key", "Created By"]}
            rows={apiKeys}
            tableProps={{
              overflowX: "auto",
            }}
          />
        </OrbisCard>
      }
      topbaractions={navigationItems}
    >
      {adminFlag && user?.custom.isPlatformAdmin 
      ? <>
        <OrbisCard title="JWT Admin Pannel">
          <Text>JWT Admin Actions</Text>
          <OrbisButton onClick={async () => {
            console.log("rotating jwt material")
            rotateJWTKeyMaterial(token!).then(res => {
              console.log(res)
            }).catch(e => {
              console.error("error rotating keys: ", e)
            }) 
          }}
          >Rotate JWT Signing Material</OrbisButton>
        </OrbisCard>
      </> 
      : <></>}
    </ListView>
    </>
  );
}
