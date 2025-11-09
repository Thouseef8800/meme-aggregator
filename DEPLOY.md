Deployment notes — Render and Railway

This file explains how to deploy the project to a free hosting provider (Render or Railway). You must push this repository to GitHub first.

Render (quick)

1. Push your repository to GitHub (create a remote `origin` and push the `release/clean` branch):

   git remote add origin git@github.com:<your-username>/meme-aggregator.git
   git push -u origin release/clean

2. Create a new Web Service on Render (https://render.com):
   - Connect your GitHub account and select the repository.
   - Choose the branch `release/clean`.
   - Build command: `npm ci && npm run build`
   - Start command: `node dist/server.js`
   - Set Environment: PORT=60613, REDIS_URL (optional if you want Redis managed)

3. For Redis:
   - Use Render's Redis add-on or point `REDIS_URL` to a managed Redis instance.

Railway (quick)

1. Push your repository to GitHub (same as above).
2. Create a new project on Railway (https://railway.app) and connect your GitHub repo.
3. Railway will auto-detect `package.json`. Set build: `npm ci && npm run build` and start: `node dist/server.js`.
4. Add a Redis plugin in Railway and set `REDIS_URL` environment variable.

Local Docker (development)

1. Build and run locally (app + redis):

   docker-compose up --build

2. The server will be reachable at http://localhost:60613

Notes
- The container image runs the compiled `dist/server.js`. If you change TypeScript sources, rebuild the image.
- For production, consider using a multi-stage Dockerfile to reduce image size and run as a non-root user. This Dockerfile is intentionally simple for quick deployments.
