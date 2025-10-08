import { JSONWebKeySet, JWTPayload, createLocalJWKSet, decodeJwt, jwtVerify } from 'jose';
import { DurableObject } from 'cloudflare:workers';
import { DEFAULT_STANDARD_DURATIONS, JWTParsingResponse, JWTSigningRequest } from '@catalyst/schema_zod';
import { JWT } from './jwt';
import { KeyState, KeyStateSerialized } from './keystate';

export class JWTKeyProvider extends DurableObject {
	currentKey: KeyState | undefined;
	currentSerializedKey: KeyStateSerialized | undefined;
	async key() {
		if (this.currentKey === undefined) {
			if ((await this.ctx.storage.get<KeyStateSerialized>('current')) === undefined) {
				await this.ctx.blockConcurrencyWhile(async () => {
					const newKey = new KeyState();
					await newKey.init();
					this.currentKey = newKey;
					const serialized = (this.currentSerializedKey = await newKey.serialize());
					await this.ctx.storage.put('current', serialized);
				});
			} else {
				const serialized = (this.currentSerializedKey = await this.ctx.storage.get<KeyStateSerialized>('current')!);
				this.currentSerializedKey = serialized;
				this.currentKey = await KeyState.deserialize(serialized!);
			}
		}

		return this.currentKey!;
	}

	async getSerializedKey() {
		return this.currentSerializedKey;
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
		const newToken = await this.currentKey!.sign(jwt, expiresIn);
		const payload = decodeJwt(newToken);
		const expiration = (payload.exp as number) * DEFAULT_STANDARD_DURATIONS.S;
		return {
			token: newToken,
			expiration,
		};
	}

	async decodeToken(token: string): Promise<{ success: boolean; payload: JWTPayload }> {
		const decodedToken = decodeJwt(token);
		if (!decodedToken) {
			return {
				success: false,
				payload: decodedToken,
			};
		}
		return {
			success: true,
			payload: decodedToken,
		};
	}

	async validateToken(token: string, clockTolerance: string = '5 minutes'): Promise<JWTParsingResponse> {
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

			const { payload } = await jwtVerify(token, jwkPub, { clockTolerance });
			const resp = JWTParsingResponse.parse({
				valid: true,
				entity: payload.sub,
				claims: payload.claims,
				jwtId: payload.jti,
			});
			return resp;
		} catch (e: unknown) {
			console.error('error validating token', e);
			return JWTParsingResponse.parse({
				valid: false,
				entity: undefined,
				claims: [],
				error: `${e}`,
			});
		}
	}
}
