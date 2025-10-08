import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { OrganizationMatchmakingDO } from '../../organization_matchmaking/src';
import { OrgInvite, OrgInviteStatus } from '@catalyst/schema_zod';
describe('organization matchmaking', () => {
    describe('basic interactions', () => {
        it('create an invitation', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-create');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const invite = await stub.send('org1', 'org2');
            expect(invite.success).toBeTruthy();
            if (invite.success) {
                const sendInviteParse = OrgInvite.safeParse(invite.data);
                expect(sendInviteParse.success).toBeTruthy();
                if (sendInviteParse.success) {
                    expect(sendInviteParse.data.sender).toBe('org1');
                    expect(sendInviteParse.data.receiver).toBe('org2');
                    expect(sendInviteParse.data.status).toBe(OrgInviteStatus.enum.pending);
                }
            }
        });
        it('list all invitations', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-list');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            await stub.send('org1', 'org2');
            const org1ListResp = await stub.list('org1');
            expect(org1ListResp.success).toBeTruthy();
            if (org1ListResp.success) {
                const org1ListParse = OrgInvite.array().safeParse(org1ListResp.data);
                expect(org1ListParse.success).toBeTruthy();
                if (org1ListParse.success) {
                    const org1List = org1ListParse.data;
                    expect(org1List).toHaveLength(1);
                }
            }
        });
        it('respond to invitation', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-respond');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const inviteResp = await stub.send('org1', 'org2');
            if (!inviteResp.success) {
                throw new Error('this should have been a success');
            }
            const invite = OrgInvite.parse(inviteResp.data);
            // org1 try to accept invite
            const failedResp = await stub.respond('org1', invite.id, OrgInviteStatus.enum.accepted);
            expect(failedResp.success).toBeFalsy();
            const acceptedResp = await stub.respond('org2', invite.id, OrgInviteStatus.enum.accepted);
            expect(acceptedResp.success).toBeTruthy();
            if (!acceptedResp.success) {
                throw new Error('this should be true');
            }
            const acceptedInvite = OrgInvite.parse(acceptedResp.data);
            expect(acceptedInvite.status).toBe(OrgInviteStatus.enum.accepted);

            const listAcceptedResp = await stub.list('org1');
            if (!listAcceptedResp.success) {
                throw new Error('this should be true');
            }

            const listInvites = OrgInvite.array().parse(listAcceptedResp.data);
            expect(listInvites).toHaveLength(1);
            expect(listInvites[0].status).toBe(OrgInviteStatus.enum.accepted);
        });
        it('decline an invitation - org 1', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-decline-1');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const inviteResp = await stub.send('org1', 'org2');
            if (!inviteResp.success) {
                throw new Error('this should be success');
            }
            const invite = OrgInvite.parse(inviteResp.data);
            const org1DeclineResp = await stub.respond('org1', invite.id, OrgInviteStatus.enum.declined);
            expect(org1DeclineResp.success).toBeTruthy();

            const org1ListResp = await stub.list('org1');
            const org2ListResp = await stub.list('org2');
            if (!org1ListResp.success || !org2ListResp.success) {
                throw new Error('these should be true');
            }

            expect(OrgInvite.array().parse(org1ListResp.data)).toHaveLength(0);
            expect(OrgInvite.array().parse(org2ListResp.data)).toHaveLength(0);
        });
        it('decline an invitation - org 2', async () => {
            const id = env.ORG_MATCHMAKING.idFromName('basic-decline-1');
            const stub = env.ORG_MATCHMAKING.get(id) as DurableObjectStub<OrganizationMatchmakingDO>;
            const inviteResp = await stub.send('org1', 'org2');
            if (!inviteResp.success) {
                throw new Error('this should be success');
            }
            const invite = OrgInvite.parse(inviteResp.data);
            const org2DeclineResp = await stub.respond('org2', invite.id, OrgInviteStatus.enum.declined);
            expect(org2DeclineResp.success).toBeTruthy();

            const org1ListResp = await stub.list('org1');
            const org2ListResp = await stub.list('org2');
            if (!org1ListResp.success || !org2ListResp.success) {
                throw new Error('these should be true');
            }

            expect(OrgInvite.array().parse(org1ListResp.data)).toHaveLength(0);
            expect(OrgInvite.array().parse(org2ListResp.data)).toHaveLength(0);
        });
    });
});
