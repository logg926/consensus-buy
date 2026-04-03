from __future__ import annotations

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .contracts import ConsensusRequest, CrossmintOrderRequest, RequestMode
from .crossmint import create_crossmint_order
from .deep_agents_workflow import run_consensus_workflow, stream_live_market_heuristic_events

load_dotenv()

app = FastAPI(title="ConsensusBuy Deep Agents Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/procurement/consensus")
async def procurement_consensus(payload: ConsensusRequest):
    try:
        return await run_consensus_workflow(payload)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/procurement/consensus/stream")
async def procurement_consensus_stream(
    item: str,
    budget: float,
    justification: str = "",
    mode: RequestMode = "live-amazon",
):
    payload = ConsensusRequest(item=item, budget=budget, justification=justification, mode=mode)

    async def event_stream():
        try:
            if mode == "live-amazon":
                async for event in stream_live_market_heuristic_events(payload):
                    yield f"event: {event['event']}\n"
                    yield f"data: {json.dumps(event['data'])}\n\n"
                return

            for event in (
                {
                    "event": "progress",
                    "data": {
                        "agent": "scraper",
                        "message": "Deep Agents mode is planning the board workflow and delegating market research.",
                    },
                },
                {
                    "event": "progress",
                    "data": {
                        "agent": "quality",
                        "message": "Deep Agents mode is reviewing quality signals and comparing alternatives.",
                    },
                },
                {
                    "event": "progress",
                    "data": {
                        "agent": "director",
                        "message": "Deep Agents mode is drafting the final recommendation. If it exceeds the timeout, it will degrade to Live Amazon.",
                    },
                },
            ):
                yield f"event: {event['event']}\n"
                yield f"data: {json.dumps(event['data'])}\n\n"

            response = await run_consensus_workflow(payload)
            for entry in response.logs:
                yield "event: log\n"
                yield f"data: {json.dumps(entry.model_dump())}\n\n"
            yield "event: final\n"
            yield f"data: {json.dumps(response.model_dump())}\n\n"
        except Exception as error:
            yield "event: error\n"
            yield f"data: {json.dumps({'message': str(error)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/procurement/execute")
async def procurement_execute(payload: CrossmintOrderRequest):
    try:
        return await create_crossmint_order(payload)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def main() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8001")),
        reload=False,
    )


if __name__ == "__main__":
    main()
