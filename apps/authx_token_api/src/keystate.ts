import { generateKeyPair, jwtVerify, KeyLike, exportSPKI, importSPKI, SignJWT, exportJWK, importJWK, JWK, createLocalJWKSet } from 'jose';
import { JWT } from './jwt';
import {DEFAULT_STANDARD_DURATIONS} from "../../../packages/schema_zod"

export const KEY_ALG = 'EdDSA'



export interface KeyStateSerialized {
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
		this.uuid = crypto.randomUUID();
		// this is the max value
		this.expiry = DEFAULT_STANDARD_DURATIONS.Y
		this.publicKey = {} as KeyLike;
		this.privateKey = {} as KeyLike;
		this.publicKeyPEM = '';
		this.lastKey = undefined;
	}

	async init() {
		const { publicKey, privateKey } = await generateKeyPair(KEY_ALG, {
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

	async sign(jwt: JWT, expiry: number) {

		const payload = jwt.payloadRaw(expiry <= this.expiry ? expiry : this.expiry);

		return new SignJWT(payload).setProtectedHeader({ alg: KEY_ALG }).sign(this.privateKey);
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
		key.privateKey = (await importJWK<KeyLike>(keySerialized.private, KEY_ALG)) as KeyLike;
		key.publicKey = (await importJWK<KeyLike>(keySerialized.public, KEY_ALG)) as KeyLike;
		key.uuid = keySerialized.uuid;
		key.expiry = keySerialized.expiry;
		key.expired = keySerialized.expired;
		key.publicKeyPEM = keySerialized.publicPEM;
		return key;
	}
}
