#!/usr/bin/env bash

npx concurrently "pnpm dev" "(sleep 5; pnpm test)"