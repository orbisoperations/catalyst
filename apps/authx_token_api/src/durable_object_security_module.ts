import { JSONWebKeySet, createLocalJWKSet, decodeJwt, jwtVerify } from 'jose';
// @ts-ignore
import { DurableObject } from 'cloudflare:workers';
import { JWTParsingResponse, JWTSigningRequest } from '../../../packages/schema_zod';
import { JWT } from './jwt';
import { KeyState, KeyStateSerialized } from './keystate';

export class JWTKeyProvider extends DurableObject {
	currentKey: KeyState | undefined;
	currentSerializedKey: KeyStateSerialized | undefined;
	async key() {
		if (this.currentKey === undefined) {
			if ((await this.ctx.storage.get<KeyStateSerialized>('default')) === undefined) {
				await this.ctx.blockConcurrencyWhile(async () => {
					const newKey = new KeyState();
					await newKey.init();
					this.currentKey = newKey;
					const serialized = (this.currentSerializedKey = await newKey.serialize());
					await this.ctx.storage.put('latest', serialized);
				});
			} else {
				const serialized = (this.currentSerializedKey = await this.ctx.storage.get<KeyStateSerialized>('default')!);
				this.currentSerializedKey = serialized;
				this.currentKey = await KeyState.deserialize(serialized!);
			}
		}

		return this.currentKey!;
	}

	async getPublicKey() {
		return {
			pem: (await this.key()).pub(),
		};
	}

	async getJWKS(): Promise<JSONWebKeySet> {
		await this.key();
		return {
			keys: [this.currentSerializedKey!.public],
		};
	}

	async rotateKey() {
		await this.ctx.blockConcurrencyWhile(async () => {
			const newKey = new KeyState();
			await newKey.init();
			this.currentKey = newKey;
			const serialize = await newKey.serialize();
			this.currentSerializedKey = serialize;
			await this.ctx.storage.put('default', serialize);
		});
		return true;
	}

	async signJWT(req: JWTSigningRequest, expiresIn: number) {
		await this.key();
		const jwt = new JWT(req.entity, req.claims, 'catalyst:system:jwt:latest');
		console.log(this.currentSerializedKey);
		const newToken = await this.currentKey!.sign(jwt, expiresIn);
		const payload = decodeJwt(newToken);
		const expiration = payload.exp as number;

		return {
			token: await this.currentKey!.sign(jwt, expiresIn),
			expiration,
		};
	}

	async validateToken(token: string) {
		await this.key();
		try {
			const pub = this.currentSerializedKey?.public;
			if (!pub) {
				const resp = JWTParsingResponse.parse({
					valid: false,
					entity: undefined,
					claims: [],
					error: 'no public key found',
				});
				console.error('no public key found', resp);
				return resp;
			}
			const jwkPub = createLocalJWKSet(await this.getJWKS());
			const { payload, protectedHeader } = await jwtVerify(token, jwkPub);
			const resp = JWTParsingResponse.parse({
				valid: true,
				entity: payload.sub,
				claims: payload.claims,
			});
			console.log({ resp });
			return resp;
		} catch (e: any) {
			console.log('error validating token', e);
			return JWTParsingResponse.parse({
				valid: false,
				entity: undefined,
				claims: [],
				error: `${e}`,
			});
		}
	}
}
