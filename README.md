# MCP Code Mode - Claude Agent Template

A minimal, production-ready template for building Claude agents using the Anthropic Agent SDK with ESM and TypeScript.

## Prerequisites

- Node.js ≥18
- Claude global user settings configured

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Verify global settings**
   - Template uses `settingSources: ['user']` to access your existing Claude configuration
   - No API key setup required - uses your global credentials

## Usage

- **Development**: `npm run dev` - Runs agent with TypeScript
- **Production**: `npm run build && npm start` - Builds and runs compiled JS
- **Test**: `npm test` - Runs smoke test

## Security

This template starts with `allowedTools: []` for security. Enable tools only after review.

## Features

- ✅ ESM modules only
- ✅ TypeScript with modern config
- ✅ Streaming agent responses
- ✅ Uses global Claude settings (no hardcoded secrets)
- ✅ Production-ready build pipeline
- ✅ Zero-config credential management