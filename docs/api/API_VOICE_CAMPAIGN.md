# Voice, Campaign, and Analytics API

These endpoints power outbound calling, campaign management, live status, and call-based analytics.

## Calls and call logs
- **POST /api/v1/calls/outbound** (auth)  
  Body: `{ phoneNumber, customParameters: object }`. Returns `{ success, data: { callSid/sessionId, status } }`.
- **GET /api/v1/calls/:callSid** (auth)  
  Returns call detail by SID.
- **GET /api/v1/calls/history/:phoneNumber** (auth)  
  Query: `limit` (default 10). Returns recent calls for the number.
- **GET /api/v1/calls/outbound/stats** (auth)  
  Returns aggregate counters for outbound calls.
- **GET /api/v1/analytics/calls/logs** (auth)  
  Query: `page`, `limit`, `status`, `direction`, `phoneNumbers[]`, `startDate`, `endDate`, `userId` (used to scope data). Returns `{ data: { calls, total, page, limit, pages, pagination } }` where each call may include `_id/callSid/sessionId/exotelCallSid`, `fromPhone`, `toPhone`, `status` (`completed|failed|no-answer|busy|in-progress|initiated`), `duration/durationSec`, `cost`, `createdAt`, `startedAt/startTime`, `endedAt`, `direction` (`outbound|inbound`), `campaignName`, `agentName`, `recordingUrl`, `transcript` (`[{ speaker/role, text/content, timestamp }]`), `creditsConsumed`, `metadata`.
- **GET /api/v1/calls/retriable** (auth)  
  Query: `userId` plus optional filters (status/direction/time range). Returns retry candidates for failed calls.
- **GET /api/v1/calls/voicemail-stats** (auth)  
  Query: `userId`, optional `startDate`, `endDate`. Returns voicemail detection stats.
- **GET /api/v1/calls/:callLogId/voicemail-analysis** (auth)  
  Returns detailed analysis/transcript for a specific call log.
- **POST /api/v1/calls/:callLogId/mark-false-positive** (auth)  
  Body: `{ isFalsePositive: boolean }`. Marks voicemail detection overrides.

## Campaign management
- **POST /api/v1/campaigns** (auth)  
  Body: `{ name, agentId, phoneId, settings: { concurrentCallsLimit } }`. Returns `{ success, data: { _id, ... } }`.
- **POST /api/v1/campaigns/:campaignId/contacts** (auth)  
  Body: `{ contacts: [{ phoneNumber, name, metadata }] }`. The UI prepends `+91` if a number is missing `+`. Returns `{ success, data: { added, duplicates, errors } }`.
- **POST /api/v1/campaigns/:campaignId/start|pause|resume|cancel** (auth)  
  No body. Returns `{ success }`. Used for lifecycle controls.
- **PATCH /api/v1/campaigns/:campaignId** (auth)  
  Body: partial updates (e.g., `{ status }` to set `waiting_for_approval`). Returns `{ success, data }`.
- **GET /api/v1/campaigns** (auth)  
  Query: `status` filter. Returns either an array or `{ campaigns: [...] }`. Each campaign should include `_id`, `name`, `status`, `agentId`, `phoneId`, `createdAt`, and `liveStats` (`processed`, `totalNumbers`, `remaining`, `activeCalls`, `queueLength`, `completed`, `failed`).
- **GET /api/v1/campaigns/:campaignId** (auth)  
  Returns `{ data: { _id, name, status, agentId, phoneId { number }, userId { name, email }, createdAt, phoneNumbers[], stats { completed, failed }, completedCalls, failedCalls, totalCalls } }`.
- **GET /api/v1/campaigns/:campaignId/contacts** (auth)  
  Query: `page`, `limit` (UI requests up to 10k). Returns `{ data: { contacts: [{ phoneNumber, name, status, attempts, lastError }], total, page/pages } }`. Used for CSV export.
- **GET /api/campaigns/:campaignId/debug** (no auth header is sent by the UI)  
  Returns `{ debugInfo: { stats: { activeCallsCount, queueLength, completedCalls, failedCalls, processedNumbers, remainingNumbers, totalNumbers } } }`. Allow public read or handle optional Bearer auth.
- **(Required for Call Summary) Fetch campaigns with contacts**  
  The `CallSummary` view expects an endpoint to list all campaigns with their `contacts` (to map phone numbers to names). Implement one of:  
  - `GET /api/v1/campaigns?userId=<id>&includeContacts=true`  
  - or a dedicated `GET /api/v1/campaigns/all` returning `{ data: { campaigns: [{ contacts: [{ phoneNumber, name }] }] } }`.

## Voice analytics
- **GET /api/v1/analytics/dashboard** (auth)  
  Query: `userId`, optional `startDate`, `endDate`. Returns `{ data: { totalCalls, completedCalls, failedCalls, inProgressCalls, successRate, averageDuration, totalDuration, callTrends: [{ time, calls }], callsOverTime: { labels, data }, byStatus: { completed, failed, no-answer, busy }, byDirection: { inbound, outbound } } }`.
- **GET /api/v1/analytics/calls|retry|scheduling|voicemail|performance|cost|trends** (auth)  
  Query: `userId`, optional `startDate`, `endDate`. Return aggregated metrics for charts/tables (shape can mirror dashboard metrics).

## System stats (WebSocket fallback)
- **GET /api/v1/stats** (auth)  
  Returns `{ activeCalls, totalConnections, queueLength, uptime, memory?, deepgramPool? }`. `deepgramPool` may include `{ status: healthy|warning|critical, utilization }`. Used by the Live Status page for heartbeat data.
