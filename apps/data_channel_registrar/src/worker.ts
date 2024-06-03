import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import {
  DataChannel,
  Token,
  User,
  PermissionCheckResponse,
  DataChannelActionResponse,
  JWTParsingResponse,
  DataChannelSchemaFilter,
  zDataChannelSchemaFilter,
} from '../../../packages/schema_zod';
import AuthzedWorker from '../../authx_authzed_api/src';
import JWTWorker from '../../authx_token_api/src';
import UserCredsCacheWorker from '../../user_credentials_cache/src';

export type Env = Record<string, string> & {
  DATA_CHANNEL_REGISTRAR_DO: DurableObjectNamespace<Registrar>;
  DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO: DurableObjectNamespace<RegistrarSchemaFilters>;
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
          error: 'catalyst cannot access disabled data channels',
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
      error: 'catalyst did not receive a token',
    });
  }

  async create(doNamespace: string, dataChannel: Omit<DataChannel, 'id'>, token: Token) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }
    const doId = this.env.DATA_CHANNEL_REGISTRAR_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_DO.get(doId);
    const create = await stub.create(dataChannel);
    await this.env.AUTHZED.addDataChannelToOrg(dataChannel.creatorOrganization, create.id);
    await this.env.AUTHZED.addOrgToDataChannel(create.id, dataChannel.creatorOrganization);
    return DataChannelActionResponse.parse({
      success: true,
      data: create,
    });
  }

  async update(doNamespace: string, dataChannel: DataChannel, token: Token) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }

    const doId = this.env.DATA_CHANNEL_REGISTRAR_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_DO.get(doId);
    const update = await stub.update(dataChannel);

    return DataChannelActionResponse.parse({
      success: true,
      data: update,
    });
  }

  async read(doNamespace: string, dataChannelId: string, token: Token) {
    const canRead = await this.RPerms(token, dataChannelId);
    if (!canRead.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: canRead.error,
      });
    }
    const doId = this.env.DATA_CHANNEL_REGISTRAR_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_DO.get(doId);
    const channel = await stub.get(dataChannelId);
    return DataChannelActionResponse.parse({
      success: true,
      data: channel,
    });
  }

  async list(doNamespace: string, token: Token) {
    const { DATA_CHANNEL_REGISTRAR_DO } = this.env;
    const doId = DATA_CHANNEL_REGISTRAR_DO.idFromName(doNamespace);
    const stub = DATA_CHANNEL_REGISTRAR_DO.get(doId);
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
    const doId = this.env.DATA_CHANNEL_REGISTRAR_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_DO.get(doId);
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
  async createChannelSchemaFilter(
    doNamespace: string,
    partnerId: string,
    filter: string[],
    token: Token,
  ) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }

    const doId = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.get(doId);
    const jwtEntity: JWTParsingResponse = await this.env.AUTHX_TOKEN_API.validateToken(
      token.catalystToken!,
    );
    const parsedJWTEntity = JWTParsingResponse.safeParse(jwtEntity);
    if (!parsedJWTEntity.success) {
      return PermissionCheckResponse.parse({
        success: false,
        error: parsedJWTEntity.error,
      });
    }
    const dataChannelId =
      parsedJWTEntity.data.claims.length === 1 ? parsedJWTEntity.data.claims[0] : '';

    if (!dataChannelId) {
      throw new Error('catalyst token must have exactly one claim for a single data channel');
    }
    const newDataChannelSchemaFilter = Object.assign(zDataChannelSchemaFilter, {
      id: crypto.randomUUID(),
      dataChannelId,
      partnerId,
      filter,
    });
    const createdDataChannelFilters = await stub.createSchemaFilter(newDataChannelSchemaFilter);
    return createdDataChannelFilters;
  }
  async getChannelSchemaFilters(doNamespace: string, partnerId: string, token: Token) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }

    const jwtEntity: JWTParsingResponse = await this.env.AUTHX_TOKEN_API.validateToken(
      token.catalystToken!,
    );
    const parsedJWTEntity = JWTParsingResponse.safeParse(jwtEntity);
    if (!parsedJWTEntity.success) {
      return PermissionCheckResponse.parse({
        success: false,
        error: parsedJWTEntity.error,
      });
    }
    const dataChannelId =
      parsedJWTEntity.data.claims.length === 1 ? parsedJWTEntity.data.claims[0] : '';
    if (!dataChannelId) {
      throw new Error('catalyst token must have exactly one claim for a single data channel');
    }
    const doId = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.get(doId);

    const channelFilters = await stub.getSchemaFilter(dataChannelId, partnerId);

    return channelFilters;
  }

  async updateDataChannelSchemaFilter(
    doNamespace: string,
    filter: DataChannelSchemaFilter,
    token: Token,
  ) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }
    const doId = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.get(doId);
    const updatedDataChannelSchemaFilter = stub.updateSchemaFilter(filter);
    return updatedDataChannelSchemaFilter;
  }

  async deleteDataChannelSchemaFilter(doNamespace: string, id: string, token: Token) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }
    const doId = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.idFromName(doNamespace);
    const stub = this.env.DATA_CHANNEL_REGISTRAR_SCHEMA_FILTERS_DO.get(doId);
    const deletedDataChannelSchemaFilter = stub.removeSchemaFilter(id);
    return deletedDataChannelSchemaFilter;
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

export class RegistrarSchemaFilters extends DurableObject {
  async createSchemaFilter(newDataChannelSchemaFilter: DataChannelSchemaFilter) {
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put(newDataChannelSchemaFilter.id, newDataChannelSchemaFilter);
    });
    return newDataChannelSchemaFilter;
  }

  async updateSchemaFilter(newDataChannelSchemaFilter: DataChannelSchemaFilter) {
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put(newDataChannelSchemaFilter.id, newDataChannelSchemaFilter);
    });
    return newDataChannelSchemaFilter;
  }

  async getSchemaFilter(dataChannelId: string, partnerId: string) {
    const allSchemaFilters = await this.ctx.storage.list<DataChannelSchemaFilter>();
    const schemaFiltersByPartnerByDataChannel = Array.from(allSchemaFilters.values()).filter(
      filter => {
        filter.dataChannelId === dataChannelId && filter.partnerId === partnerId;
      },
    );
    if (schemaFiltersByPartnerByDataChannel.length != 1) {
      throw new Error(
        'Number of schema filters for this partner data channel is, ' +
          schemaFiltersByPartnerByDataChannel.length +
          ', expected 1',
      );
    }
    return schemaFiltersByPartnerByDataChannel[0].filter;
  }

  async removeSchemaFilter(id: string) {
    return this.ctx.storage.delete(id);
  }
}
