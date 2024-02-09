import fs from "node:fs";

export interface Config {
    catalystRegistrarEndpoint: string
}

export function getConfig(): Config {
    if (fs.existsSync("./.catalyst.json")) {
        const config = {catalystRegistrarEndpoint: "http://localhost:3000/graphql"} as Config
        return config
    }

 if (fs.existsSync("~/.catalyst.json")) {
        const config = {catalystRegistrarEndpoint: "http://localhost:3000/graphql"} as Config
        return config
    }
 
    const config = {catalystRegistrarEndpoint: "http://localhost:3000/graphql"} as Config
    return config
    
}
