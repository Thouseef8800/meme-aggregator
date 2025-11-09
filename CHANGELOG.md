# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.0] - 2025-11-09
- Initial public release snapshot: aggregator core, REST + WebSocket, Redis optional cache, conditional GET support, retry/backoff, metrics (Prometheus), CI, Docker, and deployment docs.
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- UI: WS status indicator and reconnect countdown
- UI: Persist last-known prices to localStorage
- API: Added `protocol` filter and additional `sort` options to GET /tokens
- Aggregator: normalize token tickers, capture market cap, mark primary address per canonical symbol
- Tests: unref timers to avoid Jest teardown warnings
