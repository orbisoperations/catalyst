import { Hono } from 'hono'
import {generateKeyPair, CompactSign, KeyLike, exportSPKI, SignJWT, importX509} from "jose";
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import {JWT, JWTSigningRequest} from "./jwt"


class KeyState {
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

    this.app.get('/pub/:keyid?', async (c) => {
      // get  pem
        const {keyid} = c.req.param()
        let key: KeyState | undefined;
        if (keyid) {
            key = await this.state.storage.get<KeyState>(keyid);
        } else {
            key = await this.state.storage.get<KeyState>("latest");
        } 

        if (key) {
            return c.json({
                pem: key.publicKeyPEM
            }, 200)
        }
        
        return c.json({
            error: "no key found"
        }, 404)
    });

    this.app.get("/versions", async (c) => {
        // get versions and pems for keys
        const allKeys = await this.state.storage.list<KeyState>();

        const pems: {
            pem: string,
            expired: boolean,
            version: string
        }[] = []

        let done = false;
        let mapKey: string | undefined = "latest"
        while(!done) {
            if (mapKey && allKeys.has(mapKey)) {
                pems.push({
                    pem: allKeys.get(mapKey)?.publicKeyPEM!,
                    expired: allKeys.get(mapKey)?.isExpired()!,
                    version: mapKey,
                })

                mapKey = allKeys.get(mapKey)?.lastKey;
            } else {
                done = true;
                break;
            }
        }
    })

    this.app.get("/revoke", async (c) => {
        // revoke key (set expired) and nulligy key material
        // rotate key

        const currentLatest = await this.state.storage.get<KeyState>("latest")!;
        currentLatest?.expire()
        this.state.storage.put(currentLatest?.uuid, currentLatest)

        const newKey = new KeyState()
        await newKey.init()
        newKey.lastKey = currentLatest?.uuid;

        this.state.storage.put("latest", newKey);
        this.state.storage.put(newKey.uuid, newKey)

        return c.status(200);

    })

    this.app.get("/rotate", async (c) => {
        // create a new key version
        const currentLatest = await this.state.storage.get<KeyState>("latest")!;

        const newKey = new KeyState()
        await newKey.init()
        newKey.lastKey = currentLatest?.uuid;

        this.state.storage.put("latest", newKey);
        this.state.storage.put(newKey.uuid, newKey)

        return c.status(200);
    })

    this.app.post("/sign", async (c) => {
        // sign jwt
        const signingReq = await c.req.json<JWTSigningRequest>()
        const jwt = new JWT(signingReq.entity, signingReq.claims, "catalyst:coresvc:jwt")

        const jwtSigned = (await this.state.storage.get<KeyState>("latest"))!.sign(jwt)


        return c.json({
            token: jwtSigned
        }, 200)

    })
  }

  async fetch(request: Request) {
    return this.app.fetch(request)
  }
}