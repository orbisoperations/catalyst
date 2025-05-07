#!/bin/bash
# Script to run Catalyst applications locally in dependency order.

# --- Cleanup after Ctrl+C ---
cleanup() {
  printf "\n\033[1;31m⚠️ Caught interrupt signal. Shutting down services...\033[0m\n"

  print_step " Terminating ${#pids[@]} services..." "${YELLOW}"
    for pid in "${pids[@]}"; do
      if kill "$pid" 2>/dev/null; then
        printf "  ${GREEN}✓ Terminated process ${YELLOW}(PID: ${pid})${RESET}\n"
      else
        printf "  ${RED}✗ Failed to terminate process ${YELLOW}(PID: ${pid})${RESET}\n"
      fi
    done
    print_success "All services terminated"

  # Stop the authzed container
  print_step "Stopping authzed container..." "${YELLOW}"
  if podman stop authzed-container &>/dev/null; then
    print_success "Authzed container stopped successfully"
  else
    print_warn "Failed to stop authzed container - it may not be running"
  fi

  print_box "🛑 Cleanup completed" "${RED}"

  exit 1
}

# Trap SIGINT (Ctrl+C) and error exit code
trap cleanup INT # callback

# Color definitions
BOLD="\033[1m"
RESET="\033[0m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"

# --- Helper functions ---
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

print_service_header() {
  local app_name="$1"
  local app_path="$2"
  local progress="$3"
  local DEV_COMMAND="$4"

  # Service header with styled border
  printf "\n${GREEN}"
  printf "╭%s╮\n" "$(printf "%68s" | tr ' ' '─')"
  printf "│ %-68s│\n" "                                                                    "
  printf "│ %-68s│\n" "                    STARTING $app_name"
  printf "│ %-68s│\n" "                                                                    "
  printf "╰%s╯\n" "$(printf "%68s" | tr ' ' '─')"
  printf "${RESET}"

  printf "${BOLD}  ${CYAN}$progress${RESET} App Path: ${YELLOW}%s${RESET}\n" "$app_path"
  printf "${BOLD}  ${CYAN}$progress${RESET} Command:  ${YELLOW}%s${RESET}\n" "$DEV_COMMAND"
  printf "  ${CYAN}%s${RESET}\n" "$(printf "%68s" | tr ' ' '─')"
}

# --- Main Execution ---

# --- Configuration ---
APPS_DIR="apps"
NO_UI=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-ui)
      NO_UI=true
      shift
      ;;
    *)
      print_error "Unknown option: $1"
      print_error "Usage: $0 [--no-ui]"
      exit 1
      ;;
  esac
done

# Define the startup order based on dependencies (Management -> Control -> Data -> UI/CLI)
APP_ORDER=(
  "authx_token_api"          # Management: Issues service tokens
  "user-credentials-cache"   # Management: Caches user identity
  "issued-jwt-registry"      # Management: Tracks issued tokens
  "authx_authzed_api"        # Control: Core authorization service
  "data_channel_registrar"   # Control: Manages data channel discovery
  "organization_matchmaking" # Control: Manages organization partnerships
  "data_channel_gateway"     # Data: Federates data channels
  # "datachannel-next"       # Data: Example data channel implementation
  # "catalyst_cli"           # Management: CLI tool (usually not run continuously in dev)
)

# Add UI worker if --no-ui flag is not set
if [ "$NO_UI" = false ]; then
  APP_ORDER+=("catalyst-ui-worker")  # Management: Web interface
fi

DEFAULT_DEV_COMMAND="pnpm run dev"
SLEEP_DURATION=2 # Seconds to wait between starting apps


printf "${BLUE}${BOLD}"
printf "════════════════════════════════════════════════════════════════\n"
printf "                                                               \n"
printf "                 🚀 CATALYST LOCAL DEV LAUNCHER                \n"
printf "                                                               \n"
printf "════════════════════════════════════════════════════════════════\n"
printf "${RESET}\n"

print_step "Initializing development environment..." "${CYAN}"
printf "${YELLOW}${BOLD}⚠️  Ensure 'pnpm install' has been run in all app directories${RESET}\n\n"

# Store PIDs of background processes
declare -a pids

# Get the absolute path to the apps directory
ABS_APPS_DIR="$(pwd)/$APPS_DIR"

# Initialize app count for progress tracking
total_apps="${#APP_ORDER[@]}"
current_app=0

for app_name in "${APP_ORDER[@]}"; do
  app_path="$ABS_APPS_DIR/$app_name"
  current_app=$((current_app + 1))

  # Progress indicator
  progress="[$current_app/$total_apps]"

  if [ -d "$app_path" ]; then
    cd "$app_path" || { print_error "Failed to cd into $app_path"; exit 1; }

    if [ -f "package.json" ]; then
      # Determine which dev command to use
      if [ "$app_name" = "catalyst-ui-worker" ]; then
        DEV_COMMAND="pnpm preview"
      else
        DEV_COMMAND="$DEFAULT_DEV_COMMAND"
      fi

      print_service_header "$app_name" "$app_path" "$progress" "$DEV_COMMAND"

      # Start the dev command in the background
      printf "  ${CYAN}⏳ Starting service...${RESET}"
      $DEV_COMMAND &
      process_pid="$!"
      pids+=($process_pid) # Store the PID of the background process
      sleep 0.5
      printf "\r  ${GREEN}✓ Started $app_name ${RESET}${YELLOW}(PID: ${process_pid})${RESET}\n"

      # Display a spinner animation while waiting for service initialization
      spinner="/-\|"
      # Calculate iterations based on sleep duration
      iterations=$(($SLEEP_DURATION * 10))
      for ((i=1; i<=iterations; i++)); do
        printf "\r  ${CYAN}⏳ Waiting for service initialization... %s${RESET}" "${spinner:i%4:1}"
        sleep 0.1
      done

      printf "\r  ${GREEN}✓ Service initialized                        ${RESET}\n"
    else
      print_warn "package.json not found in $app_path. Skipping."
    fi
    cd - > /dev/null # Go back to the previous directory (workspace root)
    printf "\n  ${CYAN}%s${RESET}\n" "$(printf "%68s" | tr ' ' '─')"
  else
    print_warn "Directory $app_path not found. Skipping."
    printf "  ${CYAN}%s${RESET}\n" "$(printf "%68s" | tr ' ' '─')"
  fi
done

print_header "Starting authzed container"
printf "  ${CYAN}⏳ Launching podman container...${RESET}\n"
pushd ./apps > /dev/null
  CONTAINER_NAME="authzed-container"
  # for development enabling grpc and http
  # 8443 is the default port for http
  # 50051 is the default port for grpc: use authzed/zed (see ReADME.md
  AUTHZED_OUTPUT=$(podman run --rm -v ./authx_authzed_api/schema.zaml:/schema.zaml:ro \
      -p 50051:50051 \
      -p 8443:8443 --detach \
      --name $CONTAINER_NAME authzed/spicedb:latest \
      serve-testing --http-enabled --skip-release-check=true --log-level debug --load-configs ./schema.zaml 2>&1)
  podman_exit_code=$?

  # Check if the container started successfully
  if [[ "$AUTHZED_OUTPUT" == *"the container name \"$CONTAINER_NAME\" is already in use"* ]]; then
      print_success "Authzed container already running"
  elif [[ "$podman_exit_code" -ne 0 ]]; then
      print_error "Failed to start authzed container: $AUTHZED_OUTPUT"
  else
      print_success "Started authzed container successfully"
  fi
popd > /dev/null

# Final status
print_box "🎉 All services are now running" "${GREEN}"

printf "\n${CYAN}${BOLD}STATUS INFORMATION${RESET}\n"
printf "${CYAN}%s${RESET}\n" "$(printf "%70s" | tr ' ' '─')"
printf "${BOLD}• Logs:${RESET} Service logs will be interleaved in this terminal.\n"
printf "${BOLD}• PIDs:${RESET} ${YELLOW}${pids[*]}${RESET}\n\n"

printf "${CYAN}${BOLD}SHUTDOWN INSTRUCTIONS${RESET}\n"
printf "${CYAN}%s${RESET}\n" "$(printf "%70s" | tr ' ' '─')"
printf "${GREEN}1.${RESET} Press ${BOLD}Ctrl+C${RESET} in this terminal to stop all services.\n"
printf "${YELLOW}2.${RESET} If Ctrl+C fails, manually kill processes using PIDs:\n"
printf "   ${BOLD}kill ${pids[*]}${RESET}\n"
printf "${RED}3.${RESET} Or kill all Node.js development processes (use with caution):\n"
printf "   ${BOLD}pkill -f 'node .* dev'${RESET}\n"

printf "\n${MAGENTA}${BOLD}[LISTENING]${RESET} Press ${BOLD}Ctrl+C${RESET} to stop all services...\n"


# Wait for all background jobs to complete (they won't, unless they crash or are killed)
# The 'wait' command without arguments waits for all background jobs of the current shell.
wait
