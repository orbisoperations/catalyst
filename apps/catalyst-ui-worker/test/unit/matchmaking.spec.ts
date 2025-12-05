import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { OrganizationMatchmakingDO } from '../../organization_matchmaking/src';
import { OrgInviteSchema, OrgInviteStatusSchema } from '@catalyst/schemas';

describe('organization matchmaking', () => {
    describe('basic interactions', () => {
        it('create an invitation', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-create');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const invite = await stub.send('org1', 'org2');
            const sendInviteParse = OrgInviteSchema.safeParse(invite);
            expect(sendInviteParse.success).toBeTruthy();
            if (sendInviteParse.success) {
                expect(sendInviteParse.data.sender).toBe('org1');
                expect(sendInviteParse.data.receiver).toBe('org2');
                expect(sendInviteParse.data.status).toBe(OrgInviteStatusSchema.enum.pending);
            }
        });
        it('list all invitations', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-list');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            await stub.send('org1', 'org2');
            const org1List = await stub.list('org1');
            const org1ListParse = OrgInviteSchema.array().safeParse(org1List);
            expect(org1ListParse.success).toBeTruthy();
            if (org1ListParse.success) {
                expect(org1ListParse.data).toHaveLength(1);
            }
        });
        it('respond to invitation', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-respond');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const invite = await stub.send('org1', 'org2');
            const inviteParsed = OrgInviteSchema.parse(invite);
            // org1 try to accept invite - should throw error
            await expect(stub.respond('org1', inviteParsed.id, OrgInviteStatusSchema.enum.accepted)).rejects.toThrow();

            // org2 accepts invite - should succeed
            const acceptedInvite = await stub.respond('org2', inviteParsed.id, OrgInviteStatusSchema.enum.accepted);
            expect(acceptedInvite.status).toBe(OrgInviteStatusSchema.enum.accepted);

            const listInvites = await stub.list('org1');
            const listInvitesParsed = OrgInviteSchema.array().parse(listInvites);
            expect(listInvitesParsed).toHaveLength(1);
            expect(listInvitesParsed[0].status).toBe(OrgInviteStatusSchema.enum.accepted);
        });
        it('decline an invitation - org 1', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-decline-1');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const invite = await stub.send('org1', 'org2');
            const inviteParsed = OrgInviteSchema.parse(invite);
            const declinedInvite = await stub.respond('org1', inviteParsed.id, OrgInviteStatusSchema.enum.declined);
            expect(declinedInvite.status).toBe(OrgInviteStatusSchema.enum.declined);

            const org1List = await stub.list('org1');
            const org2List = await stub.list('org2');

            expect(OrgInviteSchema.array().parse(org1List)).toHaveLength(0);
            expect(OrgInviteSchema.array().parse(org2List)).toHaveLength(0);
        });
        it('decline an invitation - org 2', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-decline-2');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const invite = await stub.send('org1', 'org2');
            const inviteParsed = OrgInviteSchema.parse(invite);
            const declinedInvite = await stub.respond('org2', inviteParsed.id, OrgInviteStatusSchema.enum.declined);
            expect(declinedInvite.status).toBe(OrgInviteStatusSchema.enum.declined);

            const org1List = await stub.list('org1');
            const org2List = await stub.list('org2');

            expect(OrgInviteSchema.array().parse(org1List)).toHaveLength(0);
            expect(OrgInviteSchema.array().parse(org2List)).toHaveLength(0);
        });
    });
});
