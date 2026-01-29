#!/bin/bash

# Kill all dev processes
# This script stops all Catalyst development servers

set -e

echo "🛑 Stopping all Catalyst dev services..."

# Kill all wrangler processes
echo "  → Killing wrangler processes..."
pkill -f "wrangler dev" 2>/dev/null || true
pkill -f "wrangler-dist/cli.js dev" 2>/dev/null || true

# Kill all Next.js dev processes
echo "  → Killing Next.js processes..."
pkill -f "next dev" 2>/dev/null || true

# Kill workerd processes (Cloudflare Workers runtime)
echo "  → Killing workerd processes..."
pkill -f "workerd serve" 2>/dev/null || true

# Kill any turbo processes
echo "  → Killing turbo processes..."
pkill -f "turbo run dev" 2>/dev/null || true

# Wait a moment for processes to die
sleep 1

# Verify all ports are free
echo ""
echo "📊 Checking port status..."
for port in 4000 4001 4002 4003 4004 4005 4006 4007 4008; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "  ⚠️  Port $port still in use (PID: $(lsof -ti:$port))"
        # Force kill if still running
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    else
        echo "  ✓ Port $port is free"
    fi
done

echo ""
echo "✅ All dev processes stopped!"
