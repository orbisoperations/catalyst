"use client";
import {Button, Card, CardBody, Heading, Input, Text} from "@chakra-ui/react";
import QueryBox from "../QueryBox";
import {useContext, useState} from 'react';
import {QueryItemsContext, QueryItemsDispatchContext} from "@/components/query-items/context";
import {QueryItem} from "@/components/contexts/AppState";

export default function QueryCreateCard() {

  // @ts-ignore
  const dispatch = useContext(QueryItemsDispatchContext);
  // @ts-ignore
  const {queryInput} = useContext(QueryItemsContext);

  function setInputs(inputPayload: Partial<QueryItem>) {
    dispatch({
      type: "input",
      payload: inputPayload
    })
  }

  function handleSubmitQuery(queryPayload: QueryItem) {
    console.log('adding a new active query', queryPayload);
    dispatch({
      type: "create",
      payload: queryPayload
    })
  }
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
      body: queryInput?.value[0]
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
            <Heading size="lg">Create</Heading>

            <Input
                placeholder="Dataset name"
                bg="white"
                mt="6px"
                value={queryInput.name}
                onChange={(e) => {
                  setInputs({
                    name: String(e.target.value)
                  })
                }}
            />

            <Text mb="16px" fontSize="md" color="Gray 500">
              Enter a valid catalyst query
            </Text>
            {/*//@ts-ignore state incorrectly expects the type of queryValue.value*/}
            <QueryBox mWidth="100%" mHeight="50%" state={
              [
                queryInput,
                (arg) => {
                  setInputs(
                      {
                        value: arg
                      }
                  )
                }
              ]} defaultValue={defaultValue}/>
          </CardBody>
          <Button onClick={() => {
            console.log({queryValue: queryInput.value})
            handleSubmitQuery(queryInput)
          }}>
            +
          </Button>
        </Card>
      </>
  );
}
