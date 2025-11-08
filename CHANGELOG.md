# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- UI: WS status indicator and reconnect countdown
- UI: Persist last-known prices to localStorage
- API: Added `protocol` filter and additional `sort` options to GET /tokens
- Aggregator: normalize token tickers, capture market cap, mark primary address per canonical symbol
- Tests: unref timers to avoid Jest teardown warnings
