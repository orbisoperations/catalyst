#!/bin/bash

# Script to run Catalyst applications locally in dependency order.

# --- Configuration ---
APPS_DIR="apps"
# Define the startup order based on dependencies (Management -> Control -> Data -> UI/CLI)
APP_ORDER=(
  "authx_token_api"          # Management: Issues service tokens
  "user_credentials_cache"   # Management: Caches user identity
  "issued-jwt-registry"      # Management: Tracks issued tokens
  "authx_authzed_api"        # Control: Core authorization service
  "data_channel_registrar"   # Control: Manages data channel discovery
  "organization_matchmaking" # Control: Manages organization partnerships
  "data_channel_gateway"     # Data: Federates data channels
  # "datachannel-next"         # Data: Example data channel implementation
  "catalyst-ui-worker"       # Management: Web interface
  # "catalyst_cli"           # Management: CLI tool (usually not run continuously in dev)
)
DEFAULT_DEV_COMMAND="pnpm run dev"
SLEEP_DURATION=3 # Seconds to wait between starting apps

# --- Functions ---
cleanup() {
  echo "Caught interrupt signal. Attempting to kill background jobs..."
  # Kill all processes in the current process group (jobs started by this script)
  kill 0
  exit 1
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# --- Main Execution ---
echo "Starting Catalyst local development environment..."
echo "Ensure 'pnpm install' has been run in all app directories."
echo "----------------------------------------------------"

# Store PIDs of background processes
declare -a pids

# Get the absolute path to the apps directory
ABS_APPS_DIR="$(pwd)/$APPS_DIR"

for app_name in "${APP_ORDER[@]}"; do
  app_path="$ABS_APPS_DIR/$app_name"
  if [ -d "$app_path" ]; then
    echo "Starting $app_name..."
    cd "$app_path" || { echo "Failed to cd into $app_path"; exit 1; }

    if [ -f "package.json" ]; then
      # Determine which dev command to use
      if [ "$app_name" = "catalyst-ui" ]; then
        # DEV_COMMAND="pnpm dev --port 4000"
        DEV_COMMAND="pnpm preview"
      else
        DEV_COMMAND="$DEFAULT_DEV_COMMAND"
      fi

      # Start the dev command in the background
      $DEV_COMMAND &
      pids+=($!) # Store the PID of the background process
      echo "Started $app_name (PID: ${pids[-1]})"
      sleep $SLEEP_DURATION
    else
      echo "Warning: package.json not found in $app_path. Skipping."
    fi
    cd - > /dev/null # Go back to the previous directory (workspace root)
    echo "----------------------------------------------------"
  else
    echo "Warning: Directory $app_path not found. Skipping."
    echo "----------------------------------------------------"
  fi
done

echo "Starting authzed podman container..."
pushd ./apps
podman run --rm -v ./authx_authzed_api/schema.zaml:/schema.zaml:ro \
    -p 8443:8443 --detach \
    --name authzed-container authzed/spicedb:latest \
    serve-testing --http-enabled --skip-release-check=true --log-level debug --load-configs ./schema.zaml
echo "Started authzed podman container successfully"
popd

echo "All specified applications started in the background."
echo "Logs for each application will be interleaved in this terminal."
echo "PIDs: ${pids[*]}"
echo ""
echo "To stop all services:"
echo "1. Press Ctrl+C in this terminal (should trigger cleanup)."
echo "2. If Ctrl+C fails, manually kill the processes using their PIDs:"
echo "   kill ${pids[*]}"
echo "3. Or, try killing all Node.js development processes (use with caution):"
echo "   pkill -f 'node .* dev'"
echo ""
echo "Waiting for processes to exit (Press Ctrl+C to stop)..."

# Wait for all background jobs to complete (they won't, unless they crash or are killed)
# The 'wait' command without arguments waits for all background jobs of the current shell.
wait