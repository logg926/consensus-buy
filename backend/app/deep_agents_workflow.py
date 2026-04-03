from __future__ import annotations

import asyncio
import json
import os
import re
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

import httpx
from deepagents import create_deep_agent
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict

from .contracts import AgentLogEntry, Alternative, ConsensusMetadata, ConsensusRequest, ConsensusResponse, ProcurementResult

DEEP_AGENTS_TIMEOUT_SECONDS = float(os.getenv("DEEP_AGENTS_TIMEOUT_SECONDS", "35"))


class MarketResearch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exact_item: dict[str, Any]
    alternatives: list[Alternative]
    summary: str
    source: str = "fallback-catalog"
    fallback_reason: str | None = None


class AmazonSearchCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asin: str
    title: str
    link: str
    thumbnail: str | None = None
    brand: str | None = None
    rating: float = 0.0
    reviews: int = 0
    price: float
    original_price: float | None = None
    availability: str | None = None
    recent_sales: str | None = None
    is_prime: bool = False


class QualityNote(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alternativeName: str
    verdict: str
    reason: str


class QualityReview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdictSummary: str
    recommendedAlternativeName: str
    reviewNotes: list[QualityNote]


class DirectorPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scraperSummary: str
    qualitySummary: str
    qualityNotes: list[QualityNote]
    result: ProcurementResult


def _round_money(value: float) -> float:
    return float(round(value, 2))


def _build_catalog(item: str, budget: float) -> MarketResearch:
    safe_item = item.strip()
    exact = {
        "name": safe_item,
        "price": _round_money(budget),
        "notes": "Employee-requested baseline item for comparison.",
    }
    alternatives = [
        Alternative(
            name=f"{safe_item} Budget Clone",
            price=_round_money(budget * 0.24),
            rating=2.2,
            warranty="90 days",
            pros=["Lowest price"],
            cons=["Breakage complaints", "Poor long-term durability", "Weak support"],
        ),
        Alternative(
            name=f"{safe_item} Practical Value",
            price=_round_money(budget * 0.33),
            rating=4.1,
            warranty="2 years",
            pros=["Reasonable cost", "Acceptable reviews", "Suitable for light-duty use"],
            cons=["Average materials", "Lower spec retention"],
        ),
        Alternative(
            name=f"{safe_item} Business Grade",
            price=_round_money(budget * 0.46),
            rating=4.6,
            warranty="5 years",
            pros=["Best quality-to-cost ratio", "Strong warranty", "Commercial-grade durability"],
            cons=["Less premium branding"],
            recommended=True,
        ),
        Alternative(
            name=f"{safe_item} Premium Adjacent",
            price=_round_money(budget * 0.71),
            rating=4.4,
            warranty="3 years",
            pros=["Known vendor", "Strong features", "Low change-management risk"],
            cons=["Savings are not compelling"],
        ),
    ]
    return MarketResearch(
        exact_item=exact,
        alternatives=alternatives,
        summary=(
            f'Found the requested "{safe_item}" as the baseline plus four cheaper category alternatives. '
            "One option is clearly too cheap to trust, one is acceptable, one is business-grade, and one is near-premium."
        ),
        source="fallback-catalog",
    )


def _searchapi_key() -> str | None:
    return os.getenv("SEARCHAPI_API_KEY")


def _searchapi_headers() -> dict[str, str]:
    api_key = _searchapi_key()
    return {"Authorization": f"Bearer {api_key}"} if api_key else {}


def _search_amazon(query: str, *, budget: float, sort_by: str = "featured") -> list[AmazonSearchCandidate]:
    api_key = _searchapi_key()
    if not api_key:
        raise ValueError("SEARCHAPI_API_KEY is not configured")

    params = {
        "engine": "amazon_search",
        "q": query,
        "amazon_domain": os.getenv("SEARCHAPI_AMAZON_DOMAIN", "amazon.com"),
        "sort_by": sort_by,
        "price_max": budget,
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            "https://www.searchapi.io/api/v1/search",
            params=params,
            headers=_searchapi_headers(),
        )

    response.raise_for_status()
    payload = response.json()
    results = payload.get("organic_results", []) if isinstance(payload, dict) else []
    candidates: list[AmazonSearchCandidate] = []

    for result in results:
        if not isinstance(result, dict):
            continue
        price = result.get("extracted_price")
        asin = result.get("asin")
        title = result.get("title")
        link = result.get("link")
        thumbnail = result.get("thumbnail")
        if not asin or not title or not link or price in (None, "") or not thumbnail:
            continue
        if not isinstance(price, (int, float)):
            continue

        try:
            candidates.append(
                AmazonSearchCandidate(
                    asin=str(asin),
                    title=str(title),
                    link=str(link),
                    thumbnail=str(thumbnail),
                    brand=str(result["brand"]) if result.get("brand") else None,
                    rating=float(result.get("rating") or 0),
                    reviews=int(result.get("reviews") or 0),
                    price=_round_money(float(price)),
                    original_price=_round_money(float(result["extracted_original_price"]))
                    if isinstance(result.get("extracted_original_price"), (int, float))
                    else None,
                    availability=str(result["availability"]) if result.get("availability") else None,
                    recent_sales=str(result["recent_sales"]) if result.get("recent_sales") else None,
                    is_prime=bool(result.get("is_prime")),
                )
            )
        except Exception:
            continue

    return candidates


def _candidate_to_alternative(
    candidate: AmazonSearchCandidate,
    *,
    baseline_price: float,
    recommended: bool = False,
) -> Alternative:
    spec_match = min(96, max(68, int(round((candidate.price / max(baseline_price, 1)) * 100))))
    pros = [
        f"{candidate.rating:.1f} star rating" if candidate.rating else "Available on Amazon",
        f"{candidate.reviews:,} reviews" if candidate.reviews else "Review count not surfaced",
        "Prime shipping eligible" if candidate.is_prime else "Standard Amazon fulfillment",
    ]
    if candidate.recent_sales:
        pros.append(candidate.recent_sales)

    cons: list[str] = []
    if candidate.rating and candidate.rating < 4.0:
        cons.append("Below-target rating for company purchasing")
    if candidate.reviews and candidate.reviews < 100:
        cons.append("Lower review volume than ideal")
    if candidate.availability:
        cons.append(candidate.availability)
    if not cons:
        cons.append(f"Estimated {spec_match}% spec overlap versus the requested item")

    warranty = "5 years" if candidate.rating >= 4.5 else "3 years" if candidate.rating >= 4.1 else "1 year"

    return Alternative(
        name=candidate.title,
        price=candidate.price,
        rating=round(candidate.rating, 1),
        warranty=warranty,
        pros=pros[:4],
        cons=cons[:3],
        recommended=recommended,
        asin=candidate.asin,
        link=candidate.link,
        thumbnail=candidate.thumbnail,
        availability=candidate.availability,
        isPrime=candidate.is_prime,
    )


def _build_live_catalog(item: str, budget: float) -> MarketResearch:
    featured = _search_amazon(item, budget=max(budget * 1.35, budget), sort_by="featured")
    if not featured:
        raise ValueError("Amazon Search API returned no results for the requested item")

    baseline = featured[0]
    price_cap = baseline.price if baseline.price > 0 else budget
    alternatives_feed = _search_amazon(item, budget=price_cap, sort_by="price_low_to_high")
    cheaper = [
        candidate
        for candidate in alternatives_feed
        if candidate.asin != baseline.asin and candidate.price < price_cap
    ]

    deduped: list[AmazonSearchCandidate] = []
    seen_asins = set()
    for candidate in cheaper:
        if candidate.asin in seen_asins:
            continue
        seen_asins.add(candidate.asin)
        deduped.append(candidate)
        if len(deduped) == 4:
            break

    if len(deduped) < 3:
        raise ValueError("Amazon Search API did not return enough cheaper alternatives")

    scored = sorted(
        deduped,
        key=lambda candidate: (
            (candidate.rating or 0) * 1000
            + min(candidate.reviews, 5000)
            - abs(candidate.price - (baseline.price * 0.55)),
        ),
        reverse=True,
    )
    recommended_asin = scored[0].asin
    alternatives = [
        _candidate_to_alternative(candidate, baseline_price=baseline.price, recommended=candidate.asin == recommended_asin)
        for candidate in deduped
    ]

    return MarketResearch(
        exact_item={
            "asin": baseline.asin,
            "name": baseline.title,
            "price": baseline.price,
            "link": baseline.link,
            "thumbnail": baseline.thumbnail,
            "brand": baseline.brand,
            "rating": baseline.rating,
            "reviews": baseline.reviews,
            "availability": baseline.availability,
            "recent_sales": baseline.recent_sales,
        },
        alternatives=alternatives,
        summary=(
            f'Amazon Search API found the requested baseline "{baseline.title}" at ${baseline.price:.2f} '
            f"and {len(alternatives)} cheaper live alternatives for board review."
        ),
        source="live-amazon-searchapi",
    )


def _evaluate_quality(market_research: MarketResearch) -> QualityReview:
    notes: list[QualityNote] = []
    recommended_name = market_research.alternatives[0].name
    best_score = float("-inf")

    for alternative in market_research.alternatives:
        score = (alternative.rating * 25) + (15 if alternative.recommended else 0) - (alternative.price * 0.03)
        if alternative.rating < 4.0:
            verdict = "reject"
            reason = (
                f"{alternative.name} is too risky for business purchasing because its rating is only "
                f"{alternative.rating:.1f} and the quality signals are weak."
            )
            score -= 20
        elif alternative.rating >= 4.4 and any("Prime" in pro for pro in alternative.pros):
            verdict = "strong"
            reason = (
                f"{alternative.name} has strong review quality, dependable fulfillment, and enough price separation "
                "to justify switching away from the requested baseline."
            )
            score += 12
        else:
            verdict = "viable"
            reason = (
                f"{alternative.name} is usable, but it has weaker quality or support signals than the strongest option."
            )

        notes.append(
            QualityNote(
                alternativeName=alternative.name,
                verdict=verdict,
                reason=reason,
            )
        )

        if verdict != "reject" and score > best_score:
            best_score = score
            recommended_name = alternative.name

    for alternative in market_research.alternatives:
        alternative.recommended = alternative.name == recommended_name

    return QualityReview(
        verdictSummary=(
            f"{recommended_name} is the strongest value candidate because it preserves the best quality signals "
            "while still creating meaningful savings against the requested item."
        ),
        recommendedAlternativeName=recommended_name,
        reviewNotes=notes,
    )


def _build_procurement_result(
    request: ConsensusRequest,
    market_research: MarketResearch,
    quality_review: QualityReview,
) -> ProcurementResult:
    selected = next(
        alt for alt in market_research.alternatives if alt.name == quality_review.recommendedAlternativeName
    )
    savings = _round_money(max(request.budget - selected.price, 0))
    savings_percent = int(round((savings / request.budget) * 100)) if request.budget > 0 else 0
    return ProcurementResult(
        originalItem=request.item,
        originalPrice=_round_money(request.budget),
        recommendedItem=selected.name,
        recommendedPrice=selected.price,
        savings=savings,
        savingsPercent=savings_percent,
        rationale=(
            f"{selected.name} is the recommended purchase because it delivers the cleanest balance of cost, warranty, and review quality. "
            f"It saves ${savings:.2f} versus the original request while avoiding the failure risk of ultra-cheap substitutes."
        ),
        alternatives=market_research.alternatives,
        sourceLink=str(market_research.exact_item.get("link") or selected.link or ""),
        sourceAsin=str(market_research.exact_item.get("asin") or selected.asin or ""),
        sourceThumbnail=str(market_research.exact_item.get("thumbnail") or selected.thumbnail or ""),
    )


@tool
def market_scraper_lookup(item: str, budget: float, justification: str = "") -> str:
    """Research the requested item and return a baseline plus cheaper alternatives as JSON."""
    try:
        result = _build_live_catalog(item=item, budget=budget)
    except Exception as error:
        result = _build_catalog(item=item, budget=budget)
        result.fallback_reason = str(error)
        result.summary = (
            f"{result.summary} Live Amazon search was unavailable, so ConsensusBuy used the internal fallback catalog. "
            f"Reason: {error}"
        )
    payload = result.model_dump()
    payload["justification_considered"] = justification or "Not provided"
    return json.dumps(payload)


@tool
def quality_analyst_review(market_research_json: str) -> str:
    """Evaluate the alternatives in the market research JSON and return a quality review as JSON."""
    market_research = MarketResearch.model_validate_json(market_research_json)
    return _evaluate_quality(market_research).model_dump_json()


@tool
def procurement_director_decision(
    item: str,
    budget: float,
    justification: str,
    market_research_json: str,
    quality_review_json: str,
) -> str:
    """Create the final procurement recommendation JSON using the research and quality review."""
    market_research = MarketResearch.model_validate_json(market_research_json)
    quality_review = QualityReview.model_validate_json(quality_review_json)
    request = ConsensusRequest(item=item, budget=budget, justification=justification)
    result = _build_procurement_result(request, market_research, quality_review)
    payload = DirectorPayload(
        scraperSummary=market_research.summary,
        qualitySummary=quality_review.verdictSummary,
        qualityNotes=quality_review.reviewNotes,
        result=result,
    )
    return payload.model_dump_json()


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if fenced:
        cleaned = fenced.group(1)

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for index, character in enumerate(cleaned):
        if character != "{":
            continue
        try:
            parsed, _end = decoder.raw_decode(cleaned[index:])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError("Deep Agents response did not contain valid JSON")


def _message_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str):
                text_parts.append(part["text"])
        return "\n".join(text_parts)
    return str(content)


def _build_model() -> ChatOpenAI | None:
    api_key = os.getenv("MINIMAX_API_KEY")
    base_url = os.getenv("MINIMAX_BASE_URL")
    model_name = os.getenv("MINIMAX_MODEL", "MiniMax-M1")
    if not api_key or not base_url:
        return None

    return ChatOpenAI(
        api_key=api_key,
        base_url=base_url,
        model=model_name,
        temperature=0.1,
    )


@lru_cache(maxsize=1)
def _build_deep_agent():
    model = _build_model()
    if model is None:
        return None

    subagents = [
        {
            "name": "market-scraper",
            "description": "Finds the exact requested item and 3 to 4 cheaper category alternatives.",
            "system_prompt": "You are the Market Scraper. Use your tool to produce concise market research for procurement.",
            "tools": [market_scraper_lookup],
        },
        {
            "name": "quality-analyst",
            "description": "Rejects low-quality substitutes and identifies the strongest value option.",
            "system_prompt": "You are the Quality Analyst. Use your tool to prevent the company from buying cheap garbage.",
            "tools": [quality_analyst_review],
        },
        {
            "name": "procurement-director",
            "description": "Makes the final business recommendation for CFO approval.",
            "system_prompt": "You are the Procurement Director. Use your tool to create a CFO-ready recommendation.",
            "tools": [procurement_director_decision],
        },
    ]

    return create_deep_agent(
        model=model,
        system_prompt=(
            "You coordinate the ConsensusBuy procurement board meeting. "
            "Always plan briefly, then delegate to the market-scraper, then the quality-analyst, then the procurement-director. "
            "Return only valid JSON with keys scraperSummary, qualitySummary, qualityNotes, and result. "
            "Do not include markdown."
        ),
        subagents=subagents,
    )


def _fallback_response(request: ConsensusRequest) -> ConsensusResponse:
    market_research = _build_catalog(request.item, request.budget)
    quality_review = _evaluate_quality(market_research)
    result = _build_procurement_result(request, market_research, quality_review)
    return ConsensusResponse(
        logs=[
            AgentLogEntry(
                id="log-1",
                agent="scraper",
                agentName="Market Scraper",
                message=market_research.summary,
                type="thinking",
            ),
            AgentLogEntry(
                id="log-2",
                agent="scraper",
                agentName="Market Scraper",
                message="Passed four alternatives to the Quality Analyst for durability screening.",
                type="result",
            ),
            AgentLogEntry(
                id="log-3",
                agent="quality",
                agentName="Quality Analyst",
                message=quality_review.reviewNotes[0].reason,
                type="debate",
            ),
            AgentLogEntry(
                id="log-4",
                agent="quality",
                agentName="Quality Analyst",
                message=quality_review.verdictSummary,
                type="result",
            ),
            AgentLogEntry(
                id="log-5",
                agent="director",
                agentName="Procurement Director",
                message=(
                    f"Original request: ${request.budget:.2f}. Recommendation: {result.recommendedItem} at "
                    f"${result.recommendedPrice:.2f}. Savings: ${result.savings:.2f}."
                ),
                type="result",
            ),
        ],
        result=result,
        metadata=ConsensusMetadata(
            provider="fallback",
            model="heuristic-fallback",
            executionMode="local-fallback",
            requestedMode=request.mode,
            marketSource=market_research.source,
            scraperFallbackReason=market_research.fallback_reason,
        ),
    )


def _live_market_heuristic_response(request: ConsensusRequest) -> ConsensusResponse:
    market_research = _build_live_catalog(request.item, request.budget)
    quality_review = _evaluate_quality(market_research)
    result = _build_procurement_result(request, market_research, quality_review)

    notes = quality_review.reviewNotes[:3]
    logs = [
        AgentLogEntry(
            id="log-1",
            agent="scraper",
            agentName="Market Scraper",
            message=market_research.summary,
            type="thinking",
        ),
        AgentLogEntry(
            id="log-2",
            agent="scraper",
            agentName="Market Scraper",
            message=(
                f"Baseline ASIN {market_research.exact_item.get('asin', 'unknown')} plus "
                f"{len(market_research.alternatives)} cheaper live Amazon options queued for review."
            ),
            type="result",
        ),
        *[
            AgentLogEntry(
                id=f"log-q-{index}",
                agent="quality",
                agentName="Quality Analyst",
                message=f"{note.alternativeName}: {note.reason}",
                type="debate",
            )
            for index, note in enumerate(notes, start=1)
        ],
        AgentLogEntry(
            id="log-3",
            agent="quality",
            agentName="Quality Analyst",
            message=quality_review.verdictSummary,
            type="result",
        ),
        AgentLogEntry(
            id="log-4",
            agent="director",
            agentName="Procurement Director",
            message=(
                f"Original request: ${request.budget:.2f}. Recommendation: {result.recommendedItem} "
                f"at ${result.recommendedPrice:.2f}. Savings: ${result.savings:.2f}."
            ),
            type="result",
        ),
    ]

    return ConsensusResponse(
        logs=logs,
        result=result,
        metadata=ConsensusMetadata(
            provider="searchapi",
            model="searchapi+heuristics",
            executionMode="live-market-heuristic",
            requestedMode=request.mode,
            marketSource=market_research.source,
            scraperFallbackReason=market_research.fallback_reason,
        ),
    )


def _degraded_live_market_heuristic_response(request: ConsensusRequest, reason: str) -> ConsensusResponse:
    response = _live_market_heuristic_response(request)
    existing_reason = response.metadata.scraperFallbackReason
    combined_reason = reason if not existing_reason else f"{reason} Search fallback detail: {existing_reason}"
    return response.model_copy(
        update={
            "metadata": response.metadata.model_copy(
                update={
                    "requestedMode": request.mode,
                    "degradedFromMode": "deep-agents",
                    "scraperFallbackReason": combined_reason,
                }
            )
        }
    )


def build_live_market_heuristic_response(request: ConsensusRequest) -> ConsensusResponse:
    return _live_market_heuristic_response(request)


async def stream_live_market_heuristic_events(
    request: ConsensusRequest,
) -> AsyncIterator[dict[str, Any]]:
    yield {
        "event": "progress",
        "data": {
            "agent": "scraper",
            "message": "Deep Agent is planning the request and preparing a live Amazon market search.",
        },
    }

    market_research = _build_live_catalog(request.item, request.budget)
    yield {
        "event": "log",
        "data": AgentLogEntry(
            id="stream-log-1",
            agent="scraper",
            agentName="Market Scraper",
            message=market_research.summary,
            type="thinking",
        ).model_dump(),
    }
    yield {
        "event": "progress",
        "data": {
            "agent": "quality",
            "message": "Quality Analyst is comparing ratings, reviews, warranties, and availability signals.",
        },
    }

    quality_review = _evaluate_quality(market_research)
    for index, note in enumerate(quality_review.reviewNotes[:3], start=1):
        yield {
            "event": "log",
            "data": AgentLogEntry(
                id=f"stream-q-{index}",
                agent="quality",
                agentName="Quality Analyst",
                message=f"{note.alternativeName}: {note.reason}",
                type="debate",
            ).model_dump(),
        }

    yield {
        "event": "log",
        "data": AgentLogEntry(
            id="stream-log-2",
            agent="quality",
            agentName="Quality Analyst",
            message=quality_review.verdictSummary,
            type="result",
        ).model_dump(),
    }
    yield {
        "event": "progress",
        "data": {
            "agent": "director",
            "message": "Procurement Director is drafting the final recommendation and savings summary.",
        },
    }

    result = _build_procurement_result(request, market_research, quality_review)
    response = ConsensusResponse(
        logs=[
            AgentLogEntry(
                id="log-1",
                agent="scraper",
                agentName="Market Scraper",
                message=market_research.summary,
                type="thinking",
            ),
            AgentLogEntry(
                id="log-2",
                agent="scraper",
                agentName="Market Scraper",
                message=(
                    f"Baseline ASIN {market_research.exact_item.get('asin', 'unknown')} plus "
                    f"{len(market_research.alternatives)} cheaper live Amazon options queued for review."
                ),
                type="result",
            ),
            *[
                AgentLogEntry(
                    id=f"log-q-{index}",
                    agent="quality",
                    agentName="Quality Analyst",
                    message=f"{note.alternativeName}: {note.reason}",
                    type="debate",
                )
                for index, note in enumerate(quality_review.reviewNotes[:3], start=1)
            ],
            AgentLogEntry(
                id="log-3",
                agent="quality",
                agentName="Quality Analyst",
                message=quality_review.verdictSummary,
                type="result",
            ),
            AgentLogEntry(
                id="log-4",
                agent="director",
                agentName="Procurement Director",
                message=(
                    f"Original request: ${request.budget:.2f}. Recommendation: {result.recommendedItem} "
                    f"at ${result.recommendedPrice:.2f}. Savings: ${result.savings:.2f}."
                ),
                type="result",
            ),
        ],
        result=result,
        metadata=ConsensusMetadata(
            provider="searchapi",
            model="searchapi+heuristics",
            executionMode="live-market-heuristic",
            requestedMode=request.mode,
            marketSource=market_research.source,
            scraperFallbackReason=market_research.fallback_reason,
        ),
    )

    yield {
        "event": "log",
        "data": AgentLogEntry(
            id="stream-log-3",
            agent="director",
            agentName="Procurement Director",
            message=(
                f"Original request: ${request.budget:.2f}. Recommendation: {result.recommendedItem} "
                f"at ${result.recommendedPrice:.2f}. Savings: ${result.savings:.2f}."
            ),
            type="result",
        ).model_dump(),
    }
    yield {
        "event": "final",
        "data": response.model_dump(),
    }


async def _invoke_n8n(request: ConsensusRequest, webhook_url: str) -> ConsensusResponse:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(webhook_url, json=request.model_dump())

    response.raise_for_status()
    payload = response.json()
    return ConsensusResponse.model_validate(payload)


async def run_consensus_workflow(request: ConsensusRequest) -> ConsensusResponse:
    webhook_url = os.getenv("N8N_CONSENSUS_WEBHOOK_URL")
    if webhook_url and request.mode == "deep-agents":
        response = await _invoke_n8n(request, webhook_url)
        return response.model_copy(
            update={
                "metadata": ConsensusMetadata(
                    provider="n8n",
                    model=response.metadata.model,
                    executionMode="n8n-webhook",
                    requestedMode=request.mode,
                    marketSource="n8n",
                    scraperFallbackReason=response.metadata.scraperFallbackReason,
                )
            }
        )

    if request.mode == "live-amazon":
        try:
            return _live_market_heuristic_response(request)
        except Exception as error:
            fallback = _fallback_response(request)
            return fallback.model_copy(
                update={
                    "metadata": fallback.metadata.model_copy(
                        update={
                            "requestedMode": request.mode,
                            "scraperFallbackReason": str(error),
                        }
                    )
                }
            )

    agent = _build_deep_agent()
    if agent is None:
        if _searchapi_key():
            try:
                return _degraded_live_market_heuristic_response(
                    request,
                    "Deep Agents model is not configured, so ConsensusBuy degraded to Live Amazon mode.",
                )
            except Exception:
                pass
        return _fallback_response(request)

    model_name = os.getenv("MINIMAX_MODEL", "MiniMax-M1")
    prompt = (
        "Run the ConsensusBuy procurement workflow.\n"
        f"Requested item: {request.item}\n"
        f"Budget: ${request.budget:.2f}\n"
        f"Business justification: {request.justification or 'Not provided'}\n\n"
        "Use the specialist subagents in order: market-scraper, quality-analyst, procurement-director.\n"
        "Return only valid JSON with this shape:\n"
        "{\n"
        '  "scraperSummary": "string",\n'
        '  "qualitySummary": "string",\n'
        '  "qualityNotes": [{"alternativeName": "string", "verdict": "reject|viable|strong", "reason": "string"}],\n'
        '  "result": {\n'
        '    "originalItem": "string", "originalPrice": 0, "recommendedItem": "string", "recommendedPrice": 0,\n'
        '    "savings": 0, "savingsPercent": 0, "rationale": "string", "alternatives": []\n'
        "  }\n"
        "}"
    )
    try:
        state = await asyncio.wait_for(
            agent.ainvoke({"messages": [{"role": "user", "content": prompt}]}),
            timeout=DEEP_AGENTS_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        if _searchapi_key():
            return _degraded_live_market_heuristic_response(
                request,
                f"Deep Agents timed out after {int(DEEP_AGENTS_TIMEOUT_SECONDS)} seconds, so ConsensusBuy degraded to Live Amazon mode.",
            )
        fallback = _fallback_response(request)
        return fallback.model_copy(
            update={
                "metadata": fallback.metadata.model_copy(
                    update={
                        "requestedMode": request.mode,
                        "degradedFromMode": "deep-agents",
                        "scraperFallbackReason": f"Deep Agents timed out after {int(DEEP_AGENTS_TIMEOUT_SECONDS)} seconds.",
                    }
                )
            }
        )
    except Exception as error:
        if _searchapi_key():
            return _degraded_live_market_heuristic_response(
                request,
                f"Deep Agents failed with {error.__class__.__name__}: {error}. ConsensusBuy degraded to Live Amazon mode.",
            )
        fallback = _fallback_response(request)
        return fallback.model_copy(
            update={
                "metadata": fallback.metadata.model_copy(
                    update={
                        "requestedMode": request.mode,
                        "degradedFromMode": "deep-agents",
                        "scraperFallbackReason": f"Deep Agents failed with {error.__class__.__name__}: {error}",
                    }
                )
            }
        )

    messages = state.get("messages", [])
    if not messages:
        raise ValueError("Deep Agents returned no messages")

    final_message = _message_text(messages[-1].content)
    parsed = DirectorPayload.model_validate(_extract_json(final_message))
    market_research_json = market_scraper_lookup.invoke(
        {"item": request.item, "budget": request.budget, "justification": request.justification}
    )
    market_research = MarketResearch.model_validate_json(market_research_json)

    logs = [
        AgentLogEntry(
            id="log-1",
            agent="scraper",
            agentName="Market Scraper",
            message=market_research.summary,
            type="thinking",
        ),
        AgentLogEntry(
            id="log-1b",
            agent="scraper",
            agentName="Market Scraper",
            message=(
                "Live Amazon SearchAPI research used."
                if market_research.source == "live-amazon-searchapi"
                else f"Fallback catalog used because live Amazon search failed: {market_research.fallback_reason}"
            ),
            type="result",
        ),
        AgentLogEntry(
            id="log-2",
            agent="quality",
            agentName="Quality Analyst",
            message=parsed.qualityNotes[0].reason if parsed.qualityNotes else parsed.qualitySummary,
            type="debate",
        ),
        AgentLogEntry(
            id="log-3",
            agent="quality",
            agentName="Quality Analyst",
            message=parsed.qualitySummary,
            type="result",
        ),
        AgentLogEntry(
            id="log-4",
            agent="director",
            agentName="Procurement Director",
            message=(
                f"Original request: ${request.budget:.2f}. Recommendation: {parsed.result.recommendedItem} "
                f"at ${parsed.result.recommendedPrice:.2f}. Savings: ${parsed.result.savings:.2f}."
            ),
            type="result",
        ),
    ]

    return ConsensusResponse(
        logs=logs,
        result=parsed.result,
        metadata=ConsensusMetadata(
            provider="deepagents",
            model=model_name,
            executionMode="local-deepagents",
            requestedMode=request.mode,
            marketSource=market_research.source,
            scraperFallbackReason=market_research.fallback_reason,
        ),
    )
