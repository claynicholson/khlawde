#!/bin/bash
cd /app
exec node dist/cli.js --token "$ANTHROPIC_API_KEY"
