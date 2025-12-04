# Admin, Knowledge Base, Agents, and Health

Admin-only credit management plus supporting platform endpoints.

## Admin credit management
- **GET /api/v1/users** (auth, admin scope)  
  Returns `{ data: { users: [{ _id, name, email, credits, plan }] } }`. Used to list all tenants for credit actions.
- **GET /api/v1/users/:userId/credits/transactions** (auth, admin scope)  
  Query: `limit` (UI requests 100). Returns `{ data: { transactions: [{ _id, type (addition|deduction|message_deduction|initial_allocation|renewal_bonus|admin_add|admin_remove), amount, balance_after/balance, session_id?, reason, admin_id?, created_at }] } }`.
- **POST /api/v1/users/:userId/credits/add** (auth, admin scope)  
  Body: `{ amount: number, reason: string }`. Returns `{ success }`. 1 credit = 1 second of call time.
- **POST /api/v1/users/:userId/credits/remove** (auth, admin scope)  
  Body: `{ amount: number, reason: string }`. Returns `{ success }`. Negative balances should prevent calling.

## Knowledge base
- **GET /api/v1/knowledge-base/search** (auth)  
  Query: `query`, `limit`, `category`. Returns matched articles.
- **GET /api/v1/knowledge-base/list** (auth)  
  Query params for pagination/filtering. Returns full article list.
- **POST /api/v1/knowledge-base/add** (auth)  
  Body: `{ title, content, category, metadata }`. Adds an article.
- **DELETE /api/v1/knowledge-base/:id** (auth)  
  Deletes an article.

## Agent directory
- **GET /api/v1/agents** (auth)  
  Optional query filters. Returns `{ data: [{ _id, name, email?, phoneId?, liveStatus? }] }`.
- **GET /api/v1/agents/:agentId** (auth)  
  Returns `{ data: { _id, name, email?, phoneId?, metadata? } }`.

## Health
- **GET /health** (no auth)  
  Simple readiness endpoint. UI uses it for overall “backend up” checks.
