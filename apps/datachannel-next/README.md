# datachannel-next

## Next.JS + Socket.io

# Development
```shell
# If you are in the root, change your current directory to the pnpm workspace relative to this README
cd apps/datachannel-next

# --ignore-workspace will produce the ./pnpm-lock.yaml required by the builder stage in Dockerfile
pnpm install --ignore-workspace

# Start a realtime backend development server (executes `bun run.ts in the container`)
pnpm run dev 
```

# Deployment
```shell
# Login to fly.io (only need to do the first time)
fly auth login

# Run from this directory (same as fly.toml)
fly deploy
```