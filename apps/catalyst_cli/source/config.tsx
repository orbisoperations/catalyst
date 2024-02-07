import fs from "fs";
import { Text } from "ink";
import React from 'react';

export interface Config {
    catalystRegistrarEndpoint: string
}

export function getConfig(): [Config, React.JSX.Element] {
    if (fs.existsSync("./.catalyst.json")) {
        const config = {catalystRegistrarEndpoint: "http://localhost:3000"} as Config
        return [ config, (<><Text>In Memory Config Used: {`${config}`}</Text></>)]
    } else if (fs.existsSync("~/.catalyst.json")) {
        const config = {catalystRegistrarEndpoint: "http://localhost:3000"} as Config
        return [ config, (<><Text>In Memory Config Used: {`${config}`}</Text></>)]
    } else {
        const config = {catalystRegistrarEndpoint: "http://localhost:3000"} as Config
        return [ config, (<><Text>In Memory Config Used: {`${config}`}</Text></>)]
    }
}

/*
export function setConfig(c: Config): React.JSX.Element {

    return <></>
}*/
