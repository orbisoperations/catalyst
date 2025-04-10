#!/bin/bash
set -euo pipefail

# === Fix broken macOS GUI PATHs (Finder launch, etc) ===
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"

# ======= Constants ========
SESSION_DURATION="24h"
DOMAIN="devintelops.io"
PATH="/"
DEFAULT_LOCAL_PORT=4000
TUNNEL_CONFIG_DIR="$HOME/.cloudflared"

# ======= Load Shell Profile for PATH Fix ========
if [ -f "$HOME/.zprofile" ]; then
  source "$HOME/.zprofile"
elif [ -f "$HOME/.bash_profile" ]; then
  source "$HOME/.bash_profile"
fi

# ======= Ensure Tools ========
if ! command -v brew >/dev/null; then
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  else
    echo "❌ Homebrew not found. Please install it: https://brew.sh"
    exit 1
  fi
fi

if ! command -v jq >/dev/null; then
  echo "🔧 Installing jq..."
  brew install jq
fi

if ! command -v cloudflared >/dev/null; then
  echo "🔧 Installing cloudflared..."
  brew install cloudflared
fi

# ======= Determine User Defaults ========
USER_NAME="${USER:-$(id -un 2>/dev/null || whoami 2>/dev/null || echo 'dev')}"
DEFAULT_APP_NAME="${USER_NAME}-app"
DEFAULT_SUBDOMAIN="${USER_NAME}-dev"
DEFAULT_TUNNEL_NAME="${USER_NAME}-tunnel"

# ======= Prompt User ========
read -p "📛 Application name [$DEFAULT_APP_NAME]: " APP_NAME
APP_NAME="${APP_NAME:-$DEFAULT_APP_NAME}"

read -p "🌐 Subdomain [$DEFAULT_SUBDOMAIN]: " SUBDOMAIN
SUBDOMAIN="${SUBDOMAIN:-$DEFAULT_SUBDOMAIN}"
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

read -p "🚇 Tunnel name [$DEFAULT_TUNNEL_NAME]: " TUNNEL_NAME
TUNNEL_NAME="${TUNNEL_NAME:-$DEFAULT_TUNNEL_NAME}"

read -p "📦 Local port the app runs on [$DEFAULT_LOCAL_PORT]: " LOCAL_PORT
LOCAL_PORT="${LOCAL_PORT:-$DEFAULT_LOCAL_PORT}"

echo -e "\n⚙️ Setting up: $APP_NAME ($FULL_DOMAIN) → localhost:$LOCAL_PORT"

# ======= Ensure cloudflared is authenticated ========
if [[ ! -f "$TUNNEL_CONFIG_DIR/cert.pem" ]]; then
  echo "🔐 No origin cert found. Launching cloudflared login..."
  cloudflared login
  echo "✅ Login complete. Continuing setup..."
fi

# ======= Create Access App (best effort) ========
echo "📦 Creating Access app..."
if ! APP_JSON=$(cloudflared access application create \
  --name "$APP_NAME" \
  --domain "$FULL_DOMAIN" \
  --session-duration "$SESSION_DURATION" \
  --path "$PATH" 2>/dev/null); then
  echo "⚠️ Access application may already exist. Continuing..."
else
  APP_ID=$(echo "$APP_JSON" | jq -r '.id')
  echo "✅ Created Access app with ID: $APP_ID"
fi

# ======= Create or Detect Tunnel ========
echo "🚇 Creating or retrieving tunnel ID for: $TUNNEL_NAME"
if ! TUNNEL_OUTPUT=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1); then
  echo "⚠️ Tunnel may already exist. Retrieving ID..."
  TUNNEL_ID=$(cloudflared tunnel list | /usr/bin/grep -w "$TUNNEL_NAME" | /usr/bin/awk '{print $1}')
else
  echo "$TUNNEL_OUTPUT"
  TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | /usr/bin/grep -oE '[a-f0-9\-]{36}' | head -n1)
fi

CREDENTIALS_FILE="${TUNNEL_CONFIG_DIR}/${TUNNEL_ID}.json"

# ======= Config File ========
CONFIG_FILE="${TUNNEL_CONFIG_DIR}/config.yml"
echo "📝 Writing config to $CONFIG_FILE"
/bin/cat > "$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDENTIALS_FILE

ingress:
  - hostname: $FULL_DOMAIN
    service: http://localhost:$LOCAL_PORT
  - service: http_status:404
EOF

# ======= DNS Routing ========
echo "🌐 Creating DNS route for https://$FULL_DOMAIN"
cloudflared tunnel route dns "$TUNNEL_NAME" "$FULL_DOMAIN" || echo "⚠️ DNS record may already exist. Skipping..."

# ======= Done ========
echo -e "\n🎉 Setup complete!"
echo "▶️ Start your local server on port $LOCAL_PORT"
echo "🚀 Then run: cloudflared tunnel run $TUNNEL_NAME"
echo "🌍 Your app will be available at: https://${FULL_DOMAIN}"
