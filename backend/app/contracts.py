from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


AgentRole = Literal["scraper", "quality", "director"]
LogType = Literal["thinking", "result", "debate"]
ProviderType = Literal["deepagents", "searchapi", "n8n", "fallback"]
ExecutionMode = Literal["local-deepagents", "live-market-heuristic", "n8n-webhook", "local-fallback"]
MarketSource = Literal["live-amazon-searchapi", "fallback-catalog", "n8n"]
RequestMode = Literal["live-amazon", "deep-agents"]


class Alternative(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    price: float
    rating: float
    warranty: str
    pros: list[str]
    cons: list[str]
    recommended: bool = False
    asin: str | None = None
    link: str | None = None
    thumbnail: str | None = None
    availability: str | None = None
    isPrime: bool = False


class ProcurementResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    originalItem: str
    originalPrice: float
    recommendedItem: str
    recommendedPrice: float
    savings: float
    savingsPercent: int
    rationale: str
    alternatives: list[Alternative]
    sourceLink: str | None = None
    sourceAsin: str | None = None
    sourceThumbnail: str | None = None


class AgentLogEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    agent: AgentRole
    agentName: str
    message: str
    type: LogType


class ConsensusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item: str = Field(min_length=2)
    budget: float = Field(gt=0)
    justification: str = ""
    mode: RequestMode = "live-amazon"


class ConsensusMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: ProviderType
    model: str
    executionMode: ExecutionMode
    requestedMode: RequestMode
    degradedFromMode: RequestMode | None = None
    marketSource: MarketSource | None = None
    scraperFallbackReason: str | None = None


class ConsensusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    logs: list[AgentLogEntry]
    result: ProcurementResult
    metadata: ConsensusMetadata


class PhysicalAddress(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    line1: str = Field(min_length=1)
    line2: str | None = None
    city: str = Field(min_length=1)
    state: str = Field(min_length=1)
    postalCode: str = Field(min_length=1)
    country: str = Field(min_length=2, max_length=2)

    @field_validator("country")
    @classmethod
    def normalize_country(cls, value: str) -> str:
        return value.upper()


class CrossmintRecipient(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    physicalAddress: PhysicalAddress


class CrossmintOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    productLocator: str = Field(min_length=1)
    maxPrice: str | None = None
    recipient: CrossmintRecipient
    locale: str = "en-US"


class CrossmintOrderResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    orderId: str
    phase: str
    paymentStatus: str | None = None
