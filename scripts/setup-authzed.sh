#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# setup-authzed.sh
#
# Starts a local SpiceDB (Authzed) dev container.
# Called by turbo via the "setup:authzed" script in the root package.json.
# Detects Docker (preferred) or Podman, waits for the daemon, starts the
# container, and waits for the health endpoint.
# ---------------------------------------------------------------------------

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging helpers
log_info()    { echo -e "${BLUE}[info]${NC}  $1"; }
log_success() { echo -e "${GREEN}[ok]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[warn]${NC}  $1"; }
log_error()   { echo -e "${RED}[error]${NC} $1"; }

# Container / image settings (must match the existing one-liner)
CONTAINER_NAME="spicedb-dev"
IMAGE="authzed/spicedb:latest"
SCHEMA_MOUNT="./apps/authx_authzed_api/schema.zaml:/schema.zaml:ro"
HEALTH_URL="http://localhost:8449/healthz"

# Retry settings
DAEMON_RETRIES=15
DAEMON_SLEEP=2
HEALTH_RETRIES=30
HEALTH_SLEEP=1

# Verify we're running from the repo root (relative SCHEMA_MOUNT depends on it)
if [[ ! -f "package.json" ]] || [[ ! -f "pnpm-workspace.yaml" ]]; then
    log_error "This script must be run from the repository root directory"
    exit 1
fi

# ---------------------------------------------------------------------------
# detect_runtime – sets RUNTIME to "docker" or "podman", or exits 1
# ---------------------------------------------------------------------------
detect_runtime() {
    # --- Try Docker first ---------------------------------------------------
    if command -v docker &>/dev/null; then
        if docker version &>/dev/null; then
            RUNTIME="docker"
            log_success "Docker daemon is running"
            return 0
        fi

        log_warn "Docker binary found but daemon is not responding -- attempting to start"

        case "$(uname)" in
            Darwin)
                open -a Docker 2>/dev/null || true
                ;;
            Linux)
                systemctl start docker 2>/dev/null || systemctl --user start docker 2>/dev/null || true
                ;;
        esac

        for ((i = 1; i <= DAEMON_RETRIES; i++)); do
            if docker version &>/dev/null; then
                RUNTIME="docker"
                log_success "Docker daemon is running (after start, attempt $i)"
                return 0
            fi
            log_info "Waiting for Docker daemon... (attempt $i/$DAEMON_RETRIES)"
            sleep "$DAEMON_SLEEP"
        done

        log_warn "Docker daemon did not respond after $DAEMON_RETRIES attempts"
    fi

    # --- Try Podman as fallback ---------------------------------------------
    if command -v podman &>/dev/null; then
        if podman version &>/dev/null; then
            RUNTIME="podman"
            log_success "Podman is running"
            return 0
        fi

        log_warn "Podman binary found but not responding -- attempting to start machine"
        podman machine start 2>/dev/null || true

        for ((i = 1; i <= DAEMON_RETRIES; i++)); do
            if podman version &>/dev/null; then
                RUNTIME="podman"
                log_success "Podman is running (after start, attempt $i)"
                return 0
            fi
            log_info "Waiting for Podman... (attempt $i/$DAEMON_RETRIES)"
            sleep "$DAEMON_SLEEP"
        done

        log_warn "Podman did not respond after $DAEMON_RETRIES attempts"
    fi

    # --- Neither works ------------------------------------------------------
    log_error "No working container runtime found!"
    echo ""
    echo "  Install Docker:  https://docs.docker.com/get-docker/"
    echo "  Install Podman:  https://podman.io/getting-started/installation"
    echo ""
    exit 1
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

# 1. Detect container runtime
detect_runtime
log_info "Using container runtime: $RUNTIME"

# 2. Ensure .dev.vars exists
DEV_VARS="apps/authx_authzed_api/.dev.vars"
DEV_VARS_EXAMPLE="apps/authx_authzed_api/.dev.vars.example"

if [[ ! -f "$DEV_VARS" ]]; then
    if [[ -f "$DEV_VARS_EXAMPLE" ]]; then
        log_warn "Creating $DEV_VARS from $DEV_VARS_EXAMPLE -- please review!"
        cp "$DEV_VARS_EXAMPLE" "$DEV_VARS"
    else
        log_warn "$DEV_VARS does not exist and no .dev.vars.example found -- skipping"
    fi
fi

# 3. Skip if SpiceDB is already healthy
if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    log_success "SpiceDB is already running and healthy"
    exit 0
fi

# 4. Start SpiceDB container
log_info "Starting $CONTAINER_NAME container..."

# Remove any previous container (ignore errors)
$RUNTIME stop "$CONTAINER_NAME"  2>/dev/null || true
$RUNTIME rm   "$CONTAINER_NAME"  2>/dev/null || true

$RUNTIME run -d \
    --name "$CONTAINER_NAME" \
    -v "$SCHEMA_MOUNT" \
    -p 8449:8443 \
    -p 50052:50051 \
    "$IMAGE" \
    serve-testing \
    --http-enabled \
    --skip-release-check=true \
    --load-configs /schema.zaml

# 5. Wait for health check
log_info "Waiting for SpiceDB to become healthy..."

for ((i = 1; i <= HEALTH_RETRIES; i++)); do
    if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
        log_success "SpiceDB is healthy"
        exit 0
    fi
    log_info "Health check attempt $i/$HEALTH_RETRIES..."
    sleep "$HEALTH_SLEEP"
done

log_error "SpiceDB did not become healthy after $HEALTH_RETRIES seconds"
log_error "Check container logs: $RUNTIME logs $CONTAINER_NAME"
exit 1
