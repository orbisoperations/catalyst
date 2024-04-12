import { createConnectTransport } from "@connectrpc/connect-web";
import { createPromiseClient } from "@connectrpc/connect";
import {PermissionsService} from "@buf/authzed_api.connectrpc_es/authzed/api/v1/permission_service_connect"

export class AuthzedClient {
	endpoint: string;
	token: string;
	schemaPrefix: string;
	client

	constructor(endpoint: string, token: string, schemaPrefix?: string) {
		this.endpoint = endpoint;
		this.token = token;

		this.schemaPrefix = schemaPrefix ?? 'orbisops_tutorial/';

		// @ts-ignore
		const transport = createConnectTransport({
			baseUrl: endpoint,
			// @ts-ignore
			fetch: (input, init?) => {
				if (init){
					delete init["mode"]
					delete init["credentials"]
					delete init["redirect"]
				}
				throw  new Error(`${input}`)

				return fetch(input, {
					...init
				})
			}
		});
		this.client  = createPromiseClient(PermissionsService, transport);
	}

	headers(): object {
		return {
			Authorization: `Bearer ${this.token}`,
		};
	}

	async post(action: string, data: any) {
		return fetch(`${this.endpoint}/v1/relationships/${action}`, {
			method: 'POST',
			headers: {
				...this.headers(),
			},
			body: JSON.stringify(data),
		})
	}
}
