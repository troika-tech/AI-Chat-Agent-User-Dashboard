# Chat Agent Dashboard API Overview

This folder captures the backend contract required by the dashboard. All endpoints are called relative to `API_BASE_URL`, which is configured in `src/config/api.config.js` (switch between `http://localhost:5000` and `https://chat-apiv3.0804.in` via `USE_LIVE_URL`).

## Common requirements
- **Auth:** JWT stored as `authToken` in `localStorage`. Send `Authorization: Bearer <token>` on every request except `/api/user/login` and `/health`. On `401` the UI clears storage (`authToken`, `refreshToken`, `user`) and redirects to `/login`.
- **Headers:** `Content-Type: application/json`. All responses are JSON.
- **Shape:** Prefer `{ success: boolean, data: <payload>, message? }`. Some endpoints return `{ data: <payload> }` without an explicit `success` flag.
- **Pagination:** Query `page` (1-based) and `limit`; responses return `total` and either `pages` or `totalPages`, plus `currentPage` or `page`.
- **Dates & ids:** ISO-8601 timestamps. Identifiers may be `_id` or `id`; the UI accepts either.
- **Timeouts:** The axios client times out after 10 seconds; avoid long-running requests.
- **Demo mode:** `DEMO_MODE` is `false` in production. When `true`, the UI short-circuits network calls with mock data.

## Where to look next
- User/chat/credits endpoints: `API_USER_CHAT.md`
- Voice, campaigns, analytics, system stats: `API_VOICE_CAMPAIGN.md`
- Admin credits, knowledge base, agents, health: `API_ADMIN_PLATFORM.md`
