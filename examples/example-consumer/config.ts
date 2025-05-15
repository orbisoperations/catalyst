import fs from 'fs';
import toml from 'toml';

export interface Config {
    dev: boolean;
    consumer?: {
        catalyst_endpoint: string;
        catalyst_token: string;
        catalyst_query: string;
        catalyst_query_variables: Record<string, unknown>;
        catalyst_query_poll_interval_ms: number;
    };
}

export function getConfig() {
    const configPath = process.env.CONFIG_PATH || 'config.toml';
    const config = toml.parse(fs.readFileSync(configPath).toString());

    console.log(config);

    return config as Config;
}
