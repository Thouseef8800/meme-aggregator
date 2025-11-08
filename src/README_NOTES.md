Design notes:
- Aggregator polls two public APIs and merges tokens by lowercased address.
- Cache stored under `aggregated:tokens` with TTL.
- WebSocket sends `tokens:update` events whenever price or volume changes are detected.
- Cursor pagination encodes the numeric start index as base64 to produce nextCursor.
- Exponential retries implemented using `p-retry` in `httpClient.ts`.

Limitations:
- API response shapes vary; aggregator uses best-effort mapping.
- No advanced deduplication by token symbol/name; production system would use canonical token registry.
