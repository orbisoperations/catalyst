import { Hono } from 'hono'
import {generateKeyPair, jwtVerify, KeyLike, exportSPKI, importSPKI, SignJWT, exportJWK, importJWK, JWK} from "jose";
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import {JWT, JWTSigningRequest} from "./jwt"

interface KeyStateSerialized {
    private: JWK
    public: JWK
    publicPEM: string
    uuid: string
    expiry: number
    expired: boolean
}
export class KeyState {
    private expired: boolean = false
    publicKey: KeyLike;
    publicKeyPEM: string;
    private privateKey: KeyLike;
    uuid;
    lastKey: string | undefined
    expiry;
    constructor() {
        this.uuid = uuidv4();
        this.expiry = 60 * 60 * 24 * 7; // 1 week
        this.publicKey = {} as KeyLike;
        this.privateKey = {} as KeyLike;
        this.publicKeyPEM = ""
        this.lastKey = undefined
    }

    async init() {
        const { publicKey, privateKey } = await generateKeyPair('ES384', {
            extractable: true
        });
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.publicKeyPEM = await exportSPKI(publicKey)
    }

    expire() {
        this.expired = true 
        this.publicKey = {} as KeyLike;
        this.privateKey = {} as KeyLike;
    }

    isExpired(): boolean {
        return this.expired
    }

    async sign(jwt: JWT) {
        const payload = jwt.payloadRaw(this.expiry)

        return new SignJWT(payload)
        .setProtectedHeader({alg: "ES384"})
        .sign(this.privateKey);
        
    }

    pub() {
        return this.publicKeyPEM
    }

    async serialize(): Promise<KeyStateSerialized> {
        return {
            private: await exportJWK(this.privateKey),
            public: await exportJWK(this.publicKey),
            uuid: this.uuid,
            expiry: this.expiry,
            expired: this.expired,
            publicPEM: this.publicKeyPEM
        }
    }

    static async deserialize(keySerialized: KeyStateSerialized) {
        const key = new KeyState()
        key.privateKey = (await importJWK<KeyLike>(keySerialized.private, "ES384")) as KeyLike
        key.publicKey = (await importJWK<KeyLike>(keySerialized.public, "ES384")) as KeyLike
        key.uuid = keySerialized.uuid
        key.expiry = keySerialized.expiry
        key.expired = keySerialized.expired
        key.publicKeyPEM = keySerialized.publicPEM

        return key
    }
}


export class HSM {
  state: DurableObjectState
  app: Hono = new Hono()

  constructor(state: DurableObjectState) {
    this.state = state
    this.state.blockConcurrencyWhile(async () => {
        console.log("setting latest key")
        if (await this.state.storage.get<KeyState>("latest") === undefined) {
            console.log("creating new latest key")
            const newKey = new KeyState()
            await newKey.init()
            await this.state.storage.put("latest", await newKey.serialize());
            console.log(`key ${newKey.uuid} created`)
        }
      })

    /*this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage?.get<number>('value')
      
    })*/

    this.app.get("/pub", async (c) => {
        const keySerialized = await this.state.storage.get<KeyStateSerialized>("latest");
        if (keySerialized === undefined) {
            return c.json({
                error: "no key found"
            }, 500)
        }
        const key = await KeyState.deserialize(keySerialized)
        return c.json({
            pem: key.pub()
        }, 200)
    })

    /*this.app.get("/rotate", async(c) => {
        this.state.blockConcurrencyWhile(async () => {
                const newKey = new KeyState()
                await newKey.init()
                this.state.storage.put("latest", newKey);
          })
    })*/

    this.app.post("/sign", async (c) => {
        const keySerialized = await this.state.storage.get<KeyStateSerialized>("latest");
        if (keySerialized === undefined) {
            return c.json({
                error: "no key found"
            }, 500)
        }
        const key = await KeyState.deserialize(keySerialized)
        const jwtreq = await c.req.json<JWTSigningRequest>()
        const jwt = new JWT(jwtreq.entity, jwtreq.claims, "catalyst:root:latest");
        //console.log("signing token:" , jwt,jwtreq.expiresIn)
        const token = await key.sign(jwt)
        return c.json({
            token: token
        }, 200)
    })

    this.app.post("/validate", async (c) => {
        const {token} = await c.req.json<{ token: string }>()
        const keySerialized = await this.state.storage.get<KeyStateSerialized>("latest");
        if (keySerialized === undefined) {
            return c.json({
                error: "no key found"
            }, 500)
        }
        const key = await KeyState.deserialize(keySerialized)
        try {
            const {payload, protectedHeader} = await jwtVerify(token, key.publicKey);
            //console.log(payload, protectedHeader)
            return c.json({
                valid: true,
            }, 200)
        } catch (e: any) {
            return c.json({
                error: e.message
            }, 200)
        }
    })
  }

  async fetch(request: Request) {
    return this.app.fetch(request)
  }
}