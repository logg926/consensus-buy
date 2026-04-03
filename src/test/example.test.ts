import { describe, it, expect } from "vitest";
import { createMockConsensusFallback } from "@/lib/mockConsensusFallback";

describe("createMockConsensusFallback", () => {
  it("returns a recommendation with material savings and a marked winner", () => {
    const response = createMockConsensusFallback(
      "Yeti Tundra 65 Hard Cooler",
      400,
      "Needed for field events",
    );

    expect(response.logs).toHaveLength(5);
    expect(response.result.savings).toBeGreaterThan(0);
    expect(response.result.alternatives.some((option) => option.recommended)).toBe(true);
    expect(response.result.rationale).toContain("Needed for field events");
  });
});
