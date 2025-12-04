# User, Auth, Chat, and Credits API

These endpoints drive login, dashboards, chat history, leads, and user-facing credit views.

## Auth and session
- **POST /api/user/login** (no auth)  
  Body: `{ email, password }`. Returns `{ success, data: { token, role, user: { id/_id, name, email, credits?, plan?, agentId?, phoneId? } }, message }`. Store `authToken` and `user` in `localStorage`.
- **POST /api/auth/logout** (auth)  
  No body. Returns `{ success }`. UI still clears local storage even if the call fails.
- **POST /api/auth/validate-token** (auth)  
  No body. Returns `{ success }`. Used to keep sessions alive.
- **GET /api/user/company** (auth)  
  Returns company/user profile used for header/user menu.

## Plan and usage
- **GET /api/user/plan** (auth)  
  Returns `{ success, data: { name, tokens, days_remaining, max_users, expiry_date } }`.
- **GET /api/user/usage** (auth)  
  Returns `{ success, data: { total_messages, unique_users, total_duration, last_activity } }`.

## Analytics and sessions
- **GET /api/user/analytics?dateRange=7days|30days|90days|all** (auth)  
  Returns `{ success, data: { chartData: [{ date, count }], visitorsData?, totalMessages, totalSessions, avgDurationSeconds, avgMessagesPerChat } }`. Drives the Analytics page.
- **GET /api/user/sessions?dateRange=7days** (auth)  
  Returns `{ success, data: { sessions: [{ session_id, messages: [{ content, sender, timestamp }], duration? }], avgDurationSeconds } }`. Used for “Top chats”.

## Leads and intents
- **GET /api/user/hot-leads** (auth)  
  Query: `page`, `limit`, `searchTerm`, `dateRange`, `startDate`, `endDate`. Returns `{ success, data: { leads: [{ id/session_id, phone, email, name, matchedKeywords, messageSnippets: [{ content, timestamp }], hotWordCount, firstDetectedAt, lastDetectedAt }], hotWords, total, currentPage, totalPages } }`.
- **GET /api/user/follow-up-leads** (auth)  
  Query: `page`, `limit`, `searchTerm`, `dateRange`, `startDate`, `endDate`, `showContacted` (`all|true|false`). Returns `{ success, data: { leads: [{ session_id, phone, email, name, matchedKeywords, messageSnippets, matchCount, firstDetectedAt, lastDetectedAt, isContacted, contactedAt, notes }], keywords, total, currentPage, totalPages } }`.
- **PATCH /api/user/follow-up-leads/:session_id/contacted** (auth)  
  Body: `{ is_contacted: boolean, notes: string }`. Returns `{ success, data: { lead: { session_id, is_contacted, notes } } }`.

## Messages, contacts, summaries
- **GET /api/user/messages** (auth)  
  Query: `page`, `limit`, `email`, `phone`, `session_id`, `is_guest`, `dateRange`, `startDate`, `endDate`, `search`. Returns `{ success, data: { messages, totalPages, currentPage, totalMessages } }` where each message has `id/_id`, `content`, `sender` (`bot|user`), `timestamp` (ISO), `session_id`, `email`, `phone`, `is_guest`, `name`.
- **GET /api/user/contacts** (auth)  
  Returns `{ success, data: { contacts: [phone/email], guests: [{ session_id, label, number }] } }` for filter dropdowns.
- **GET /api/user/daily-summaries** (auth)  
  Query: `page`, `limit`, `startDate`, `endDate`. Returns `{ success, data: { summaries: [{ _id, date, summary, messageCount, sessionCount, topTopics[] }], total, currentPage, totalPages } }`.

## Credits (user-facing)
- **GET /api/user/credit-summary** (auth)  
  Returns `{ success, data: { currentBalance, totalAllocated, totalUsed, usagePercentage } }`.
- **GET /api/user/credit-transactions** (auth)  
  Query: `page`, `limit`, `type`, `startDate`, `endDate`, `search`. Returns `{ success, data: { transactions: [{ _id, type, amount, balance_after/balance, session_id?, reason, admin_id?, created_at }], total, currentPage, totalPages } }`.
- **GET /api/v1/auth/me** (auth)  
  Returns `{ data: { user: { credits } } }`. Used to show the current balance without admin scope.
- **GET /api/v1/auth/me/credits/transactions** (auth)  
  Query: `limit` (default 50), `skip`, `startDate`, `endDate`. Returns `{ data: { transactions: [{ _id, type (addition|deduction), amount, balance, reason, createdAt, metadata? }], total } }`.
