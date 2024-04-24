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

type CreateTokensFormProps = {
  signToken: (
    req: JWTRequest,
    expiration: {
      value: number;
      unit: "days" | "weeks";
    }
  ) => Promise<{ token: string }>;
  listChannels: () => Promise<any[]>;
};

export default function CreateTokensForm({
  signToken,
  listChannels,
}: CreateTokensFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [token, setToken] = useState<string>("");
  const tokenConfirmation = useDisclosure();
  const [expiration, setExpiration] = useState<{
    value: number;
    unit: "days" | "weeks";
  }>({ value: 7, unit: "days" });
  useEffect(() => {
    listChannels().then((resp) => {
      console.log(resp);
      setChannels(resp.map((channel) => [channel.name, channel.description]));
    });
  }, []);

  function createToken() {
    const jwtRequest: JWTRequest = {
      claims: channels
        .filter((_, i) => selectedChannels.includes(i))
        .map((channel) => channel[0]),
      entity:
        (user && user.custom.org && `${user?.custom.org}/${user?.email}`) ||
        "default",
    };
    signToken(jwtRequest, expiration)
      .then((resp) => {
        setToken(resp.token);
        tokenConfirmation.onOpen();
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
      headerTitle={{ text: "Create API Key" }}
      subtitle="Create a new API Key"
      actions={<OrbisButton onClick={createToken}>Create</OrbisButton>}
    >
      <Flex gap={2} mb={5}>
        <FormControl>
          <label htmlFor="apiKeyName">API Key Name</label>
          <Input rounded={"md"} name="apiKeyName" />
        </FormControl>
        <FormControl>
          <label htmlFor="apiKeyDescription">Description</label>
          <Input rounded={"md"} name="description" />
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
