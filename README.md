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

Next steps (not implemented here):
- Full unit + integration test coverage for external API failures
- Redis adapter for socket.io for multi-instance scaling
- Better delta computation and throttling of WS events

Recording the 1–2 minute demo
--------------------------------
When you record the short demo video, show these steps (concise, sequential):

1. Start the server locally:

```powershell
npm install
npm run dev
```

2. Show the REST API working:
- Open `http://localhost:3000/tokens?limit=20` in the browser or Postman.
- Point out response time and that the results are merged from multiple DEX sources.

3. Show the WebSocket live update flow:
- Open two browser tabs to `http://localhost:3000/` (the demo client page).
- In one tab click "Connect WS" to subscribe; show the initial snapshot.
- In the other tab, trigger activity (you can re-click "Load tokens (HTTP)" or simulate rapid requests) and show the `tokens:update` events appearing in both tabs.

4. Demonstrate rate / latency behavior:
- Open DevTools Network tab and show a few rapid API calls to the `/tokens` endpoint (5–10 calls) and note that the server uses cached data (short TTL) to avoid hitting external APIs too frequently.

5. Conclude with design notes (quick):
- Aggregator polls DexScreener + GeckoTerminal and merges tokens by address.
- Cache TTL is configurable via `CACHE_TTL_SECONDS` (defaults to 30s) to reduce external requests.
- WebSocket pushes `tokens:update` events for deltas; initial load is via HTTP snapshot.

This flow demonstrates the three required deliverables: API working live, WebSocket updates in multiple tabs, and quick load/response time under repeated calls.

Push to GitHub (recommended commands)
------------------------------------
Run these commands from the `project` folder to create a new Git repository locally and push it to GitHub.

Option A — using the GitHub CLI (`gh`) (recommended):

```powershell
# create local repo and initial commit
git init
git add -A
git commit -m "chore: initial scaffold for meme-aggregator (Fastify + Socket.io + tests)"

# create GitHub repo (replace repo name if you prefer)
gh repo create your-username/meme-aggregator --public --source=. --remote=origin --push
```

Option B — without `gh` (manual remote creation):

```powershell
git init
git add -A
git commit -m "chore: initial scaffold for meme-aggregator (Fastify + Socket.io + tests)"

# create a remote repo on GitHub using the website, then run:
git remote add origin https://github.com/<your-username>/meme-aggregator.git
git branch -M main
git push -u origin main
```

Suggested next commits (small, focused):
- feat: add aggregator polling and merge logic
- feat: add WebSocket updates and demo client
- test: add unit and integration tests
- ci: add GitHub Actions workflow

After pushing, replace the badge at the top of this README: change `<owner>/<repo>` to your GitHub owner and repository name so the CI badge shows your project's status.

Run build & tests locally (what I will need to validate remotely):

```powershell
npm ci
npm run build
npm test
```

If you want me to verify results, paste the output of those commands here and I'll iterate on any failing tests or build errors.

