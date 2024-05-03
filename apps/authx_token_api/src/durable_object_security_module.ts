import { generateKeyPair, jwtVerify, KeyLike, exportSPKI, importSPKI, SignJWT, exportJWK, importJWK, JWK } from 'jose';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { JWT } from './jwt';
import { DurableObject } from 'cloudflare:workers';
import { JWTParsingResponse, JWTSigningRequest } from '../../../packages/schema_zod';

interface KeyStateSerialized {
	private: JWK;
	public: JWK;
	publicPEM: string;
	uuid: string;
	expiry: number;
	expired: boolean;
}
export class KeyState {
	private expired: boolean = false;
	publicKey: KeyLike;
	publicKeyPEM: string;
	private privateKey: KeyLike;
	uuid;
	lastKey: string | undefined;
	expiry;
	constructor() {
		this.uuid = uuidv4();
		this.expiry = 60 * 60 * 24 * 7; // 1 week in millis
		this.publicKey = {} as KeyLike;
		this.privateKey = {} as KeyLike;
		this.publicKeyPEM = '';
		this.lastKey = undefined;
	}

	async init() {
		const { publicKey, privateKey } = await generateKeyPair('EdDSA', {
			extractable: true,
		});
		this.publicKey = publicKey;
		this.privateKey = privateKey;
		this.publicKeyPEM = await exportSPKI(publicKey);
	}

	expire() {
		this.expired = true;
		this.publicKey = {} as KeyLike;
		this.privateKey = {} as KeyLike;
	}

	isExpired(): boolean {
		return this.expired;
	}

	async sign(jwt: JWT, expiry: number = 60 * 60 * 24 * 7) {
		const payload = jwt.payloadRaw(expiry);

		return new SignJWT(payload).setProtectedHeader({ alg: 'EdDSA' }).sign(this.privateKey);
	}

	pub() {
		return this.publicKeyPEM;
	}

	async serialize(): Promise<KeyStateSerialized> {
		return {
			private: await exportJWK(this.privateKey),
			public: await exportJWK(this.publicKey),
			uuid: this.uuid,
			expiry: this.expiry,
			expired: this.expired,
			publicPEM: this.publicKeyPEM,
		};
	}

	static async deserialize(keySerialized: KeyStateSerialized) {
		const key = new KeyState();
		key.privateKey = (await importJWK<KeyLike>(keySerialized.private, 'ES384')) as KeyLike;
		key.publicKey = (await importJWK<KeyLike>(keySerialized.public, 'ES384')) as KeyLike;
		key.uuid = keySerialized.uuid;
		key.expiry = keySerialized.expiry;
		key.expired = keySerialized.expired;
		key.publicKeyPEM = keySerialized.publicPEM;

		return key;
	}
}

export class JWTKeyProvider extends DurableObject {
	currentKey: KeyState | undefined;

	async key() {
		if (this.currentKey === undefined) {
			if ((await this.ctx.storage.get<KeyStateSerialized>('default')) === undefined) {
				await this.ctx.blockConcurrencyWhile(async () => {
					const newKey = new KeyState();
					await newKey.init();
					this.currentKey = newKey;
					await this.ctx.storage.put('latest', await newKey.serialize());
				});
			} else {
				this.currentKey = await KeyState.deserialize((await this.ctx.storage.get<KeyStateSerialized>('default'))!);
			}
		}

		return this.currentKey!;
	}

	async getPublicKey() {
		return {
			pem: (await this.key()).pub(),
		};
	}

	async rotateKey() {
		await this.ctx.blockConcurrencyWhile(async () => {
			const newKey = new KeyState();
			await newKey.init();
			this.currentKey = newKey;
			await this.ctx.storage.put('default', await newKey.serialize());
		});
		return true;
	}

	async signJWT(req: JWTSigningRequest, expiresIn: number) {
		const jwt = new JWT(req.entity, req.claims, 'catalyst:system:jwt:latest');
		return {
			token: await (await this.key()).sign(jwt, expiresIn),
		};
	}

	async validateToken(token: string) {
		const key = await this.key();
		try {
			const { payload, protectedHeader } = await jwtVerify(token, key.publicKey);
			return JWTParsingResponse.parse({
				valid: true,
				entity: payload.sub,
				claims: payload.claims,
			});
		} catch (e: any) {
			return JWTParsingResponse.parse({
				valid: false,
				entity: undefined,
				claims: [],
				error: e.message as string,
			});
		}
	}
}
