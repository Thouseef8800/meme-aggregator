# Demo script (1-2 minutes)

1. Start the service locally:

```powershell
npm ci
npm run build
npm start
# or docker-compose up --build
```

2. Open two browser tabs:
- Tab 1: REST call to list tokens: `http://localhost:PORT/tokens`
- Tab 2: WebSocket connection (use browser console):

```js
const ws = new WebSocket('ws://localhost:PORT/ws');
ws.onmessage = (m) => console.log('update', JSON.parse(m.data));
```

3. Trigger changes (simulate by running a small script that hits the aggregator's mock provider endpoints or temporarily change the sample provider data). Observe updates in Tab 2.

4. Check metrics:

```
curl http://localhost:PORT/metrics
```

Notes: replace PORT with the actual server port printed by the server on startup (default shown in logs).
