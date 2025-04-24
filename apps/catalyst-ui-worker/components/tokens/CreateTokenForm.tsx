"use client";
import { JWTRequest } from "@/app/types";
import {
  APIKeyText,
  ErrorCard,
  OrbisButton,
  OrbisCard,
  SelectableTable,
} from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { navigationItems } from "@/utils/nav.utils";
import {
  DataChannel,
  IssuedJWTRegistry,
  JWTSigningResponse,
} from "@catalyst/schema_zod";
import { Box, Flex } from "@chakra-ui/layout";
import {
  FormControl,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/User/UserContext";

type CreateTokensFormProps = {
  signToken: (
    req: JWTRequest,
    expiration: {
      value: number;
      unit: "days" | "weeks";
    },
    cfToken: string,
  ) => Promise<JWTSigningResponse>;
  listChannels: (token: string) => Promise<DataChannel[]>;
  createIJWTRegistry: (
    token: string,
    data: Omit<IssuedJWTRegistry, "id">,
  ) => Promise<IssuedJWTRegistry | undefined>;
};

export default function CreateTokensForm({
  signToken,
  listChannels,
  createIJWTRegistry,
}: CreateTokensFormProps) {
  const router = useRouter();
  const tokenConfirmation = useDisclosure();
  const { user, token: cfToken } = useUser();
  const [channels, setChannels] = useState<any[]>([]);
  const [channelsResponse, setChannelsResponse] = useState<DataChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [apiKeyName, setApiKeyName] = useState<string>("");
  const [apiKeyDescription, setApiKeyDescription] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [expiration, setExpiration] = useState<{
    value: number;
    unit: "days" | "weeks";
  }>({ value: 7, unit: "days" });
  function fetchChannels() {
    setHasError(false);
    if (cfToken) {
      listChannels(cfToken)
        .then((channels) => {
          setChannels(
            channels.map((channel) => [channel.name, channel.description]),
          );
          setChannelsResponse(channels);
        })
        .catch((e) => {
          setHasError(true);
          setErrorMessage(
            "An error occurred while fetching the channels. Please try again later.",
          );
        });
    }
  }
  useEffect(fetchChannels, [cfToken]);

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
            expiry: new Date(resp.expiration),
            organization: user.custom.org,
          } as Omit<IssuedJWTRegistry, "id">;
          const iJWTRegistryEntry = await createIJWTRegistry(
            cfToken,
            issuedJWTRegistryEntry,
          ).catch((e) => {
            setHasError(true);
            setErrorMessage(
              "An error occurred while creating the token. Please try again later.",
            );
          });
          if (iJWTRegistryEntry) {
            console.log("created iJWTRegistryEntry", iJWTRegistryEntry);
          }
        }
      })
      .catch((err) => {
        setHasError(true);
        setErrorMessage(
          "An error occurred while creating the token. Please try again later.",
        );
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
      actions={
        !hasError ? (
          <OrbisButton isDisabled={selectedChannels.length === 0 || apiKeyName.length === 0 || apiKeyDescription.length === 0} onClick={createToken}>Create</OrbisButton>
        ) : undefined
      }
    >
      {selectedChannels.length === 0 && (
        <Text color="gray.500" fontSize="sm" mb={2}>Please select at least one channel</Text>
      )}
      {hasError ? (
        <ErrorCard title="Error" message={errorMessage} retry={fetchChannels} />
      ) : (
        <Box>
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
        </Box>
      )}

      <TokenCreatedModal
        token={token}
        tokenConfirmation={tokenConfirmation}
        onClose={closeModal}
      />
    </DetailedView>
  );
}

interface TokenCreatedModalProps {
  token: string;
  tokenConfirmation: ReturnType<typeof useDisclosure>;
  onClose: () => void;
}

function TokenCreatedModal(props: TokenCreatedModalProps) {
  "use client";
  const { token, tokenConfirmation, onClose } = props;
  const [copyButtonMessage, setCopyButtonMessage] =
    useState<string>("Copy Token");
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopyButtonMessage("Copied");
    setTimeout(() => setCopyButtonMessage("Copy Token"), 1000);
  };
  return (
    <Modal isOpen={tokenConfirmation.isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Access Token Created</ModalHeader>
        <ModalBody>
          <Text color={"green"}>
            Your new Access Token has been created. Please save it securely.
          </Text>
          <Text mt={5}>
            <b>Token:</b>
            <APIKeyText showAsClearText>
              {`********${token.slice(-15)}`}
            </APIKeyText>
          </Text>
          <OrbisButton onClick={copyToken} mt={5}>
            {copyButtonMessage}
          </OrbisButton>
        </ModalBody>
        <ModalFooter>
          <OrbisButton onClick={onClose}>Close</OrbisButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
