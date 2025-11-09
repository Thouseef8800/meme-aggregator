# Design notes

High-level architecture
- Aggregator: poll-based ingestion from multiple DEX APIs (DexScreener, PancakeSwap). Normalizes items into a token map and emits delta updates.
- Cache: optional Redis backend with in-memory fallback. Stores normalized token data and per-source conditional GET metadata (ETag/Last-Modified).
- API: Fastify REST endpoints (GET /tokens) and a WebSocket endpoint for real-time filtered updates.
- Resilience: inline request retry/backoff with Retry-After handling and a per-provider circuit-breaker.
- Metrics: Prometheus via `prom-client` with a compatibility wrapper for test stability.

Trade-offs and future work
- Polling vs streaming: polling is simpler and more robust for rate-limited DEX APIs, but adds latency. Consider webhooks or provider sockets if available.
- Metric label arity: tests required a compatibility wrapper; for production, replace with properly labeled prom-client metrics.
- Security: secrets (API keys) and production Redis should be stored in hosting secrets; ensure TLS and proper process management.
