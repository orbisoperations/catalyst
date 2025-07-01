# Authzed API Documentation

## Overview

This API implementation provides a comprehensive interface for managing permissions and relationships in a multi-tenant system using Authzed as the authorization service. The system handles organizations, users, data channels, and their various relationships and permissions.

## Core Components

### AuthzedClient Class

The main client class that provides high-level methods for interacting with the Authzed service.

#### Organization Management

- `addUserToOrganization(org: string, user: string)`: Adds a user to an organization
- `removeUserRoleFromOrganization(org: string, user: string, role: Catalyst.RoleEnum)`: Removes a user's role from an organization
- `addDataCustodianToOrganization(org: string, user: string)`: Adds a data custodian to an organization
- `addAdminToOrganization(org: string, user: string)`: Adds an admin to an organization
- `listUsersInOrganization(orgId: OrgId, args: { userId?: UserId, roles?: Catalyst.RoleEnum[] })`: Lists users in an organization with optional filtering

#### Data Channel Management

- `addDataChannelToOrganization(orgId: OrgId, dataChannelId: DataChannelId)`: Associates a data channel with an organization
- `listDataChannelsInOrganization(orgId: OrgId, dataChannelId?: DataChannelId)`: Lists data channels in an organization
- `deleteDataChannelInOrganization(orgId: OrgId, dataChannelId: DataChannelId)`: Removes a data channel from an organization

#### Partner Organization Management

- `addPartnerToOrganization(orgId: OrgId, partnerId: OrgId)`: Adds a partner organization
- `listPartnersInOrganization(orgId: OrgId, partnerId?: OrgId)`: Lists partner organizations
- `deletePartnerInOrganization(orgId: OrgId, partnerId: OrgId)`: Removes a partner organization

#### Permission Checks

- `organizationPermissionsCheck(orgId: OrgId, userId: UserId, permission: Catalyst.Org.PermissionsEnum)`: Checks if a user has specific permissions in an organization
- `dataChannelPermissionsCheck(dataChannelId: DataChannelId, userId: UserId, permission: Catalyst.DataChannel.PermissionsEnum)`: Checks if a user has specific permissions for a data channel

### AuthzedUtils Class

A utility class that handles low-level interactions with the Authzed API.

#### Core Utilities

- `fetcher(action: 'read' | 'write' | 'delete', data: SearchInfoBody | WriteBody | DeleteBody)`: Handles API requests
- `permissionFetcher(data: PermissionCheckRequest)`: Handles permission check requests
- `writeRelationship(relationshipInfo: Authzed.Relationships.Relationship)`: Creates relationship write requests
- `readRelationship(searchInfo: Authzed.Relationships.SearchInfo)`: Creates relationship read requests
- `deleteRelationship(relationshipInfo: Authzed.Relationships.Relationship)`: Creates relationship delete requests

## Data Flow

1. **Authentication & Setup**

   - The system is initialized with Authzed endpoint, token, and optional schema prefix
   - All requests are authenticated using the provided token

2. **Relationship Management**

   - Relationships between entities (organizations, users, data channels) are managed through write/delete operations
   - Each relationship is defined with a specific relation type (e.g., user, admin, data_custodian)
   - Relationships can be queried using read operations

3. **Permission Checking**

   - Permissions are checked using the Authzed permission system
   - Both organization-level and data channel-level permissions are supported
   - Permission checks can be performed for specific actions or roles

4. **Data Organization**
   - Organizations are the top-level entities
   - Users can have different roles within organizations
   - Data channels can be associated with organizations
   - Organizations can have partner relationships with other organizations

## Types and Interfaces

### Key Types

- `SearchInfoBody`: Defines the structure for relationship search requests
- `LookupBody`: Defines the structure for permission lookup requests
- `PermissionCheckRequest`: Defines the structure for permission check requests

## Error Handling

The API includes proper error handling for:

- Invalid relationships
- Permission check failures
- API communication errors
- Invalid input parameters

## Usage Example

```typescript
const client = new AuthzedClient(endpoint, token, schemaPrefix);

// Add a user to an organization
await client.addUserToOrganization(orgId, userId);

// Check if a user has admin permissions
const hasAdminAccess = await client.organizationPermissionsCheck(orgId, userId, Catalyst.Org.PermissionsEnum.enum.admin);

// List all data channels in an organization
const dataChannels = await client.listDataChannelsInOrganization(orgId);
```
