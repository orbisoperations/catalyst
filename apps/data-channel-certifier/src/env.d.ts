interface Env {
  // Service bindings
  AUTHX_TOKEN_API: {
    signSystemJWT(params: {
      callingService: string;
      channelId?: string;
      channelIds?: string[];
      purpose: string;
      duration?: number;
    }): Promise<{ success: boolean; token?: string; expiration?: number; error?: string }>;
  };

  DATA_CHANNEL_REGISTRAR: {
    list(): Promise<Array<{
      id: string;
      name: string;
      endpoint: string;
      creatorOrganization: string;
      accessSwitch: boolean;
      description: string;
    }> | null>;

    updateAccessSwitch(
      channelId: string,
      enabled: boolean
    ): Promise<{ success: boolean; error?: string }>;
  };

  // Environment variables
  ENVIRONMENT?: string;
}
