# Release / Demo Notes

Quick script for recording a short demo of the project (1-2 minutes):

1. Start the server locally

```powershell
npm install
npm run dev
```

2. Open the demo page

Open http://localhost:3000/ in two browser tabs. In tab A click "Connect WS". In tab B optionally click "Connect WS" too.

3. Show HTTP load and filters

- Use the protocol input to filter (e.g. "solana").
- Use the "Sort" dropdown to show price/volume sorting.
- Click "Load tokens (HTTP)" and demonstrate results.

4. Show WebSocket live updates

- In tab A click "Connect WS" and demonstrate initial snapshot.
- In tab B simulate an update (reload HTTP or trigger aggregator changes) and show the update appearing in tab A (token cards flash and update price).

5. Conclusion

- Mention polling interval and cache TTL (configurable via environment), and that the aggregator normalizes tickers and marks primary tokens per symbol.
