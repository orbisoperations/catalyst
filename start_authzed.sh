#!/bin/bash
# Script to start the Authzed (SpiceDB) container for local development

BOLD="\033[1m"
RESET="\033[0m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"

print_box() {
  local text="$1"
  local color="${2:-$BLUE}"
  local width=70

  printf "${color}"
  printf "╭─%s╮\n" "$(printf "%${width}s" | tr ' ' '─')"
  printf "│ %-${width}s│\n" "$text"
  printf "╰─%s╯\n" "$(printf "%${width}s" | tr ' ' '─')"
  printf "${RESET}"
}

print_step() {
  local text="$1"
  local color="${2:-$CYAN}"
  printf "${color}• ${BOLD}%s${RESET}\n" "$text"
}

print_success() {
  printf "${GREEN}✓ %s${RESET}\n" "$1"
}

print_warn() {
  printf "${YELLOW}⚠️  %s${RESET}\n" "$1"
}

print_error() {
  printf "${RED}✗ %s${RESET}\n" "$1"
}

print_header() {
  local text="$1"
  local color="${2:-$MAGENTA}"
  local width=70

  printf "\n${color}"
  printf "╭%s╮\n" "$(printf "%${width}s" | tr ' ' '─')"
  printf "│ ${BOLD}%-${width}s${RESET}${color} │\n" "$text"
  printf "╰%s╯\n" "$(printf "%${width}s" | tr ' ' '─')"
  printf "${RESET}\n"
}

AUTHZED_RPC_PORT=50051
AUTHZED_HTTP_PORT=8449

print_header "Starting authzed container"
printf "  ${CYAN}⏳ Launching podman container...${RESET}\n"
pushd ./apps > /dev/null
  CONTAINER_NAME="authzed-container"
  AUTHZED_OUTPUT=$(podman run -v ./authx_authzed_api/schema.zaml:/schema.zaml:ro \
      -p $AUTHZED_RPC_PORT:50051 \
      -p $AUTHZED_HTTP_PORT:8443 --detach \
      --name $CONTAINER_NAME authzed/spicedb:latest \
      serve-testing --http-enabled --skip-release-check=true --log-level debug --load-configs ./schema.zaml 2>&1)
  podman_exit_code=$?

  if [[ "$AUTHZED_OUTPUT" == *"the container name \"$CONTAINER_NAME\" is already in use"* ]]; then
      print_success "Authzed container already running"
  elif [[ "$podman_exit_code" -ne 0 ]]; then
      print_error "Failed to start authzed container: $AUTHZED_OUTPUT"
      exit 1
  else
      print_success "Started authzed container successfully"
  fi
popd > /dev/null

print_box "🎉 Authzed container is running" "${GREEN}"