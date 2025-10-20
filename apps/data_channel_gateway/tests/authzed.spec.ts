import { describe, expect, it } from 'vitest';
import { env, ProvidedEnv } from 'cloudflare:test';

import { Catalyst } from '@catalyst/schemas';

describe.sequential('authzed integration tests', () => {
    it.sequential('get schema', async () => {
        console.log(env);
        const schema = await env.AUTHX_AUTHZED_API.schema();
        expect(schema).toBeDefined();
    });

    describe.sequential('organization tests', () => {
        it.sequential('add user', async () => {
            const org = 'Org1';
            const userStatement = await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'TestUser');
            console.log(userStatement);
            expect(userStatement.entity).toBe(
                'orbisops_catalyst_dev/organization:Org1#user@orbisops_catalyst_dev/user:VGVzdFVzZXI='
            );
            expect(userStatement.writtenAt).toBeDefined();
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'TestUser');
        });
        it.sequential('add data custodian', async () => {
            const org = 'Org2';
            const userStatement = await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org, 'TestUser');
            console.log(userStatement);
            expect(userStatement.entity).toBe(
                'orbisops_catalyst_dev/organization:Org2#data_custodian@orbisops_catalyst_dev/user:VGVzdFVzZXI='
            );
            expect(userStatement.writtenAt).toBeDefined();
            await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, 'TestUser');
        });
        it.sequential('add admin', async () => {
            const org = 'Org3';
            const userStatement = await env.AUTHX_AUTHZED_API.addAdminToOrg(org, 'TestUser');
            console.log(userStatement);
            expect(userStatement.entity).toBe(
                'orbisops_catalyst_dev/organization:Org3#admin@orbisops_catalyst_dev/user:VGVzdFVzZXI='
            );
            expect(userStatement.writtenAt).toBeDefined();
            await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, 'TestUser');
        });
        it.sequential('read users, data custodians, and admins', async () => {
            const org = 'Org4';
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'TestUser');
            await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org, 'TestUser');
            await env.AUTHX_AUTHZED_API.addAdminToOrg(org, 'TestUser');
            const users = await env.AUTHX_AUTHZED_API.listUsersInOrg(org, 'TestUser');
            console.log(users);
            expect(users).toHaveLength(3);
            expect(users).toContainEqual({ object: org, relation: 'user', subject: 'TestUser' });
            expect(users).toContainEqual({ object: org, relation: 'data_custodian', subject: 'TestUser' });
            expect(users).toContainEqual({ object: org, relation: 'admin', subject: 'TestUser' });

            const data_custodians = await env.AUTHX_AUTHZED_API.listUsersInOrg(org, 'TestUser', [
                Catalyst.RoleEnum.enum.data_custodian,
            ]);
            expect(data_custodians).toHaveLength(1);

            const admins = await env.AUTHX_AUTHZED_API.listUsersInOrg(org, 'TestUser', [Catalyst.RoleEnum.enum.admin]);
            expect(admins).toHaveLength(1);

            const noUser = await env.AUTHX_AUTHZED_API.listUsersInOrg(org, 'notauser', [Catalyst.RoleEnum.enum.admin]);
            expect(noUser).toHaveLength(0);

            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'TestUser');
            await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, 'TestUser');
            await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, 'TestUser');
        });
        it.sequential('check membership', async () => {
            const org = 'Org5';
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'TestUser');
            const permsCheck = await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'TestUser');
            console.log(permsCheck);
            expect(permsCheck).toBeTruthy();

            expect(await env.AUTHX_AUTHZED_API.isMemberOfOrg(org, 'NotAUser')).toBeFalsy();
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'TestUser');
        });
        it.sequential('check add role', async () => {
            const org = 'Org6';
            // add a normal user
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'User');
            // add a normal admin
            await env.AUTHX_AUTHZED_API.addAdminToOrg(org, 'Admin');
            // add a data_custodian
            await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org, 'DataCustodian');

            expect(await env.AUTHX_AUTHZED_API.canAssignRolesInOrg(org, 'User')).toBeFalsy();
            expect(await env.AUTHX_AUTHZED_API.canAssignRolesInOrg(org, 'DataCustodian')).toBeFalsy();
            expect(await env.AUTHX_AUTHZED_API.canAssignRolesInOrg(org, 'Admin')).toBeTruthy();

            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'User');
            await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, 'DataCustodian');
            await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, 'Admin');
        });
        it.sequential('check CUD of data channel', async () => {
            const org = 'Org7';
            // add a normal user
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'User');
            // add a normal admin
            await env.AUTHX_AUTHZED_API.addAdminToOrg(org, 'Admin');
            // add a data_custodian
            await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org, 'DataCustodian');

            expect(await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(org, 'User')).toBeFalsy();
            expect(await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(org, 'DataCustodian')).toBeTruthy();
            expect(await env.AUTHX_AUTHZED_API.canCreateUpdateDeleteDataChannel(org, 'Admin')).toBeFalsy();
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'User');
            await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, 'DataCustodian');
            await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, 'Admin');
        });
        it.sequential('check R of data channel', async () => {
            const org = 'Org8';
            // add a normal user
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'User');
            // add a normal admin
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'Admin');
            // add a data_custodian
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'DataCustodian');

            expect(await env.AUTHX_AUTHZED_API.canReadDataChannel(org, 'User')).toBeTruthy();
            expect(await env.AUTHX_AUTHZED_API.canReadDataChannel(org, 'DataCustodian')).toBeTruthy();
            expect(await env.AUTHX_AUTHZED_API.canReadDataChannel(org, 'Admin')).toBeTruthy();
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'User');
            await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, 'DataCustodian');
            await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, 'Admin');
        });
        it.sequential('delete users, data custodians, and admins', async () => {
            const org = 'Org9';
            // add a normal user
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, 'User');
            // add a normal admin
            await env.AUTHX_AUTHZED_API.addAdminToOrg(org, 'Admin');
            // add a data_custodian
            await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org, 'DataCustodian');
            expect(await env.AUTHX_AUTHZED_API.listUsersInOrg(org)).toHaveLength(3);

            // Verify deleteUserFromOrg returns correct entity format
            const deleteUser = await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, 'User');
            expect(deleteUser).toBeTruthy();
            expect(deleteUser.entity).toBe(
                'orbisops_catalyst_dev/organization:Org9#user@orbisops_catalyst_dev/user:VXNlcg=='
            );
            expect(deleteUser.deletedAt).toBeDefined();

            const listUserDelete = await env.AUTHX_AUTHZED_API.listUsersInOrg(org);
            console.log(listUserDelete);
            expect(listUserDelete).toHaveLength(2);
            expect(listUserDelete).not.toContain({ object: org, relation: 'user', subject: 'User' });

            // Verify deleteDataCustodianFromOrg returns correct entity format
            const deleteDataCustodian = await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, 'DataCustodian');
            expect(deleteDataCustodian).toBeTruthy();
            expect(deleteDataCustodian.entity).toBe(
                'orbisops_catalyst_dev/organization:Org9#data_custodian@orbisops_catalyst_dev/user:RGF0YUN1c3RvZGlhbg=='
            );
            expect(deleteDataCustodian.deletedAt).toBeDefined();

            console.log(await env.AUTHX_AUTHZED_API.listUsersInOrg(org));
            expect(await env.AUTHX_AUTHZED_API.listUsersInOrg(org)).toHaveLength(1);

            // Verify deleteAdminFromOrg returns correct entity format
            const deleteAdmin = await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, 'Admin');
            expect(deleteAdmin).toBeTruthy();
            expect(deleteAdmin.entity).toBe(
                'orbisops_catalyst_dev/organization:Org9#admin@orbisops_catalyst_dev/user:QWRtaW4='
            );
            expect(deleteAdmin.deletedAt).toBeDefined();

            console.log(await env.AUTHX_AUTHZED_API.listUsersInOrg(org));
            expect(await env.AUTHX_AUTHZED_API.listUsersInOrg(org)).toHaveLength(0);
        });
        it.sequential('verify deleteUserFromOrg only removes user role, not other roles', async () => {
            const org = 'Org10';
            const userId = 'MultiRoleUser';

            // Add user with multiple roles
            await env.AUTHX_AUTHZED_API.addUserToOrg(org, userId);
            await env.AUTHX_AUTHZED_API.addDataCustodianToOrg(org, userId);
            await env.AUTHX_AUTHZED_API.addAdminToOrg(org, userId);

            // Verify user has all 3 roles
            const rolesBefore = await env.AUTHX_AUTHZED_API.listUsersInOrg(org, userId);
            expect(rolesBefore).toHaveLength(3);
            expect(rolesBefore).toContainEqual({ object: org, relation: 'user', subject: userId });
            expect(rolesBefore).toContainEqual({ object: org, relation: 'data_custodian', subject: userId });
            expect(rolesBefore).toContainEqual({ object: org, relation: 'admin', subject: userId });

            // Delete only the "user" role
            const deleteResult = await env.AUTHX_AUTHZED_API.deleteUserFromOrg(org, userId);
            expect(deleteResult.entity).toBe(
                `orbisops_catalyst_dev/organization:${org}#user@orbisops_catalyst_dev/user:TXVsdGlSb2xlVXNlcg==`
            );

            // Verify only "user" role was removed, other roles remain
            const rolesAfter = await env.AUTHX_AUTHZED_API.listUsersInOrg(org, userId);
            expect(rolesAfter).toHaveLength(2);
            expect(rolesAfter).not.toContainEqual({ object: org, relation: 'user', subject: userId });
            expect(rolesAfter).toContainEqual({ object: org, relation: 'data_custodian', subject: userId });
            expect(rolesAfter).toContainEqual({ object: org, relation: 'admin', subject: userId });

            // Clean up remaining roles
            await env.AUTHX_AUTHZED_API.deleteDataCustodianFromOrg(org, userId);
            await env.AUTHX_AUTHZED_API.deleteAdminFromOrg(org, userId);
        });
        it.sequential('add, list, and delete data channels', async () => {
            // Clean up any existing data channels first
            const existingChannels = await env.AUTHX_AUTHZED_API.listDataChannelsInOrg('Org1');
            for (const channel of existingChannels) {
                await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg('Org1', channel.subject);
            }

            const addResp = await env.AUTHX_AUTHZED_API.addDataChannelToOrg('Org1', 'DC1');
            expect(addResp).toBeDefined();
            console.log(addResp);

            const list = await env.AUTHX_AUTHZED_API.listDataChannelsInOrg('Org1');
            expect(list).toBeDefined();
            console.log(list);
            expect(list).toHaveLength(1);

            const deleteResp = await env.AUTHX_AUTHZED_API.deleteDataChannelInOrg('Org1', 'DC1');
            expect(deleteResp).toBeDefined();
            console.log(deleteResp);

            const listAfterDelete = await env.AUTHX_AUTHZED_API.listDataChannelsInOrg('Org1');
            expect(listAfterDelete).toBeDefined();
            expect(listAfterDelete).toHaveLength(0);
        });
        it.sequential('add, list, and delete partners', async () => {
            const resp = await env.AUTHX_AUTHZED_API.addPartnerToOrg('Org1', 'Org2');
            console.log(resp);
            expect(resp).toBeDefined();
            expect(resp.writtenAt!.token).toBeDefined();

            expect(await env.AUTHX_AUTHZED_API.listPartnersInOrg('Org1')).toHaveLength(1);

            const deleteResp = await env.AUTHX_AUTHZED_API.deletePartnerInOrg('Org1', 'Org2');
            expect(deleteResp).toBeDefined();

            expect(await env.AUTHX_AUTHZED_API.listPartnersInOrg('Org1')).toHaveLength(0);
        });
    });
    describe.sequential('data channel tests', () => {
        it.sequential('add organization', async () => {
            const resp = await env.AUTHX_AUTHZED_API.addOrgToDataChannel('DC1', 'Org1');
            console.log(resp);
            expect(resp).toBeDefined();

            expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel('DC1')).toHaveLength(1);

            const deleteResp = await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel('DC1', 'Org1');
            expect(deleteResp).toBeDefined();

            expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel('DC1')).toHaveLength(0);
        });
        it.sequential('check user in parent org can read', async () => {
            await env.AUTHX_AUTHZED_API.addOrgToDataChannel('DC1', 'Org1');
            await env.AUTHX_AUTHZED_API.addUserToOrg('Org1', 'User1');
            expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel('DC1')).toHaveLength(1);
            expect(await env.AUTHX_AUTHZED_API.listUsersInOrg('Org1', 'User1')).toHaveLength(1);

            const perms = await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User1');
            expect(perms).toBeDefined();
            expect(perms).toBeTruthy();

            await env.AUTHX_AUTHZED_API.deleteOrgInDataChannel('DC1', 'Org1');
            await env.AUTHX_AUTHZED_API.deleteUserFromOrg('Org1', 'User1');
            expect(await env.AUTHX_AUTHZED_API.listOrgsInDataChannel('DC1')).toHaveLength(0);
            expect(await env.AUTHX_AUTHZED_API.listUsersInOrg('Org1', 'User1'));
        });
    });

    const authzedSetup = async (env: ProvidedEnv) => {
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel('DC1', 'Org1');
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel('DC2', 'Org2');
        await env.AUTHX_AUTHZED_API.addUserToOrg('Org1', 'User1');
        await env.AUTHX_AUTHZED_API.addUserToOrg('Org2', 'User2');
    };

    const authzedTeardown = async (env: ProvidedEnv) => {
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel('DC1', 'Org1');
        await env.AUTHX_AUTHZED_API.addOrgToDataChannel('DC2', 'Org2');
        await env.AUTHX_AUTHZED_API.addUserToOrg('Org1', 'User1');
        await env.AUTHX_AUTHZED_API.addUserToOrg('Org2', 'User2');
    };
    describe.sequential('multi functional tests', () => {
        describe.sequential('share data channel between orgs', async () => {
            it.sequential('orgs can read own data channels', async () => {
                await authzedSetup(env);
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User1')).toBeTruthy();
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC2', 'User2')).toBeTruthy();
                await authzedTeardown(env);
            });
            it.sequential('cannot read other org data channel without share', async () => {
                await authzedSetup(env);
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User2')).toBeFalsy();
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC2', 'User1')).toBeFalsy();
                await authzedTeardown(env);
            });
            it.sequential('org1 shares with org2', async () => {
                await authzedSetup(env);
                await env.AUTHX_AUTHZED_API.addPartnerToOrg('Org1', 'Org2');
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User1')).toBeTruthy();
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC2', 'User1')).toBeFalsy();
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User2')).toBeTruthy();
                expect(await env.AUTHX_AUTHZED_API.deletePartnerInOrg('Org1', 'Org2')).toBeDefined();
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User2')).toBeFalsy();
                await authzedTeardown(env);
            });

            it.sequential('org 2 shares with org1', async () => {
                await authzedSetup(env);
                // this adds org1 as a partner to org2
                await env.AUTHX_AUTHZED_API.addPartnerToOrg('Org2', 'Org1');
                // since user 2 is in org 2 it can read dc2
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC2', 'User2')).toBeTruthy();
                // dc1 belongs to org1, so user2 cannot access because org1 is not a partner with org2
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC1', 'User2')).toBeFalsy();
                // dc2 belongs to org2, so user1 can access dc2 because the chain of permissions go
                // dc1:read -> org2:parnter -> org1:datachannel_read -> user1
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC2', 'User1')).toBeTruthy();

                expect(await env.AUTHX_AUTHZED_API.deletePartnerInOrg('Org2', 'Org1')).toBeDefined();
                expect(await env.AUTHX_AUTHZED_API.canReadFromDataChannel('DC2', 'User1')).toBeFalsy();
                await authzedTeardown(env);
            });
            // issue here with running after all it-tests
        });
    });
});
