# CATALYST

Catalyst is a federated data grid that facilitates sharing between organizations, teams, and products through the use of standard, open source, secure, and tested technology.

Catalyst was borne through the realization that many excellent data exchange platforms exist but they all require some level of onboarding into their platform. We wanted to build something that could achieve internet scale without having to be tied to a certain cloud provider, certain type of data storage, or any system where you lose custody of your data to make it "accessible".

## What is a Federated Data Grid

Federated Data Grid is our `fetch`. It is an opinionated collection of patterns to formalize data formats, data access, access control, and edge accessibility.

While `fetch` never took off, we are hoping that our design tenets do.

Our design tenets are:

- **Secure**: Built with security-first principles using zero trust architecture
- **Industry standard and open protocols**: Using proven technologies like GraphQL and JWT
- **Interoperability**: Works across systems, databases, and tech organizations
- **Open source**: Transparent and extensible
- **Internet scale**: Designed to run globally at the edge

To achieve this we use:

- **GraphQL** - A flexible, well understood, data schema and API pattern
- **GraphQL Stitching** - Create a single endpoint to access all data without having to move the data
- **Cloudflare Workers** - Code designed to be distributed running all over the world at once
- **Zanzibar-inspired RelBAC** - Real-time data sharing security model
- **Asymmetric JWTs** - Create secrets at the core and validate at the edge
- **Zero Trust Architecture** - Never trust, always verify approach to security at every level

## How Does the Federated Data Grid Work

Catalyst is a stack of tightly coupled technologies that can be deployed on any platform. Catalyst provides:

- Patterns for exposing local data sets and workloads to a (logically) central place
- Identity and access control patterns that are used across the platform
- Technology anyone can deploy

Catalyst works by having a (logically) central gateway and identity/access control stack that is operated by a trusted entity (the hub).

Organizations are enrolled by the Catalyst operator and once onboarded org admins have complete control of their org which includes provisioning new data channels and minting API keys.

With an API key, users can then enroll their own services to be able to access data channels within Catalyst.

When setting up a data channel, a data custodian runs through the connection setup, then the data channel can be enabled and shared with other organizations.

### User Roles and Organization Model

Catalyst is an organization-based platform with clear role definitions:

- **Users**: Can access data channels and create API keys
- **Data Custodians**: Can create/manage data channels and partnership sharing
- **Org Admins**: Can manage roles and invite users to the organization

### Authentication and Authorization Flow

Catalyst implements a zero trust approach to security, where identity verification and authorization happen for every access request:

1. **Authentication**: Users authenticate via Cloudflare Access
2. **User Validation**: User Credentials Cache verifies and caches user information
3. **Token Generation**: AuthX Token API creates and signs JWTs for API access
4. **Authorization**: AuthX AuthZed API verifies permissions for operations
5. **Token Validation**: Issued JWT Registry tracks and validates tokens

### Data Channel Access Flow

1. **Registration**: Data custodians register data channels with the Data Channel Registrar
2. **Discovery**: Data Channel Gateway queries the registrar for available channels
3. **Federation**: Gateway dynamically stitches together GraphQL schemas from channels
4. **Access**: Users query the Gateway, which routes requests to appropriate channels
5. **Permissions**: Access is controlled based on organization partnerships and user roles

### Organization Sharing

1. **Partnership Request**: One organization sends an invitation to another
2. **Partnership Acceptance**: The receiving organization accepts the invitation
3. **Data Channel Sharing**: Data custodians enable access to specific channels
4. **Access Control**: Users from partner organizations can access shared channels

## Security Considerations

Catalyst is built with security as a foundational principle:

- **Authentication**: JWT-based with asymmetric cryptography
- **Authorization**: Relationship-based access control (RelBAC)
- **Data Isolation**: Clear boundaries between organizations
- **Token Management**: Comprehensive token validation and revocation
- **Access Control**: Fine-grained permissions based on user roles
- **Transport Security**: All communication over HTTPS
- **Edge Security**: Validation at the edge through Cloudflare Workers

## Startup

To spin the app up, it's recommended to use the `run_local_dev.sh` script found in the root of the repository. This will loop through the various containers found in the apps directory and spin each one up via podman. The script can be run with the following flags:

- `--no-ui`: avoids running the client and instead run all of the backend services standalone.

## Learn More

For detailed information about each component, please refer to the individual READMEs in the respective directories.
