"use client";
import { JWTRequest } from "@/app/types";
import { OrbisButton, OrbisCard, SelectableTable } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import { Box, Flex } from "@chakra-ui/layout";
import {
  FormControl,
  Text,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Select,
  InputGroup,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";
import {
  DataChannel,
  DataChannelActionResponse,
  JWTSigningResponse,
} from "@catalyst/schema_zod";

type CreateTokensFormProps = {
  signToken: (
    req: JWTRequest,
    expiration: {
      value: number;
      unit: "days" | "weeks";
    },
    cfToken: string
  ) => Promise<JWTSigningResponse>;
  listChannels: (token: string) => Promise<DataChannelActionResponse>;
};

export default function CreateTokensForm({
  signToken,
  listChannels,
}: CreateTokensFormProps) {
  const router = useRouter();
  const { user, token: cfToken } = useUser();
  const [channels, setChannels] = useState<any[]>([]);
  const [channelsResponse, setChannelsResponse] = useState<DataChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [apiKeyName, setApiKeyName] = useState<string>("");
  const [apiKeyDescription, setApiKeyDescription] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const tokenConfirmation = useDisclosure();
  const [issuedJWTs, setIssuedJWTs] = useState<any[]>([]);
  const [expiration, setExpiration] = useState<{
    value: number;
    unit: "days" | "weeks";
  }>({ value: 7, unit: "days" });
  useEffect(() => {
    if (cfToken)
      listChannels(cfToken).then((resp) => {
        if (resp.success) {
          setChannels(
            (resp.data as DataChannel[]).map((channel) => [
              channel.name,
              channel.description,
            ])
          );
          setChannelsResponse(resp.data as DataChannel[]);
        }
      });
  }, [cfToken]);

  function createToken() {
    const jwtRequest: JWTRequest = {
      claims: channelsResponse
        .filter((_, i) => selectedChannels.includes(i))
        .map((channel) => {
          console.log(channel);
          return channel.id;
        }),
      entity:
        (user && user.custom.org && `${user?.custom.org}/${user?.email}`) ||
        "default",
    };
    if (!cfToken) {
      throw "No cf token";
    }
    if (!user) {
      throw "No user";
    }
    signToken(jwtRequest, expiration, cfToken!)
      .then(async (resp) => {
        if (resp.success) {
          setToken(resp.token);
          tokenConfirmation.onOpen();
          const issuedJWTRegistryEntry = {
            name: apiKeyName,
            description: apiKeyDescription,
            claims: jwtRequest.claims,
            expiry: expiration,
            organization: user.custom.org,
          };
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function closeModal() {
    setToken("");
    tokenConfirmation.onClose();
    router.push("/tokens");
  }
  return (
    <DetailedView
      topbaractions={navigationItems}
      topbartitle="API Keys"
      showspinner={false}
      headerTitle={{ text: "Create API Key" }}
      subtitle="Create a new API Key"
      actions={<OrbisButton onClick={createToken}>Create</OrbisButton>}
    >
      <Flex gap={2} mb={5}>
        <FormControl>
          <label htmlFor="apiKeyName">API Key Name</label>
          <Input
            rounded={"md"}
            name="apiKeyName"
            value={apiKeyName}
            onChange={(e) => setApiKeyName(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <label htmlFor="apiKeyDescription">Description</label>
          <Input
            rounded={"md"}
            name="description"
            value={apiKeyDescription}
            onChange={(e) => setApiKeyDescription(e.target.value)}
          />
        </FormControl>
      </Flex>
      <Box gap={2} mb={5}>
        <FormControl>
          <label htmlFor="expiration">Expiration</label>
          <InputGroup gap={2}>
            <Input
              rounded={"md"}
              type="number"
              name="expiration"
              value={expiration.value}
              onChange={(e) =>
                setExpiration({
                  ...expiration,
                  value: parseInt(e.target.value),
                })
              }
              placeholder="Expiration"
            />
            <Select
              value={expiration.unit}
              onChange={(e) =>
                setExpiration({
                  ...expiration,
                  unit: e.target.value as "days" | "weeks",
                })
              }
            >
              <option defaultChecked value="days">
                Days
              </option>
              <option value="weeks">Weeks</option>
            </Select>
          </InputGroup>
        </FormControl>
      </Box>
      <OrbisCard>
        <SelectableTable
          headers={["", "Channel", "Description"]}
          rows={channels}
          handleChange={(rows: number[]) => {
            setSelectedChannels(rows);
          }}
        />
      </OrbisCard>
      {/* create a modal to display the new token */}
      <Modal isOpen={tokenConfirmation.isOpen} onClose={closeModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Access Token Created</ModalHeader>
          <ModalBody>
            <Text color={"green"}>
              Your new Access Token has been created. Please save it securely.
            </Text>
            <Text mt={5}>
              <b>Token:</b> {token}
            </Text>
          </ModalBody>
          <ModalFooter>
            <OrbisButton onClick={closeModal}>Close</OrbisButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DetailedView>
  );
}
