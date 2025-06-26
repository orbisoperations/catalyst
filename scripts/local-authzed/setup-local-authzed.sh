#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
AUTHZED_HTTP_ENDPOINT="localhost:8449"
AUTHZED_GRPC_ENDPOINT="localhost:50051"
AUTHZED_TOKEN="atoken"
SCHEMA_FILE="./apps/authx_authzed_api/schema.zaml"
ORG_ID="localdevorg"
RESOURCE_TYPE="orbisops_catalyst_dev/organization"
USER_TYPE="orbisops_catalyst_dev/user"
DATA_CUSTODIAN_REL="data_custodian"
MEMBER_REL="member"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the project root
if [[ ! -f "package.json" ]] || [[ ! -f "pnpm-workspace.yaml" ]]; then
    log_error "This script must be run from the project root directory!"
    echo "Current directory: $(pwd)"
    echo "Missing files: $(if [[ ! -f "package.json" ]]; then echo -n "package.json "; fi)$(if [[ ! -f "pnpm-workspace.yaml" ]]; then echo -n "pnpm-workspace.yaml"; fi)"
    echo "Please run: cd /path/to/catalyst && ./scripts/local-authzed/setup-local-authzed.sh"
    exit 1
fi

# 1. Ensure containers are running with health checks
log_info "🔄 Ensuring Authzed/SpiceDB containers are running..."

# Check if containers exist and are running
if podman ps --filter "name=authzed-container" --format "{{.Names}}" | grep -q "authzed-container"; then
    log_info "Containers exist, checking if they're running..."
    if podman ps --filter "name=authzed-container" --format "{{.Status}}" | grep -q "Up"; then
        log_success "Containers are already running"
    else
        log_warn "Containers are stopped, starting them..."
        podman compose -f scripts/local-authzed/docker-compose.authzed.yml up -d
    fi
else
    log_info "Starting fresh containers..."
    podman compose -f scripts/local-authzed/docker-compose.authzed.yml up -d
fi

# Wait for containers to be ready
log_info "⏳ Waiting for Authzed to be ready..."
set +e  # Disable exit on error for health check
for i in {1..30}; do
    zed schema read --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure --json >/dev/null 2>&1 && {
        log_success "Authzed is ready!";
        break;
    }
    SCHEMA_READ_OUTPUT=$(zed schema read --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure --json 2>&1)
    ERROR_MSG=$(echo "$SCHEMA_READ_OUTPUT" | jq -r .error 2>/dev/null || true)
    if echo "$ERROR_MSG" | grep -q 'No schema has been defined'; then
        log_success "Authzed is up (no schema yet, as expected)";
        break;
    fi
    log_info "Attempt $i/30..."
    sleep 2
    if [[ $i -eq 30 ]]; then
        log_error "Authzed failed to start within 60 seconds"
        exit 1
    fi
done
set -e  # Re-enable exit on error

# 2. Load schema
log_info " Loading schema..."
if [[ ! -f "$SCHEMA_FILE" ]]; then
    log_error "Schema file not found: $SCHEMA_FILE"
    exit 1
fi

TMP_SCHEMA_FILE=$(mktemp)
trap 'rm -f "$TMP_SCHEMA_FILE"' EXIT

if grep -q "^schema: |-" "$SCHEMA_FILE"; then
    # Extract content after "schema: |-" and remove leading indentation
    sed '1d' "$SCHEMA_FILE" | sed 's/^    //' > "$TMP_SCHEMA_FILE"
else
    cat "$SCHEMA_FILE" > "$TMP_SCHEMA_FILE"
fi

zed schema write --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure "$TMP_SCHEMA_FILE"
log_success "Schema loaded successfully"

# Wait for schema to be available
log_info "⏳ Waiting for schema to be available..."
for i in {1..20}; do
    SCHEMA_CHECK=$(zed schema read --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure --json 2>/dev/null || echo "")
    if [[ -n "$SCHEMA_CHECK" ]]; then
        log_success "Schema is available!"
        break
    fi
    log_info "Schema check attempt $i/20..."
    sleep 1
    if [[ $i -eq 20 ]]; then
        log_error "Schema not available after 20 attempts"
        exit 1
    fi
done

# 3. Check for existing data_custodian user
log_info "🔍 Checking for existing user with data_custodian permissions..."
EXISTING_USER_ID=$(zed relationship read \
    --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure \
    "$RESOURCE_TYPE:$ORG_ID" "$DATA_CUSTODIAN_REL" --json 2>/dev/null \
    | jq -r '.relationship.subject.object.objectId' 2>/dev/null || echo "")

if [[ -n "$EXISTING_USER_ID" && "$EXISTING_USER_ID" != "null" && "$EXISTING_USER_ID" != "" ]]; then
    EMAIL=$(echo "$EXISTING_USER_ID" | base64 --decode)
    log_success "Found existing user: $EMAIL"
else
    # 4. Prompt for email and create user/relationships
    read -rp "Enter your OrbisOps email address: " EMAIL
    if [[ -z "$EMAIL" || "$EMAIL" != *@* ]]; then
        log_error "Invalid email address."
        exit 1
    fi
    USER_ID_B64=$(echo -n "$EMAIL" | base64)
    log_info "➕ Creating user and assigning data_custodian and user roles..."
    
    zed relationship create \
        --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure \
        "$RESOURCE_TYPE:$ORG_ID" "$DATA_CUSTODIAN_REL" "$USER_TYPE:$USER_ID_B64"
    
    zed relationship create \
        --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure \
        "$RESOURCE_TYPE:$ORG_ID" "user" "$USER_TYPE:$USER_ID_B64"
    
    log_success "User roles created successfully"
fi

# 5. Verify permissions
log_info "🔑 Verifying user permissions..."
USER_ID_B64=$(echo -n "$EMAIL" | base64)
log_info "Checking permissions for user ID (base64): $USER_ID_B64"

# Retry permission check with delays
for attempt in {1..10}; do
    log_info "Permission check command: zed permission check --endpoint \"$AUTHZED_GRPC_ENDPOINT\" --token \"$AUTHZED_TOKEN\" --insecure \"$RESOURCE_TYPE:$ORG_ID\" \"$MEMBER_REL\" \"$USER_TYPE:$USER_ID_B64\" --json"
    PERMISSION_RESULT=$(zed permission check \
        --endpoint "$AUTHZED_GRPC_ENDPOINT" --token "$AUTHZED_TOKEN" --insecure \
        "$RESOURCE_TYPE:$ORG_ID" "$MEMBER_REL" "$USER_TYPE:$USER_ID_B64" --json 2>&1)
    log_info "Permission check output: $PERMISSION_RESULT"
    PERMISSIONSHIP=$(echo "$PERMISSION_RESULT" | awk '/^{/{p=1} p' | jq -r .permissionship 2>/dev/null | tail -n1)
    
    if [[ "$PERMISSIONSHIP" == "PERMISSIONSHIP_HAS_PERMISSION" ]]; then
        log_success "User $EMAIL has the required permissions."
        break
    else
        if [[ $attempt -lt 10 ]]; then
            log_warn "Permission check failed on attempt $attempt, retrying in 2 seconds..."
            sleep 2
        else
            log_error "Failed to verify user permissions after 10 attempts."
            exit 1
        fi
    fi
done

log_success "🎉 Local Authzed setup complete!" 