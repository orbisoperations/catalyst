# datachannel-next

## Next.JS + Socket.io

```shell
# If you are in the root, change your current directory to the pnpm workspace relative to this README
cd apps/datachannel-next

# --ignore-workspace will produce the ./pnpm-lock.yaml required by the builder stage in Dockerfile
pnpm install --ignore-workspace

# Start a realtime backend development server (executes `bun run.ts in the container`)
pnpm run dev 
```