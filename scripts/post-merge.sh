#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push-force
pnpm --filter db run seed-wallets
