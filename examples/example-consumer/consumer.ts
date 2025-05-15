/*
[X] Dummy consumer for Airplaine and cars
    [X] we need a graphlq to query against Catalyst
    [X] we need a way to convert catalyst data to CoT
    [X] we need to send the messages to the TAK server
 */

import { Config } from './config';

export class Consumer {
    config: Config;
    poll_interval_ms: number;
    catalyst_endpoint: string;

    constructor(config: Config) {
        this.config = config;
        if (!this.config.consumer) {
            throw new Error('Consumer config not found');
        }

        if (
            !this.config.consumer.catalyst_endpoint ||
            !this.config.consumer.catalyst_query ||
            !this.config.consumer.catalyst_token
        ) {
            throw new Error('Catalyst endpoint, query, or token not found');
        }

        this.catalyst_endpoint =
            this.config.consumer.catalyst_endpoint ?? 'https://gateway.catalyst.devintelops.io/graphql';

        this.poll_interval_ms = this.config.consumer.catalyst_query_poll_interval_ms ?? 10 * 1000;
    }

    async doGraphqlQuery() {
        console.log('doing query with token', this.config.consumer!.catalyst_token);
        const result = await fetch(this.catalyst_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: 'Bearer ' + this.config.consumer!.catalyst_token,
            },
            body: JSON.stringify({
                query: this.config.consumer!.catalyst_query,
                // variables: new Object(this.config.consumer!.catalyst_query_variables),
            }),
        });
        console.log('result', result);
        try {
            return await result.json();
        } catch (error) {
            console.error('Error parsing response', error);
            console.error('query', this.config.consumer!.catalyst_query);
            console.error('variables', this.config.consumer!.catalyst_query_variables);
            console.error('response', result);
            return { data: {} };
        }
    }
}
