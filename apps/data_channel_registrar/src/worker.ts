import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import {
  DataChannel,
  Token,
  User,
  PermissionCheckResponse,
  DataChannelActionResponse,
  JWTParsingResponse,
} from '../../../packages/schema_zod';
import AuthzedWorker from '../../authx_authzed_api/src';
import JWTWorker from '../../authx_token_api/src';
import UserCredsCacheWorker from '../../user_credentials_cache/src';

export type Env = Record<string, string> & {
  DO: DurableObjectNamespace<Registrar>;
  AUTHZED: Service<AuthzedWorker>;
  AUTHX_TOKEN_API: Service<JWTWorker>;
  USERCACHE: Service<UserCredsCacheWorker>;
};

export default class RegistrarWorker extends WorkerEntrypoint<Env> {
  async fetch() {
    return new Response('hello from worker b');
  }

  async CUDPerms(token: Token) {
    if (!token.cfToken && token.catalystToken) {
      return PermissionCheckResponse.parse({
        success: false,
        error: 'catalyst tokens are not permitted to create, update, or delete channels',
      });
    }
    if (!token.cfToken) {
      return PermissionCheckResponse.parse({
        success: false,
        error: 'catalyst did not recieve a user token',
      });
    }

    const user: User | undefined = await this.env.USERCACHE.getUser(token.cfToken);
    const parsedUser = User.safeParse(user);
    if (!parsedUser.success) {
      return PermissionCheckResponse.parse({
        success: false,
        error: 'catalyst unable to validate user token',
      });
    }

    const canCreate = await this.env.AUTHZED.canCreateUpdateDeleteDataChannel(
      parsedUser.data.orgId,
      parsedUser.data.userId,
    );
    if (!canCreate) {
      console.log("cannot create: ", parsedUser.data.orgId, parsedUser.data.userId, canCreate);
      return PermissionCheckResponse.parse({
        success: false,
        error:
          'catalyst asserts user does not have permission to create, update, or delete data channels',
      });
    }

    return PermissionCheckResponse.parse({
      success: true,
    });
  }

  async RPerms(token: Token, dataChannelId: string, channel?: DataChannel) {
    if (token.cfToken) {
      const user: User | undefined = await this.env.USERCACHE.getUser(token.cfToken);
      const parsedUser = User.safeParse(user);
      if (!parsedUser.success) {
        return PermissionCheckResponse.parse({
          success: false,
          error: 'catalyst unable to validate user token',
        });
      }
      if (channel) {
        const isCreator = channel.creatorOrganization === parsedUser.data.orgId;
        const isEnabled = channel.accessSwitch;

        if (!isEnabled && !isCreator) {
          return PermissionCheckResponse.parse({
            success: false,
            error: 'catalyst asserts user does not have permission to read data channel',
          });
        }
      }
      const canRead = await this.env.AUTHZED.canReadFromDataChannel(
        dataChannelId,
        parsedUser.data.userId,
      );
      if (!canRead) {
        return PermissionCheckResponse.parse({
          success: false,
          error: 'catalyst asserts user does not have permission to read data channel',
        });
      }

      return PermissionCheckResponse.parse({
        success: true,
      });
    } else if (token.catalystToken) {
      // datachannels cant be read via catalyst if they are disabled
      if (channel && channel.accessSwitch === false) {
        return PermissionCheckResponse.parse({
          success: false,
          error: "catalyst cannot access disabled data channels",
        });
      }
      // validate JWT here
      const jwtEntity: JWTParsingResponse = await this.env.AUTHX_TOKEN_API.validateToken(
        token.catalystToken,
      );
      const parsedJWTEntity = JWTParsingResponse.safeParse(jwtEntity);
      if (!parsedJWTEntity.success) {
        return PermissionCheckResponse.parse({
          success: false,
          error: parsedJWTEntity.error,
        });
      }

      if (parsedJWTEntity.success && !parsedJWTEntity.data.valid) {
        return PermissionCheckResponse.parse({
          success: false,
          error: parsedJWTEntity.data.error,
        });
      }
      const userId = parsedJWTEntity.data.entity!.split('/')[1];
      // The user must have read access to the data channel and the token must have the data channel id in the claims
      const canRead =
        parsedJWTEntity.data.claims.includes(dataChannelId) &&
        (await this.env.AUTHZED.canReadFromDataChannel(dataChannelId, userId));

      if (!canRead) {
        return PermissionCheckResponse.parse({
          success: false,
          error: 'catalyst asserts user does not have permission to read data channel',
        });
      }

      return PermissionCheckResponse.parse({
        success: true,
      });
    }

    return PermissionCheckResponse.parse({
      success: false,
      error: 'catalyst did not recieve a token',
    });
  }

  async create(doNamespace: string, dataChannel: Omit<DataChannel, 'id'>, token: Token) {
    const checkResp = await this.CUDPerms(token);
    console.error('checkResp', checkResp);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }
    const doId = this.env.DO.idFromName(doNamespace);
    const stub = this.env.DO.get(doId);
    const create = await stub.create(dataChannel);
    await this.env.AUTHZED.addDataChannelToOrg(dataChannel.creatorOrganization, create.id);
    await this.env.AUTHZED.addOrgToDataChannel(create.id, dataChannel.creatorOrganization);
    return DataChannelActionResponse.parse({
      success: true,
      data: create,
    });
  }

  async update(doNamespace: string, dataChannel: DataChannel, token: Token) {
    console.log('updating data channel', dataChannel);
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }
    console.log('user can update data channel');
    const doId = this.env.DO.idFromName(doNamespace);
    const stub = this.env.DO.get(doId);
    const update = await stub.update(dataChannel);
    console.log('updated data channel', update);
    return DataChannelActionResponse.parse({
      success: true,
      data: update,
    });
  }

  async read(doNamespace: string, dataChannelId: string, token: Token) {
    console.log('getting dc for user');
    const canRead = await this.RPerms(token, dataChannelId);
    if (!canRead.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: canRead.error,
      });
    }
    const doId = this.env.DO.idFromName(doNamespace);
    const stub = this.env.DO.get(doId);
    const channel = await stub.get(dataChannelId);
    console.log('found dc: ', channel);
    return DataChannelActionResponse.parse({
      success: true,
      data: channel,
    });
  }

  async list(doNamespace: string, token: Token) {
    const { DO } = this.env;
    const doId = DO.idFromName(doNamespace);
    const stub = DO.get(doId);
    const list = await stub.list();

    const listWithPerms = (
      await Promise.all(
        list.map(async dc => {
          return { canRead: await this.RPerms(token, dc.id, dc), dataChannel: dc };
        }),
      )
    )
      .filter(({ canRead }) => {
        return canRead.success;
      })
      .map(({ dataChannel }) => {
        return dataChannel;
      });
    return DataChannelActionResponse.parse({
      success: true,
      data: listWithPerms,
    });
  }

  async remove(doNamespace: string, dataChannelID: string, token: Token) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }
    const doId = this.env.DO.idFromName(doNamespace);
    const stub = this.env.DO.get(doId);
    const d = await stub.delete(dataChannelID);
    if (!d) {
      return DataChannelActionResponse.parse({
        success: false,
        error: 'catalyst unable to delete data channel',
      });
    }
    return DataChannelActionResponse.parse({
      success: true,
      data: [],
    });
  }
}

export class Registrar extends DurableObject {
  async list(filterByAccessSwitch: boolean = false) {
    const allChannels = await this.ctx.storage.list<DataChannel>();
    // if filterByAccessSwitch is set we passthrough access switch, else return all
    return Array.from(allChannels.values()).filter(dc =>
      filterByAccessSwitch ? dc.accessSwitch : true,
    );
  }

  async get(id: string, filterByAccessSwitch: boolean = false) {
    const dc = await this.ctx.storage.get<DataChannel>(id);
    return !filterByAccessSwitch || dc?.accessSwitch ? dc : undefined;
    //TODO: implement claims
    // const {claims} = await c.req.json<{claims?: string[]}>()

    //TODO: implement claims
    // if (claims && dataChannel) {
    //     const filtered = claims.includes(dataChannel.id)
    //     return c.json(filtered,
    //         200)
    // } else {
    //     return c.json(`No data channel found: ${id}`, 500)
    // }
  }

  async create(dataChannel: Omit<DataChannel, 'id'>) {
    const newDC = Object.assign(dataChannel, { id: crypto.randomUUID() });
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put(newDC.id, newDC);
    });
    return newDC;
  }

  async update(dataChannel: DataChannel) {
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put(dataChannel.id, dataChannel);
    });
    return dataChannel;
  }

  async delete(id: string) {
    return this.ctx.storage.delete(id);
  }
}
