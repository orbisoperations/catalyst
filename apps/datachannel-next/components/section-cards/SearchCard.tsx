"use client";
import { Card, CardBody, Text, Heading, Button, Stack } from "@chakra-ui/react";
import QueryBox from "../QueryBox";
import {useState} from 'react';
export default function QuerySearchCard() {
  const valueState = useState<string>('');

  const defaultValue = `
  query {
    		aircraftWithinDistance(lat: 25.15090749876091, lon: 121.37875727934632, dist: 200) {
        	hex
					flight
					lat
					lon
					alt_geom
					track
					gs
					t
      	}
      	pings {
					UID
					title
					city
					lat
					lon
					expiry
				}
				earthquakes {
					EpicenterLatitude
					EpicenterLongitude
					LocalMagnitude
					expiry
					uuid
				}
    	}
  `;

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
          <Heading size="lg">Active Query</Heading>
          <Text mb="16px" fontSize="md" color="Gray 500">
            Defines data being pulled from catalyst into tak. Edits have no effect.
          </Text>
          <QueryBox mWidth="100%" mHeight="50%" state={valueState} defaultValue={defaultValue} />

        </CardBody>
      </Card>
    </>
  );
}
