"use client";

import { useEffect, useState } from "react";
import { socket } from "@/app/socket";
import { Flex, Text } from "@chakra-ui/react";

export default function SocketConnection(props: {
  handleMessage: (m: any) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("cot", (arg) => {
      console.log({ arg });
      props.handleMessage(arg);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <Flex mb="8px">
      <Flex>
        <Text fontWeight="bold" mr="4px">Status:</Text>
        <Text mr="8px" fontWeight="semibold" textColor={isConnected ? "green" : "red"}> {isConnected ? "Connected" : "Disconnected"}</Text>
      </Flex>
      <Flex>
        <Text fontWeight="bold" mr="4px">Transport:</Text>
        <Text>{transport}</Text>
      </Flex>
    </Flex>
  );
}
