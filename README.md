# Meme Aggregator

Lightweight Node.js + TypeScript service that aggregates "meme-coin" listings from multiple DEX sources, exposes a REST API and WebSocket updates, and provides Prometheus metrics. This repo contains CI, Docker, and deployment guidance.

Quick links
- Code: https://github.com/Thouseef8800/meme-aggregator
- Releases: https://github.com/Thouseef8800/meme-aggregator/releases

Getting started (local)

Prerequisites: Node 18+, npm, Docker (optional)

1. Install dependencies

```powershell
npm ci
```

2. Run tests

```powershell
npm test
```

3. Start locally (dev)

```powershell
npm run build
npm start
# or with docker-compose
docker-compose up --build
```

Endpoints
- GET /tokens — paginated token list
- GET /metrics — Prometheus metrics
- WebSocket: /ws — subscribe to real-time updates

Deployment
See `DEPLOY.md` for Render/Railway instructions and recommendations.

Contributing
See `CONTRIBUTING.md` for guidelines.
# Meme Aggregator (prototype)

This repository contains a prototype Real-time Data Aggregation Service for meme coins.

<!-- CI status badge: replace <owner> and <repo> with your GitHub values -->
[![CI](https://github.com/Thouseef8800/meme-aggregator/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/Thouseef8800/meme-aggregator/actions/workflows/nodejs-test.yml)

See `DELIVERY.md` for final packaging instructions and a short demo script to record the 1–2 minute video.

Deployed URL
------------
This project is deployed (demo) at:

- Deployed: https://meme-aggregator.onrender.com

Quick deploy (Render)
---------------------
1. Create a new Web Service on Render (free tier).
2. Connect your GitHub repo and choose the `master` branch (or the branch containing your PR).
3. Build command: `npm run build`
4. Start command: `npm start`
5. Set environment variables (optional): `CACHE_TTL_SECONDS`, `REDIS_URL`, `PORT`.

Once deployed, paste the URL above so the README shows the public endpoint for the demo.

Tech: Node.js + TypeScript + Fastify + Socket.io. Redis is optional (falls back to in-memory).

Quick start (local):

1. Install dependencies

```powershell
npm install
```

2. Run in dev mode

```powershell
npm run dev
```

3. Endpoints
- GET /tokens?limit=20&cursor=...&sort=volume_desc
- WebSocket: connect to server and emit `subscribe` (JSON {"action":"subscribe"}) to get initial snapshot. Listen for `tokens:update` events.

Configuration: see `.env.example`.

Recommended environment variables (Render):
- POLL_INTERVAL_SECONDS (default 30) — increase to 60 if you see external 429 rate-limits.
- REDIS_URL — optional, provide for persistent caching across restarts.

Notes and assumptions:
- Uses DexScreener and GeckoTerminal endpoints for fetching tokens.
- Caches aggregated tokens for `CACHE_TTL_SECONDS` (default 30s).
- Simple cursor-based pagination (opaque base64 index).




