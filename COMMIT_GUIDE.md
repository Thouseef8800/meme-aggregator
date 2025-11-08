COMMIT MESSAGE GUIDE
=====================

This file contains a short suggested commit history template and example commit messages you can use when preparing the repository for submission.

Why small commits?
- Small, focused commits make it easy to review changes, debug regressions, and explain design decisions.

Suggested sequence (example):

1. chore: initial scaffold for meme-aggregator (Fastify + Socket.io + tests)
   - Adds package.json, tsconfig, basic server, aggregator scaffold, and initial README.

2. feat: implement aggregation - DexScreener + GeckoTerminal
   - Polls external APIs, merges tokens, caching with TTL.

3. feat: add WebSocket updates and demo client
   - Socket.io integration and `public/index.html` demo client.

4. test: add unit and integration tests
   - Add Jest tests for cache, aggregator, and routes.

5. ci: add GitHub Actions workflow
   - Adds `.github/workflows/nodejs-test.yml` to run build & tests.

6. docs: add demo recording instructions and push guide
   - Updates README with steps to record the 1-2 minute demo and Git push steps.

How to create these commits locally (example commands):

```powershell
# stage everything and make the initial commit
git add -A
git commit -m "chore: initial scaffold for meme-aggregator (Fastify + Socket.io + tests)"

# make a change, stage and commit with focused message
git add src/aggregator.ts
git commit -m "feat: implement aggregation - DexScreener + GeckoTerminal"
```

Keep messages concise and use conventional prefixes: `feat`, `fix`, `chore`, `test`, `docs`, `ci`, `refactor`.

Good luck — small commits help reviewers and graders follow your work.
