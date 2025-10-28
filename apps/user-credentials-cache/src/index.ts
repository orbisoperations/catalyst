import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { User, UserSchema } from '@catalyst/schemas';
import { Env } from './env';

/**
 * Type definition for the nested role structure within the Cloudflare Access identity response.
 * Example:
 * {
 *   'platform-admin': { 'org-id': 'org-id.domain' },
 *   'org-admin': { 'org-id': 'org-id.domain' },
 *   ...
 * }
 */
type Roles = Record<string, Record<string, string>>;

type OrganizationWithRoles = {
	org: string;
	roles: string[];
};

export function getOrgFromRoles(roles: Roles): OrganizationWithRoles | undefined {
	const adminRoles = ['platform-admin', 'org-admin', 'org-user', 'data-custodian'];
	const roleKeys = Object.keys(roles);
	const rolesList = roleKeys.filter((key) => adminRoles.includes(key));
	const adminRoleKey = roleKeys.find((key) => adminRoles.includes(key));

	if (!adminRoleKey) return undefined;

	const role = roles[adminRoleKey];
	const orgKeys = Object.keys(role);

	if (orgKeys.length === 0) return undefined;

	const org = orgKeys[0];

	return {
		org: role[org].split('.')[0],
		roles: rolesList,
	};
}

export class UserCredsCache extends DurableObject<Env> {
	async getUser(token: string) {
		let user: User | undefined = undefined;
		user = await this.ctx.storage.get<User>(token);
		if (user) {
			// cleanup
			await this.ctx.waitUntil(this.purge(token, user));
			return user;
		}

		// cache MISS
		user = await this.validateUser(token);
		if (user) {
			await this.ctx.storage.put(token, user);
			//cleanup
			await this.ctx.waitUntil(this.purge(token, user));
			return user;
		}

		return user;
	}

	async validateUser(token: string) {
		const resp = await fetch('https://orbisops.cloudflareaccess.com/cdn-cgi/access/get-identity', {
			method: 'GET',
			headers: {
				cookie: `CF_Authorization=${token}`,
			},
		});

		if (!resp.ok) {
			return undefined;
		}

		try {
			const cfUser = (await resp.json()) as {
				email: string;
				custom: Record<string, Record<string, Record<string, string>>>;
			};
			const user: string = cfUser.email;
			const orgFromRoles = getOrgFromRoles(cfUser.custom['urn:zitadel:iam:org:project:roles']);
			if (!orgFromRoles) return undefined;
			const { org, roles } = orgFromRoles;

			console.log('verified user attribs', user, org);

			if (user && org) {
				const objectToParse = {
					userId: user,
					orgId: org,
					zitadelRoles: roles,
				};

				const parseUser = UserSchema.safeParse(objectToParse);
				if (!parseUser.success) {
					return undefined;
				}
				return parseUser.data;
			} else {
				console.error('user or org is undefined and unable to validate user');
				return undefined;
			}
		} catch (e) {
			console.error(e);
			console.error('unable to validate user');
			return undefined;
		}
	}

	/**
	 * Purges old tokens associated with the same user from the Durable Object storage.
	 * This is called as a background task (`ctx.waitUntil`) after a successful `getUser`
	 * operation (either cache hit or cache miss/validation) to ensure that only the
	 * most recently used token for a given user identity potentially remains.
	 *
	 * It iterates through all stored key-value pairs, comparing the `userId` and `orgId`
	 * of the stored user (`oUser`) with the provided `user`. If they match, but the
	 * stored token (`oToken`) is different from the current `token`, the old entry is deleted.
	 *
	 * @param token - The current, validated token that triggered the purge.
	 * @param user - The user object associated with the current `token`.
	 * @returns A Promise that resolves when the purge operation is complete.
	 */
	async purge(token: string, user: User) {
		const users = await this.ctx.storage.list<User>();
		for (const [oToken, oUser] of Array.from(users.entries())) {
			if (user.userId == oUser.userId && user.orgId == oUser.orgId && token != oToken) {
				// purge entries where user is the same but token is old/diff
				await this.ctx.storage.delete(oToken);
			}
		}
	}
}

/**
 * Default export for the Worker, extending WorkerEntrypoint for type safety with Env.
 * This worker primarily acts as an entry point to interact with the UserCredsCache Durable Object.
 */
export default class UserCredsCacheWorker extends WorkerEntrypoint<Env> {
	/**
	 * Retrieves user information by interacting with the UserCredsCache Durable Object.
	 * This method is intended to be called from other Workers or services that need
	 * to resolve a Cloudflare Access token to user details.
	 *
	 * It gets a stub for the appropriate Durable Object instance (based on `cacheNamespace`)
	 * and calls the `getUser` method on that stub.
	 *
	 * @param token - The Cloudflare Access token (`CF_Authorization` cookie value) to look up.
	 * @param cacheNamespace - A namespace string to determine which Durable Object instance to use. Defaults to 'default'.
	 * @returns A Promise resolving to the `User` object if found/validated, or `undefined`.
	 */
	async getUser(token: string, cacheNamespace: string = 'default') {
		const id = this.env.CACHE.idFromName(cacheNamespace);
		const stub: DurableObjectStub<UserCredsCache> = this.env.CACHE.get(id);
		const user = await stub.getUser(token);
		return user;
	}
}
