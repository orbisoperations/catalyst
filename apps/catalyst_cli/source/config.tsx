import fs from "fs";
import React from 'react';


export interface Config {

}

export function getConfig(): [Config,React.JSX.Element] {
    
    return [{}, (<></>)]
}

export function setConfig(c: Config) {

}
