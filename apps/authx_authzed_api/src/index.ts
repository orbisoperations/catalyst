import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './router';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import {inferAsyncReturnType} from "@trpc/server";
import {AuthzedClient} from "./authzed"

type ENV = {
	AUTHZED_ENDPOINT: string
	AUTHZED_KEY: string
	AUTHZED_PREFIX: string
}

const createContext = async ({req, env, resHeaders,}: FetchCreateContextFnOptions & { env: ENV, ctx: ExecutionContext, client: AuthzedClient }) => {
	console.log(`Gotttt itt: ${env.AUTHZED_KEY}`);

	const client = new AuthzedClient(env.AUTHZED_ENDPOINT, env.AUTHZED_KEY, env.AUTHZED_PREFIX)
	return { req, resHeaders, env, client };
};

export type Context = inferAsyncReturnType<typeof createContext>;


export default {
	async fetch(request: Request, env: ENV, ctx: ExecutionContext, client: AuthzedClient): Promise<Response> {
		return fetchRequestHandler({
			endpoint: '/',
			req: request,
			router: appRouter,
			createContext: (options: FetchCreateContextFnOptions) => createContext({ ...options, env, ctx, client }),
		});
	},
};
