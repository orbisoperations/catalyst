# Organization Matchmaking

A Cloudflare Workers-based service for managing partnerships between organizations in the Catalyst platform. This service provides invitation management, partnership tracking, and permission-based controls for organization-to-organization relationships.

## Purpose

The Organization Matchmaking service facilitates collaboration between organizations in the Catalyst ecosystem by offering:

- Partnership invitation system with request/accept/decline workflow
- Organization-to-organization connection management
- Persistent tracking of partnership status
- Ability to enable or disable existing partnerships

## Architecture

This service is built using:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless execution environment
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) - For persistent storage of invitations and partnerships
- TypeScript - For type-safe implementation

The application is structured around two main components:

1. `OrganizationMatchmakingWorker` - The entry point class that handles requests and permission verification
2. `OrganizationMatchmakingDO` - A Durable Object that provides persistent storage and invitation management

## Features

### Invitation Management

- **Send Invites**: Create partnership invitations between organizations
- **Accept Invites**: Approve incoming partnership requests
- **Decline Invites**: Reject partnership requests
- **List Invites**: View all incoming and outgoing invitations
- **Read Invites**: View details of specific invitations

### Partnership Management

- **Toggle Partnerships**: Enable or disable existing partnerships without removing them
- **Partnership Status**: Track the state of partnerships (pending, accepted, declined)
- **Custom Messages**: Include optional messages with partnership invitations

### Security

- **Permission-based Control**: Only authorized users can manage partnerships
- **Organization Isolation**: Organizations can only manage their own invitations

