import type { ConsensusResponse } from "@/lib/consensusTypes";

export function createMockConsensusFallback(
  item: string,
  budget: number,
  justification: string,
): ConsensusResponse {
  const recommendedPrice = Math.round(budget * 0.42);
  const savings = Math.max(budget - recommendedPrice, 0);

  return {
    logs: [
      {
        id: "fallback-1",
        agent: "scraper",
        agentName: "Market Scraper",
        message: `Searching for "${item}" and lower-cost category alternatives under $${budget}.`,
        type: "thinking",
      },
      {
        id: "fallback-2",
        agent: "scraper",
        agentName: "Market Scraper",
        message: "Found one exact-match baseline and three cheaper alternatives with credible review volume.",
        type: "result",
      },
      {
        id: "fallback-3",
        agent: "quality",
        agentName: "Quality Analyst",
        message: "Rejecting the cheapest option due to repeated durability complaints and weak warranty support.",
        type: "debate",
      },
      {
        id: "fallback-4",
        agent: "quality",
        agentName: "Quality Analyst",
        message: "The mid-priced business-grade option preserves most requested functionality while avoiding obvious failure-risk tradeoffs.",
        type: "result",
      },
      {
        id: "fallback-5",
        agent: "director",
        agentName: "Procurement Director",
        message:
          `Recommendation ready. Original request: $${budget}. Selected value option: $${recommendedPrice}. ` +
          `It saves the company $${savings} and still meets enterprise durability expectations.`,
        type: "result",
      },
    ],
    result: {
      originalItem: item,
      originalPrice: budget,
      recommendedItem: `${item} Consensus Option`,
      recommendedPrice,
      savings,
      savingsPercent: budget > 0 ? Math.round((savings / budget) * 100) : 0,
      rationale:
        `ConsensusBuy balanced price, review quality, and warranty coverage against the stated business need. ` +
        `${justification ? `The request justification was considered: ${justification}. ` : ""}` +
        `The chosen option avoids the cheap-failure category while still producing material savings.`,
      alternatives: [
        {
          name: `${item} Budget Clone`,
          price: Math.round(budget * 0.25),
          rating: 2.2,
          warranty: "90 days",
          pros: ["Lowest upfront cost"],
          cons: ["Low review confidence", "Durability complaints", "Weak support"],
          link: "https://www.amazon.com/",
        },
        {
          name: `${item} Practical Alternative`,
          price: Math.round(budget * 0.34),
          rating: 4.1,
          warranty: "2 years",
          pros: ["Reasonable price", "Good enough for light-duty use"],
          cons: ["Lower spec coverage", "Average materials"],
          link: "https://www.amazon.com/",
        },
        {
          name: `${item} Consensus Option`,
          price: recommendedPrice,
          rating: 4.6,
          warranty: "5 years",
          pros: ["Best balance of cost and durability", "High review confidence", "Long warranty"],
          cons: ["Less brand prestige"],
          recommended: true,
          link: "https://www.amazon.com/",
        },
        {
          name: `${item} Premium Adjacent`,
          price: Math.round(budget * 0.72),
          rating: 4.4,
          warranty: "3 years",
          pros: ["Strong features", "Known vendor"],
          cons: ["Savings not compelling enough"],
          link: "https://www.amazon.com/",
        },
      ],
      sourceLink: "https://www.amazon.com/",
    },
    metadata: {
      provider: "fallback",
      model: "frontend-fallback",
      executionMode: "local-fallback",
      requestedMode: "live-amazon",
    },
  };
}
