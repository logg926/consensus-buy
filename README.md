# ConsensusBuy

ConsensusBuy is a three-agent procurement workflow built on a Python Deep Agents backend:

- `Market Scraper` finds the requested product and 3 to 4 cheaper alternatives.
- `Quality Analyst` rejects low-quality options and picks the strongest value candidate.
- `Procurement Director` turns the debate into a CFO-ready recommendation.

The repo has two parts:

- `src/`: the React frontend that visualizes the agent debate and approval queue
- `backend/`: a FastAPI service that uses `deepagents.create_deep_agent(...)` plus procurement-specific subagents and tools, or hands off to n8n when a webhook is configured

## Architecture

Frontend request flow:

1. The user submits an item, budget, business justification, and fulfillment details.
2. The frontend posts to `/api/procurement/consensus`.
3. Vite proxies `/api` calls to the backend during local development.
4. Returned agent logs are replayed in the UI and the final recommendation is placed into the approval queue.
5. CFO approval posts the selected product locator and shipping details to `/api/procurement/execute`, which creates a Crossmint order in staging.

Backend execution modes:

- `n8n-webhook`: if `N8N_CONSENSUS_WEBHOOK_URL` is set, the backend forwards the request to n8n and expects the typed consensus payload back
- `local-deepagents`: if MiniMax credentials are configured, the backend runs the three-agent workflow through Deep Agents with three specialist subagents
- `local-fallback`: if no backend model config is present, the UI still works with a deterministic fallback recommendation

## Setup

Copy the example env file and fill in the values you actually have:

```bash
cp .env.example .env
```

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

The backend binds to `127.0.0.1:8001` by default.

If you want direct MiniMax execution through Deep Agents, set:

```bash
MINIMAX_API_KEY=...
MINIMAX_BASE_URL=...
MINIMAX_MODEL=MiniMax-M1
```

If you want n8n to orchestrate instead, set:

```bash
N8N_CONSENSUS_WEBHOOK_URL=https://your-n8n-instance/webhook/consensusbuy
```

If you want the approval step to create a Crossmint order in staging, set:

```bash
CROSSMINT_SERVER_API_KEY=...
CROSSMINT_API_BASE_URL=https://staging.crossmint.com/api/2022-06-09
```

`VITE_CROSSMINT_CLIENT_API_KEY` is reserved for a later embedded payment-method flow. The current integration only uses the server-side key.

## n8n Contract

The backend sends this request body to n8n:

```json
{
  "item": "Yeti Tundra 65 Hard Cooler",
  "budget": 400,
  "justification": "Needed for field events"
}
```

n8n should return:

```json
{
  "logs": [
    {
      "id": "log-1",
      "agent": "scraper",
      "agentName": "Market Scraper",
      "message": "Found one exact match and three cheaper alternatives.",
      "type": "result"
    }
  ],
  "result": {
    "originalItem": "Yeti Tundra 65 Hard Cooler",
    "originalPrice": 400,
    "recommendedItem": "Acme Business Cooler",
    "recommendedPrice": 120,
    "savings": 280,
    "savingsPercent": 70,
    "rationale": "The selected option keeps the durability profile while materially lowering spend.",
    "alternatives": []
  },
  "metadata": {
    "provider": "n8n",
    "model": "MiniMax-M1",
    "executionMode": "n8n-webhook"
  }
}
```

## Verification

The repo currently includes:

- a frontend fallback unit test in [src/test/example.test.ts](/Users/loggcheng/Documents/financial-hack-apr-3/consensus-buy/src/test/example.test.ts)
- Vite proxying for `/api`
- backend health, consensus, and Crossmint execution endpoints in [backend/app/main.py](/Users/loggcheng/Documents/financial-hack-apr-3/consensus-buy/backend/app/main.py)
