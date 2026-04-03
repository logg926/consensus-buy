export type AgentRole = "scraper" | "quality" | "director";
export type ConsensusMode = "live-amazon" | "deep-agents";

export interface AgentLogEntry {
  id: string;
  agent: AgentRole;
  agentName: string;
  message: string;
  type: "thinking" | "result" | "debate";
}

export interface Alternative {
  name: string;
  price: number;
  rating: number;
  warranty: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  asin?: string;
  link?: string;
  thumbnail?: string;
  availability?: string;
  isPrime?: boolean;
}

export interface ProcurementResult {
  originalItem: string;
  originalPrice: number;
  recommendedItem: string;
  recommendedPrice: number;
  savings: number;
  savingsPercent: number;
  rationale: string;
  alternatives: Alternative[];
  sourceLink?: string;
  sourceAsin?: string;
  sourceThumbnail?: string;
}

export interface ConsensusResponse {
  logs: AgentLogEntry[];
  result: ProcurementResult;
  metadata: {
    provider: "deepagents" | "searchapi" | "n8n" | "fallback";
    model: string;
    executionMode: "local-deepagents" | "live-market-heuristic" | "n8n-webhook" | "local-fallback";
    requestedMode: ConsensusMode;
    degradedFromMode?: ConsensusMode | null;
    marketSource?: "live-amazon-searchapi" | "fallback-catalog" | "n8n";
    scraperFallbackReason?: string;
  };
}

export interface ConsensusProgressEvent {
  agent: AgentRole;
  message: string;
}

export interface PhysicalAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CrossmintExecutionRequest {
  productLocator: string;
  maxPrice?: string;
  recipient: {
    email: string;
    physicalAddress: PhysicalAddress;
  };
  locale?: string;
}

export interface CrossmintExecutionResponse {
  orderId: string;
  phase: string;
  paymentStatus?: string;
}
