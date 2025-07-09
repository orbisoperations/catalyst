'use client';
import { Button, Card, CardBody, Heading, Input, InputGroup, InputLeftAddon, Text } from '@chakra-ui/react';
import QueryBox from '../QueryBox';
import { QueryItem } from '@/components/contexts/AppState';
import { useQueryItems } from '@/components/query-items-list/context';
import React from 'react';
import { ArrowRightIcon } from '@chakra-ui/icons';

export default function NewFeedWizardCard() {
    const { queryItems, queryInput, dispatch } = useQueryItems();

    function setInputs(inputPayload: Partial<QueryItem>) {
        dispatch({
            type: 'input',
            payload: inputPayload,
        });
    }

    function handleSubmitQuery(queryPayload: QueryItem) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filledKeys = Object.keys(queryPayload).filter((key) => (queryPayload as any)[key]['length'] > 0);
        if (filledKeys.length !== Object.keys(queryPayload).length) {
            throw 'All fields must be filled';
        }

        dispatch({
            type: 'create',
            payload: queryPayload,
        });
        console.log(queryItems);
    }

    const defaultValue = `query {
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

    return (
        <>
            <Card w="100%" h="100%" variant="filled">
                <CardBody display="flex" flexDirection="column">
                    <Heading size="lg">Feed Wizard</Heading>
                    <Text>Define a feed by providing a valid query</Text>
                    <InputGroup my="8px">
                        <InputLeftAddon>Feed Name</InputLeftAddon>
                        <Input
                            variant="outline"
                            placeholder=" e.g homies-on-le-flot"
                            bg="white"
                            size="md"
                            value={queryInput?.name}
                            onChange={(e) => {
                                setInputs({
                                    name: String(e.target.value),
                                });
                            }}
                        />
                    </InputGroup>
                    <QueryBox
                        mWidth="100%"
                        mHeight="75%"
                        state={[
                            String(queryInput),
                            (arg) => {
                                setInputs({
                                    value: arg,
                                });
                            },
                        ]}
                        defaultValue={defaultValue}
                    />
                    <Button
                        w="40%"
                        my="4"
                        variant="solid"
                        colorScheme="blue"
                        p={'5%'}
                        justifyContent={'space-between'}
                        onClick={() => {
                            console.log({ queryValue: queryInput.value });
                            handleSubmitQuery(queryInput as QueryItem);
                        }}
                    >
                        <Text>CREATE FEED</Text>
                        <ArrowRightIcon />
                    </Button>
                </CardBody>
            </Card>
        </>
    );
}
