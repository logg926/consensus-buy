# ConsensusBuy Pitch

## What It Is

ConsensusBuy is an AI-assisted procurement workflow for companies that want to reduce waste before purchases happen, not after finance closes the books.

Instead of letting every employee submit a purchase request that gets rubber-stamped at list price, ConsensusBuy runs a structured procurement review:

1. An employee submits what they want, the budget, and why they need it.
2. A multi-agent workflow reviews the request and proposes a lower-cost alternative.
3. A CFO or approver reviews the recommendation in a dedicated approval queue.
4. Once approved, the system can hand off execution to Crossmint to create the actual order flow.

The core idea is simple:

Companies overspend because the buying process is fragmented, rushed, and often lacks structured market comparison. ConsensusBuy turns procurement into an opinionated, AI-mediated decision system that balances speed, savings, and quality control.

## The Problem

Most companies have three procurement failures:

- Employees request brand-name or default options without comparing alternatives.
- Finance sees spend too late, after money is already committed.
- Approval workflows focus on permission, not optimization.

That creates predictable waste:

- software seats that are over-provisioned
- hardware bought at premium brand pricing
- office equipment with better value substitutes
- rushed purchases with no quality review

ConsensusBuy addresses that by putting an intelligent decision layer between request and purchase.

## The Product Story

ConsensusBuy is positioned as a procurement copilot for growing teams.

It is not just a chatbot that gives suggestions. It is a workflow product with:

- request intake
- agent debate and reasoning
- approval routing
- savings presentation
- purchase execution handoff
- downstream spend visibility

That makes it useful for:

- startups building lightweight purchasing controls
- finance teams trying to reduce discretionary spend
- operations teams standardizing procurement
- founders who want approval discipline without slowing the team down

## How It Works

### 1. Purchase Request Intake

The user submits:

- item description
- requested budget
- business justification

This is intentionally lightweight so request creation stays fast.

### 2. Multi-Agent Procurement Review

ConsensusBuy runs a three-role workflow:

- Market Scraper
  - finds the requested item baseline and cheaper alternatives
- Quality Analyst
  - rejects low-quality or risky substitutes
- Procurement Director
  - chooses the strongest value option and produces the final recommendation

The UI replays this as an agent debate so the recommendation feels auditable instead of opaque.

### 3. CFO Approval Queue

Each request lands in an approval queue where the approver sees:

- original item and budget
- recommended item and price
- savings amount and savings percentage
- rationale
- alternative options

At approval time, the approver fills in execution-specific data for Crossmint:

- product locator or purchase URL
- recipient email
- shipping information

This keeps the initial request simple while still supporting a real execution handoff later.

### 4. Crossmint Execution

When the approver clicks approve, ConsensusBuy can call Crossmint staging to create an order object.

The current flow returns:

- Crossmint order ID
- current order phase
- payment status

This is the bridge from recommendation into purchase execution.

### 5. Spend Visibility

ConsensusBuy also includes finance-facing surfaces for:

- purchase history
- cumulative savings
- spend analysis
- flagged overspending examples

These help tell the broader story that ConsensusBuy is not just point-of-purchase optimization, but an operating system for smarter company spend.

## Feature Set

### Core Features

- Lightweight employee purchase request form
- Multi-agent procurement recommendation flow
- Agent-by-agent reasoning log in the UI
- CFO approval queue with request state management
- Savings calculation and recommendation comparison
- Crossmint handoff on approval
- Purchase history view
- Spend analysis dashboard

### AI and Workflow Features

- Deep Agents procurement workflow
- n8n webhook execution mode support
- deterministic fallback mode when model orchestration is unavailable
- rationale generation for each recommendation
- alternative ranking with pricing, ratings, warranty, pros, and cons

### Execution Features

- Crossmint order creation through the Python backend
- product locator normalization
- max-price cap sent at execution time
- order phase and payment status surfaced back to the UI

### Demo and Presentation Features

- animated debate log
- approval queue transitions
- confetti and motion for recommendation completion
- seeded history and seeded requests for immediate demo value

## What Is Real Today

These parts are genuinely wired:

- frontend request flow to backend
- FastAPI backend endpoints
- multi-stage procurement workflow orchestration
- Crossmint staging integration through the Python backend
- approval-to-execution handoff
- order ID, phase, and payment status returned from Crossmint

## What Is Still Demo or Mock

Some parts are still demo-oriented:

- spend analysis data is static
- purchase history includes seeded records
- approval queue includes seeded requests
- random requester names are generated in the frontend
- frontend fallback recommendation mode is synthetic
- the default Deep Agents procurement logic still builds synthetic alternatives rather than pulling live retailer data

That means the product story is strong and the flow is real, but not every screen is backed by production-grade data sources yet.

## Why This Is Compelling

ConsensusBuy sits at the intersection of three strong themes:

- AI agents as workflow operators
- procurement automation
- embedded commerce and purchase execution

It works well as a hackathon product because it is easy to understand quickly:

- input: “I want to buy this”
- intelligence: “Here is the cheaper safer option”
- governance: “Here is the approval flow”
- execution: “Now place the order”

That end-to-end narrative is much stronger than a standalone chatbot or dashboard.

## Ideal Demo Script

1. Submit a request for a premium office or tech item.
2. Show the agent debate and the rationale building up.
3. Highlight the cheaper recommended alternative and savings amount.
4. Move to CFO approval and explain that the system separates request creation from execution data entry.
5. Enter the product locator and shipping details.
6. Approve the request.
7. Show the Crossmint order ID and payment status returned by the backend.
8. Close on the history and spend-analysis screens to show the longer-term operating model.

## Product Positioning

ConsensusBuy can be pitched as:

- “Ramp meets AI procurement”
- “An AI procurement board before company money gets spent”
- “A finance guardrail for discretionary spend”
- “An agentic purchasing workflow with embedded execution”

## Roadmap

Natural next steps:

- replace synthetic market research with live retailer or marketplace search
- connect real accounting or ERP sources for spend analysis
- save reusable shipping and purchasing profiles
- support policy rules by department or budget band
- attach vendor links and evidence for every recommendation
- add approval chains instead of single approver mode
- add real order tracking after Crossmint handoff

## One-Line Pitch

ConsensusBuy is an AI procurement workflow that reviews employee purchase requests, recommends lower-cost high-quality alternatives, routes them through CFO approval, and hands execution off to Crossmint.
