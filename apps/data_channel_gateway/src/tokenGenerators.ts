import { Context } from 'hono';
import { Variables } from './types';

import { Env } from './env';

export async function generateSingleUseCatalystTokens(
    claims: string[],
    catalystToken: string,
    ctx: Context<{ Bindings: Env; Variables: Variables }>
): Promise<{ success: boolean; data: { endpoint: string; singleUseToken: string }[] }> {
    // for each data channel create a single use JWT
    const singleUseTokens: { endpoint: string; singleUseToken: string }[] = [];

    for (const dataChannelId of claims) {
        console.log(dataChannelId, 'dataChannelId');
        const singleUseToken = await ctx.env.AUTHX_TOKEN_API.signSingleUseJWT(
            dataChannelId,
            { catalystToken },
            'default'
        );
        console.log(singleUseToken, 'sTuses');
        if (!singleUseToken.success) {
            return {
                success: false,
                data: [],
            };
        }
        singleUseTokens.push({
            endpoint: dataChannelId,
            singleUseToken: singleUseToken.token,
        });
    }

    return {
        success: true,
        data: singleUseTokens,
    };
}
