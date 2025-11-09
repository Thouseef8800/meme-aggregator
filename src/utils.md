How WebSocket flow works (client):
- Connect to server (socket.io)
- Emit `subscribe:snapshot` to receive initial aggregated tokens snapshot
- Listen for `tokens:update` events for deltas (price/volume updates)

REST flow:
- Client fetches /tokens with filters/pagination
- Uses cursor-based paging to get subsequent pages

