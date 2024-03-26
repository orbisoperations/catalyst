import { Hono } from 'hono'
import {generateKeyPair, CompactSign, KeyLike, exportSPKI, SignJWT, importX509} from "jose";
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import {JWT, JWTSigningRequest} from "./jwt"


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
        const { publicKey, privateKey } = await generateKeyPair('ES384');
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
}


export class HSM {
  state: DurableObjectState
  app: Hono = new Hono()

  constructor(state: DurableObjectState) {
    this.state = state
    this.state.blockConcurrencyWhile(async () => {
        if ((await this.state.storage?.list()).size === 0) {
            const newKey = new KeyState()
            await newKey.init()
            this.state.storage.put("latest", newKey);
            this.state.storage.put(newKey.uuid, newKey)
        }
      })

    /*this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage?.get<number>('value')
      
    })*/

    this.app.get("/pub", async (c) => {
        const key = await this.state.storage.get<KeyState>("latest");
        if (key === undefined) {
            return c.json({
                error: "no key found"
            }, 500)
        }
        return c.json({
            pem: key?.pub()
        }, 200)
    })

    this.app.get("/rotate", async(c) => {
        this.state.blockConcurrencyWhile(async () => {
                const newKey = new KeyState()
                await newKey.init()
                this.state.storage.put("latest", newKey);
          })
    })

    this.app.post("/sign", async (c) => {
        const key = await this.state.storage.get<KeyState>("latest");
        if (key === undefined) {
            return c.json({
                error: "no key found"
            }, 500)
        }
        const jwtreq = await c.req.json<JWTSigningRequest>()
        const jwt = new JWT(jwtreq.entity, jwtreq.claims, "catalyst:root:latest");
        console.log("signing token:" , jwt,jwtreq.expiresIn) 
        const token = await key.sign(jwt)
        return c.json({
            token: token
        }, 200)
    })
  }

  async fetch(request: Request) {
    return this.app.fetch(request)
  }
}