# Catalyst UI Worker

The Catalyst UI Worker is a Next.js-based web application that serves as the management interface for the Catalyst federated data platform. It provides a user-friendly interface for managing data channels, organizations, partnerships, and user credentials within the Catalyst ecosystem.

## Overview

This application is built with:

- **Next.js 15.3.1** - React framework with server-side rendering
- **Chakra UI** - Component library for consistent UI design
- **Orbis UI** - Custom design system and component library
- **OpenNext.js for Cloudflare** - Deployment adapter for Cloudflare Workers
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework

## Architecture

The UI Worker integrates with multiple Catalyst services:

- **ISSUED_JWT_REGISTRY** - JWT token management
- **CATALYST_DATA_CHANNEL_REGISTRAR_API** - Data channel discovery and registration
- **AUTHX_TOKEN_API** - Authentication token services
- **AUTHX_AUTHZED_API** - Authorization and permissions
- **USER_CREDS_CACHE** - User credential caching
- **ORGANIZATION_MATCHMAKING** - Organization partnership management

## Features

- **Token Management** - Issue and manage JWT tokens
- **Data Channel Management** - Register, discover, and manage data channels
- **Organization Partnerships** - Manage partnerships between organizations
- **User Authentication** - Secure user authentication and authorization
- **Responsive Design** - Mobile-friendly interface using Chakra UI

## Development

### Prerequisites

- Node.js 18+ and pnpm
- Access to Catalyst backend services
- Cloudflare Workers environment (for deployment)

### Local Development

1. **Install dependencies:**

    ```bash
    pnpm install
    ```

2. **Start the development server:**

    ```bash
    pnpm dev
    ```

    The application will be available at [http://localhost:4000](http://localhost:4000)

3. **Using the full development environment:**

    For the complete Catalyst ecosystem, use the root-level development script:

    ```bash
    # From the root catalyst directory
    ./run_local_dev.sh
    ```

    This will start all Catalyst services in the correct dependency order, including the UI worker.

### Available Scripts

- `pnpm dev` - Start development server on port 4000
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm format` - Format code with Prettier
- `pnpm preview` - Build and preview with OpenNext.js for Cloudflare
- `pnpm upload` - Upload to Cloudflare Workers
- `pnpm cf-typegen` - Generate Cloudflare environment types

## Project Structure

```
apps/catalyst-ui-worker/
├── app/                    # Next.js app router pages
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   ├── channels/          # Data channel management pages
│   ├── graphql/           # GraphQL queries and mutations
│   ├── partners/          # Partnership management pages
│   ├── tokens/            # Token management pages
│   ├── types/             # TypeScript type definitions
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── components/            # Reusable React components
├── layouts/               # Layout components
├── public/                # Static assets
├── theme/                 # Chakra UI theme customization
├── utils/                 # Utility functions
└── tests/                 # Test files
```

## Deployment

The application is configured for deployment to Cloudflare Workers using Worker Builds. The preview environment(not to be confused with the local preview server that simulates the Cloudflare Workers runtime) will automatically be deployed when changes are merged to the main branch.

### Environments

- **Preview**: `preview.catalyst.devintelops.io`
- **Staging**: `staging.catalyst.devintelops.io`
- **UXR**: `uxr.catalyst.devintelops.io`
- **Production**: `catalyst.intelops.io`

## Configuration

### Environment Variables

The application uses Cloudflare Workers bindings for service communication. These are configured in `wrangler.jsonc`:

- Service bindings for backend APIs
- Custom domain routing
- Environment-specific configurations

### Type Generation

Generate Cloudflare environment types:

```bash
pnpm cf-typegen
```

## Integration with Catalyst Ecosystem

The UI Worker is part of the larger Catalyst federated data platform. It depends on and integrates with:

- **Management Layer**: Token API, User Cache, JWT Registry
- **Control Layer**: AuthZed API, Data Channel Registrar, Organization Matchmaking
- **Data Layer**: Data Channel Gateway

For the complete development experience, use the root-level development script which starts all services in the correct order.

## Troubleshooting

### Common Issues

1. **Port conflicts**: The UI worker runs on port 4000 by default
2. **Service dependencies**: Ensure backend services are running when testing integrations
3. **Build failures**: Check that all dependencies are installed with `pnpm install`

### Development Tips

- Use the preview command to test Cloudflare Workers compatibility locally
- Monitor the development console for GraphQL and API errors
- Use browser dev tools to inspect service worker behavior

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Chakra UI Documentation](https://chakra-ui.com/)
- [Orbis UI Storybook](https://ui.devintelops.io/)
- [OpenNext.js for Cloudflare](https://github.com/opennextjs/opennextjs-cloudflare)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
