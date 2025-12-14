#!/bin/bash
echo "Starting Pong server..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "Files in dist/server/:"
ls -la dist/server/ || echo "dist/server/ directory not found"
echo "Files in public/:"
ls -la public/ || echo "public/ directory not found"
echo "Starting server..."
node dist/server/server.js