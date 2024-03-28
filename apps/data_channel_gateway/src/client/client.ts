import {Client, fetchExchange, gql} from '@urql/core';

export class UrlqGraphqlClient {

  client: Client;

  customFetcher: (input: RequestInfo | URL, init?: RequestInit<CfProperties<unknown>> | undefined) => Promise<Response>;

  constructor(fetcher: Fetcher) {

    this.customFetcher = (input: RequestInfo | URL, init?: RequestInit<CfProperties<unknown>> | undefined) => {

      if (typeof input === 'string') {
        return fetcher.fetch(input);
      }

      if (input instanceof Request) {
        return fetcher.fetch(input);
      }

      throw new Error('Invalid fetch input in UrlqGraphqlClient');
    }

    this.client = new Client({
      url: `https://data_channel_registrar/graphql`,
      exchanges: [fetchExchange],
      preferGetMethod: "within-url-limit",
      fetch: this.customFetcher
    });
  }


  async allDataChannels() {
      const query = gql`
          query {
              allDataChannels {
                  endpoint
              }
          }
      `;

    const response = await this.client.query(query, {}).toPromise();

    return response.data.allDataChannels
  }
}