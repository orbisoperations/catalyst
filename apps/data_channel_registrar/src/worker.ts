import {
  DataChannel,
  DataChannelActionResponse,
  JWTParsingResponse,
  JWTParsingResponseSchema,
  PermissionCheckResponse,
  Token,
  User,
  UserSchema,
} from '@catalyst/schemas';
import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { Env } from './env';

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

    // NEED TO MOCK THIS
    const user: User | undefined = await this.env.USERCACHE.getUser(token.cfToken);
    const parsedUser = UserSchema.safeParse(user);
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
      const parsedUser = UserSchema.safeParse(user);
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
      const parsedJWTEntity = JWTParsingResponseSchema.safeParse(jwtEntity);
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
      // Extract userId from entity (format: "org/email" or just "email")
      const entity = parsedJWTEntity.data.entity!;
      const userId = entity.includes('/') ? entity.split('/')[1] : entity;

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

  /**
   * Check if a channel name is unique within an organization
   * @param doNamespace - The Durable Object namespace to query
   * @param channelName - The channel name to check
   * @param organizationId - The organization ID to check within
   * @param excludeChannelId - Optional channel ID to exclude from the check (for updates)
   * @returns PermissionCheckResponse indicating if the name is unique
   */
  async checkChannelNameUniqueness(
    doNamespace: string,
    channelName: string,
    organizationId: string,
    excludeChannelId?: string,
  ) {
    try {
      const doId = this.env.DO.idFromName(doNamespace);
      const stub = this.env.DO.get(doId);
      const isUnique = await stub.checkNameUniqueness(
        channelName,
        organizationId,
        excludeChannelId,
      );

      if (!isUnique) {
        return PermissionCheckResponse.parse({
          success: false,
          error: `${channelName} already exists in your organization`,
        });
      }

      return PermissionCheckResponse.parse({
        success: true,
      });
    } catch (error) {
      console.error('Error checking channel name uniqueness:', error);
      return PermissionCheckResponse.parse({
        success: false,
        error: 'Failed to validate channel name uniqueness',
      });
    }
  }

  async create(doNamespace: string, dataChannel: Omit<DataChannel, 'id'>, token: Token) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }

    // Check for channel name uniqueness within the organization
    const nameCheck = await this.checkChannelNameUniqueness(
      doNamespace,
      dataChannel.name,
      dataChannel.creatorOrganization,
    );
    if (!nameCheck.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: nameCheck.error,
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

    // Check for channel name uniqueness within the organization (excluding current channel)
    const nameCheck = await this.checkChannelNameUniqueness(
      doNamespace,
      dataChannel.name,
      dataChannel.creatorOrganization,
      dataChannel.id,
    );
    if (!nameCheck.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: nameCheck.error,
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
    if (!channel) {
      return DataChannelActionResponse.parse({
        success: false,
        error: 'catalyst unable to find data channel',
      });
    }

    return DataChannelActionResponse.parse({
      success: true,
      data: channel,
    });
  }

  /**
   * List data channels filtered by user permissions
   * @param doNamespace - The Durable Object namespace to query (typically 'default')
   * @param token - User token for authentication and permission filtering
   * @returns DataChannelActionResponse with filtered list of channels user can access
   */
  async list(doNamespace: string, token: Token) {
    const { DO } = this.env;
    const doId = DO.idFromName(doNamespace);
    const stub: DurableObjectStub<Registrar> = DO.get(doId);
    const list: DataChannel[] = await stub.list();

    const listWithPerms = (
      await Promise.all(
        list.map(async (dc: DataChannel) => {
          return { canRead: await this.RPerms(token, dc.id, dc), dataChannel: dc };
        }),
      )
    )
      .filter(({ canRead }: { canRead: PermissionCheckResponse }) => {
        return canRead.success;
      })
      .map(({ dataChannel }: { dataChannel: DataChannel }) => {
        return dataChannel;
      });
    return DataChannelActionResponse.parse({
      success: true,
      data: listWithPerms,
    });
  }

  /**
   * List all channels without permission filtering - for system services only
   * Used by data-channel-certifier for scheduled validation
   * @param doNamespace - The Durable Object namespace to query (defaults to 'default')
   * @param filterByAccessSwitch - When true, return only channels with accessSwitch enabled
   * @returns Array of all DataChannels in the namespace, or null on error
   * @warning This method bypasses permission checks - only call from trusted system services
   */
  async listAll(
    doNamespace: string = 'default',
    filterByAccessSwitch: boolean = false,
  ): Promise<DataChannel[] | null> {
    try {
      const { DO } = this.env;
      const doId = DO.idFromName(doNamespace);
      const stub: DurableObjectStub<Registrar> = DO.get(doId);
      const allChannels: DataChannel[] = await stub.list(filterByAccessSwitch);

      // Return all channels without permission filtering
      // This method should only be called by trusted system services
      return allChannels;
    } catch (error) {
      console.error('[RegistrarWorker] Error listing all channels:', error);
      return null;
    }
  }

  /**
   * Check if a channel name is available within an organization
   * @param doNamespace - The Durable Object namespace to query
   * @param channelName - The channel name to check
   * @param organizationId - The organization ID to check within
   * @param token - User token for authentication
   * @param excludeChannelId - Optional channel ID to exclude from the check (for updates)
   * @returns DataChannelActionResponse indicating if the name is available
   */
  async checkNameAvailability(
    doNamespace: string,
    channelName: string,
    organizationId: string,
    token: Token,
    excludeChannelId?: string,
  ) {
    const checkResp = await this.CUDPerms(token);
    if (!checkResp.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: checkResp.error,
      });
    }

    const nameCheck = await this.checkChannelNameUniqueness(
      doNamespace,
      channelName,
      organizationId,
      excludeChannelId,
    );
    if (!nameCheck.success) {
      return DataChannelActionResponse.parse({
        success: false,
        error: nameCheck.error,
      });
    }

    return DataChannelActionResponse.parse({
      success: true,
      data: { available: true },
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

    try {
      // Step 1: Find all organizations that reference this channel
      const orgsWithChannel = await this.env.AUTHZED.listOrgsInDataChannel(dataChannelID);

      // Step 2 & 3: Clean up all bidirectional relationships
      for (const org of orgsWithChannel) {
        await Promise.all([
          this.env.AUTHZED.deleteDataChannelInOrg(org.object, dataChannelID),
          this.env.AUTHZED.deleteOrgInDataChannel(dataChannelID, org.object),
        ]);
      }

      // Step 4: Delete from storage
      const doId = this.env.DO.idFromName(doNamespace);
      const stub = this.env.DO.get(doId);
      const deleted = await stub.delete(dataChannelID);

      if (!deleted) {
        return DataChannelActionResponse.parse({
          success: false,
          error: 'catalyst unable to delete data channel from storage',
        });
      }

      return DataChannelActionResponse.parse({
        success: true,
        data: [],
      });
    } catch (error) {
      console.error('Error during data channel deletion:', error);
      return DataChannelActionResponse.parse({
        success: false,
        error: 'catalyst deletion process failed',
      });
    }
  }
}

export class Registrar extends DurableObject {
  /**
   * Extracts the name from a channel name that may be in the old format "org/name"
   * If the name contains a "/" it extracts the part after the slash, otherwise returns as-is
   * @param name - The channel name that may contain "creatorOrganization/name" format
   * @returns The extracted name part
   */
  private extractNameFromLegacyFormat(name: string): string {
    if (name.includes('/')) {
      const parts = name.split('/');
      return parts[parts.length - 1]; // Get the last part after the slash
    }
    return name;
  }

  /**
   * Performs lazy migration on a data channel if it has the old name format
   * Extracts just the name if it's in "creatorOrganization/name" format
   * @param dc - The data channel to potentially migrate
   * @returns true if migration was performed, false otherwise
   */
  private async migrateLegacyNameFormat(dc: DataChannel): Promise<boolean> {
    if (dc.name.includes('/')) {
      const extractedName = this.extractNameFromLegacyFormat(dc.name);
      dc.name = extractedName;
      // Persist the migrated channel back to storage
      await this.ctx.blockConcurrencyWhile(async () => {
        await this.ctx.storage.put(dc.id, dc);
      });
      return true;
    }
    return false;
  }

  /**
   * Checks if an endpoint URL is missing a protocol
   * @param endpoint - The endpoint URL to check
   * @returns true if endpoint needs migration (missing protocol), false otherwise
   */
  private needsEndpointMigration(endpoint: string): boolean {
    // If the endpoint has any protocol (contains ://), don't migrate
    // This includes http://, https://, ftp://, ws://, wss://, etc.
    if (endpoint.includes('://')) {
      return false;
    }
    // If the endpoint is protocol-relative (starts with //), don't migrate
    if (endpoint.startsWith('//')) {
      return false;
    }
    // Otherwise, it needs migration (no protocol at all)
    return true;
  }

  /**
   * Performs lazy migration on a data channel if it has an endpoint without HTTP/HTTPS protocol
   * Prepends https:// to the endpoint URL
   * @param dc - The data channel to potentially migrate
   * @returns true if migration was performed, false otherwise
   */
  private async migrateEndpoint(dc: DataChannel): Promise<boolean> {
    if (this.needsEndpointMigration(dc.endpoint)) {
      const oldEndpoint = dc.endpoint;
      dc.endpoint = `https://${dc.endpoint}`;
      console.log(`Migrated endpoint for channel ${dc.id}: ${oldEndpoint} → ${dc.endpoint}`);
      // Persist the migrated channel back to storage
      await this.ctx.blockConcurrencyWhile(async () => {
        await this.ctx.storage.put(dc.id, dc);
      });
      return true;
    }
    return false;
  }

  async list(filterByAccessSwitch: boolean = false): Promise<DataChannel[]> {
    const allChannels = await this.ctx.storage.list<DataChannel>();
    const channels = Array.from(allChannels.values());

    // Lazy migrate any channels with old name format or invalid endpoints
    for (const channel of channels) {
      await this.migrateLegacyNameFormat(channel);
      await this.migrateEndpoint(channel);
    }

    // if filterByAccessSwitch is set we passthrough access switch, else return all
    return channels.filter(dc => (filterByAccessSwitch ? dc.accessSwitch : true));
  }

  async get(id: string, filterByAccessSwitch: boolean = false) {
    const dc = await this.ctx.storage.get<DataChannel>(id);

    // Lazy migrate if needed
    if (dc) {
      await this.migrateLegacyNameFormat(dc);
      await this.migrateEndpoint(dc);
    }

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

  /**
   * Check if a channel name is unique within an organization
   * Handles both old format (org/name) and new format (name only) during migration
   * @param channelName - The channel name to check (case-insensitive)
   * @param organizationId - The organization ID to check within
   * @param excludeChannelId - Optional channel ID to exclude from the check (for updates)
   * @returns boolean indicating if the name is unique
   */
  async checkNameUniqueness(
    channelName: string,
    organizationId: string,
    excludeChannelId?: string,
  ): Promise<boolean> {
    const allChannels = await this.ctx.storage.list<DataChannel>();
    const normalizedName = channelName.toLowerCase().trim();

    for (const [id, channel] of allChannels.entries()) {
      // Skip the channel being updated
      if (excludeChannelId && id === excludeChannelId) {
        continue;
      }

      // Check if channel belongs to the same organization
      if (channel.creatorOrganization === organizationId) {
        // Extract the actual name, handling both old and new formats
        const actualChannelName = this.extractNameFromLegacyFormat(channel.name);
        const normalizedChannelName = actualChannelName.toLowerCase().trim();

        if (normalizedChannelName === normalizedName) {
          return false; // Name is not unique
        }
      }
    }

    return true; // Name is unique
  }
}
