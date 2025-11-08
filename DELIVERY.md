Final delivery checklist and demo script
=====================================

This file explains exactly what to submit, how the project is packaged, how to run it, and provides a short 1–2 minute demo script you can record.

What to include in your submission
---------------------------------
- A public GitHub repository containing the project root. Include all files except node_modules and dist (these are in .gitignore).
- A clear `README.md` (already present) that includes run instructions, architecture notes, and the CI badge (replace placeholder with your repo path).
- `DELIVERY.md` (this file) that lists what you submitted and the demo script.
- `Postman_collection.json` (included) or an equivalent Insomnia collection.
- Tests: the `__tests__` folder with Jest tests; ensure `npm run test` passes.
- A short public video (YouTube) link (1–2 minutes) showing the API and WebSocket demo.

Packaging / files to upload to GitHub
-----------------------------------
Keep the repository root as-is. Key files and folders:
- `src/` - TypeScript source code for server, aggregator, cache, routes, and demo client serving.
- `public/index.html` - Small demo client that connects via Socket.io and shows live updates.
- `package.json`, `tsconfig.json`, `.github/workflows/nodejs-test.yml` - build/test/CI config.
- `Postman_collection.json` - sample requests collection.
- `__tests__/` - unit & integration tests.
- `README.md`, `DELIVERY.md`, `COMMIT_GUIDE.md` - documentation.

How to run (quick)
------------------
1. Install dependencies:

```powershell
cd project
npm ci
```

2. Build (TypeScript):

```powershell
npm run build
```

3. Run tests:

```powershell
npm test
```

4a. Run the full server (API + WebSocket + demo client):

```powershell
npm run dev
# open http://localhost:3000
```

4b. Or serve only the static demo client (no server):

```powershell
npm run serve
# open http://localhost:3000
```

What I will check when reviewing your submission
------------------------------------------------
- Repository is public and contains the files listed above.
- CI badge (optional) updates after pushing.
- `npm run build` completes without TypeScript errors.
- `npm test` passes (or failing tests are documented with reason).
- Demo video link is present in the README or submission notes.

Demo recording script (1–2 minutes)
----------------------------------
Keep the recording short and focused. Aim for 60–120 seconds. Here's a suggested timeline and script.

0–10s: Title shot
- Show the repo name briefly (README) and state "Real-time Meme Coin Aggregator - demo".

10–35s: Show REST API & initial data
- Start the server (or state you have started it) using `npm run dev`.
- Open `http://localhost:3000/tokens?limit=20` in the browser or Postman.
- Point out the JSON response and mention that data is aggregated from multiple DEX APIs and cached (TTL = 30s by default).

35–70s: Show WebSocket live updates across two tabs
- Open two browser tabs to `http://localhost:3000/` (the demo client).
- In Tab A, click "Connect WS" and show the initial snapshot of tokens.
- In Tab B, either click "Load tokens (HTTP)" repeatedly or trigger activity (simulated updates via tests or fast repeated requests) and show that Tab A receives `tokens:update` events reflecting price/volume changes.
- Emphasize: initial load via HTTP, live deltas via WebSocket (no new HTTP calls when filtering client-side).

70–90s: Show rapid requests and caching benefit
- Open DevTools Network tab and make 5–10 rapid calls to `/tokens` (or run the Postman collection multiple times).
- Show that server responds fast and uses cached results (explain the `CACHE_TTL_SECONDS` behavior).

90–120s: Quick wrap-up & design notes
- Mention the main design choices:
  - Node.js + TypeScript + Fastify for performance.
  - Redis optional for cache and pub/sub (falls back to in-memory cache for local dev).
  - Socket.io for WebSocket updates and potential Redis adapter for scale.
- Point to README and tests for details.

Tips for recording
------------------
- Use a stable screen recording tool (OBS, Loom, or built-in OS recorder).
- Keep the terminal window visible when running `npm run dev` and the browser tabs visible when showing WS updates.
- Speak clearly and narrate the key points (what the viewer sees and why it matters).

Submission checklist (before you hand in)
----------------------------------------
- [ ] Repo is public on GitHub and link is ready.
- [ ] README updated with repo-specific CI badge (replace placeholder).
- [ ] `npm run build` and `npm test` succeed locally.
- [ ] Attach or include the YouTube video link.
- [ ] Include Postman/Insomnia collection.

If you want, paste the output of `npm run build` and `npm test` here and I will fix any failing tests or compilation errors.

Good luck — when you're ready I can help iterate on failing tests, tighten the aggregator logic, or prepare the final submission ZIP.
