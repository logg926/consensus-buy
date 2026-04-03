export type AgentRole = "scraper" | "quality" | "director";

export interface AgentLogEntry {
  id: string;
  agent: AgentRole;
  agentName: string;
  message: string;
  timestamp: number;
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
}

const AGENT_NAMES: Record<AgentRole, string> = {
  scraper: "Market Scraper",
  quality: "Quality Analyst",
  director: "Procurement Director",
};

export function getAgentName(role: AgentRole) {
  return AGENT_NAMES[role];
}

export function generateMockDebate(item: string, budget: number): { logs: AgentLogEntry[]; result: ProcurementResult } {
  const logs: AgentLogEntry[] = [
    { id: "1", agent: "scraper", agentName: AGENT_NAMES.scraper, message: `Initiating market scan for "${item}" at $${budget}...`, timestamp: 0, type: "thinking" },
    { id: "2", agent: "scraper", agentName: AGENT_NAMES.scraper, message: `Found exact match on Amazon: ${item} — $${budget}. Now searching for alternatives in the same category...`, timestamp: 1500, type: "thinking" },
    { id: "3", agent: "scraper", agentName: AGENT_NAMES.scraper, message: `Identified 4 alternatives ranging from $${Math.round(budget * 0.25)} to $${Math.round(budget * 0.75)}. Passing product matrix to Quality Analyst.`, timestamp: 3000, type: "result" },
    { id: "4", agent: "quality", agentName: AGENT_NAMES.quality, message: `Received ${4} alternatives. Beginning spec comparison and review analysis...`, timestamp: 4500, type: "thinking" },
    { id: "5", agent: "quality", agentName: AGENT_NAMES.quality, message: `⚠️ Alternative A ($${Math.round(budget * 0.25)}): REJECTED — 2.1★ rating, multiple reports of structural failure within 3 months. Not enterprise-grade.`, timestamp: 6000, type: "debate" },
    { id: "6", agent: "quality", agentName: AGENT_NAMES.quality, message: `✓ Alternative B ($${Math.round(budget * 0.35)}): VIABLE — 4.2★ rating, 3-year warranty, meets 78% of original specs. Minor: no insulated lid.`, timestamp: 7500, type: "debate" },
    { id: "7", agent: "quality", agentName: AGENT_NAMES.quality, message: `✓✓ Alternative C ($${Math.round(budget * 0.45)}): STRONG — 4.6★ rating, 5-year warranty, meets 92% of original specs. Commercial-grade materials.`, timestamp: 9000, type: "debate" },
    { id: "8", agent: "quality", agentName: AGENT_NAMES.quality, message: `Quality analysis complete. Recommending Alternative C as the optimal price/quality intersection. Forwarding to Procurement Director.`, timestamp: 10500, type: "result" },
    { id: "9", agent: "director", agentName: AGENT_NAMES.director, message: `Reviewing market data and quality assessment. Cross-referencing with company procurement policies...`, timestamp: 12000, type: "thinking" },
    { id: "10", agent: "director", agentName: AGENT_NAMES.director, message: `Alternative C saves $${Math.round(budget * 0.55)} (${Math.round(55)}%) while maintaining 92% spec coverage and superior warranty. ROI analysis: payback improvement of 2.2x.`, timestamp: 13500, type: "debate" },
    { id: "11", agent: "director", agentName: AGENT_NAMES.director, message: `CONSENSUS REACHED. Submitting final recommendation to CFO for approval.`, timestamp: 15000, type: "result" },
  ];

  const result: ProcurementResult = {
    originalItem: item,
    originalPrice: budget,
    recommendedItem: `${item.split(" ").slice(-1)[0]} Pro Alternative`,
    recommendedPrice: Math.round(budget * 0.45),
    savings: Math.round(budget * 0.55),
    savingsPercent: 55,
    rationale: `Alternative C delivers 92% of the original specification at 45% of the cost, with a superior 5-year warranty and 4.6★ customer rating across 2,847 verified reviews. The $${Math.round(budget * 0.55)} savings can be reallocated to Q3 operational budget.`,
    alternatives: [
      { name: "Budget Option A", price: Math.round(budget * 0.25), rating: 2.1, warranty: "90 days", pros: ["Cheapest option"], cons: ["Poor durability", "Low ratings", "No warranty"], recommended: false },
      { name: "Value Option B", price: Math.round(budget * 0.35), rating: 4.2, warranty: "3 years", pros: ["Good value", "Decent reviews"], cons: ["Missing insulated lid", "78% spec match"], recommended: false },
      { name: "Pro Alternative C", price: Math.round(budget * 0.45), rating: 4.6, warranty: "5 years", pros: ["92% spec match", "Commercial-grade", "Best warranty"], cons: ["Slightly heavier"], recommended: true },
      { name: "Premium Option D", price: Math.round(budget * 0.75), rating: 4.4, warranty: "3 years", pros: ["Well-known brand", "Good specs"], cons: ["Overpriced for specs", "Shorter warranty than C"], recommended: false },
    ],
  };

  return { logs, result };
}
