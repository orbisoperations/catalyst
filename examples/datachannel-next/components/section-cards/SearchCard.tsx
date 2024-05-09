"use client";
import { Card, CardBody, Text, Heading, Button, Stack } from "@chakra-ui/react";
import QueryBox from "../QueryBox";
import {useState} from 'react';
export default function QuerySearchCard() {
  const valueState = useState<string>('')
  const defaultValue = ` query MyQuery {
    aircraftWithinDistance(dist: 1.5, lat: 1.5, lon: 1.5) {
      lat
      lon
    }
  }`;

  function runQuery() {

    const url = "/api/get-query";


    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: valueState[0]
    })
      .then((res) => res.text())
      .then((data) => {
        console.log(data);
      });
  }

  return (
    <>
      <Card w="100%" h="100%" variant="filled">
        <CardBody display="flex" flexDirection="column" justifyContent="center">
          <Heading size="lg">Search for data channel</Heading>
          <Text mb="16px" fontSize="md" color="Gray 500">
            A description will go here to help people understand what the
            section is for.
          </Text>
          <QueryBox mWidth="100%" mHeight="50%" state={valueState} defaultValue={defaultValue} />
          <Button onClick={runQuery} mt="16px" colorScheme="blue">
            Search Query
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
