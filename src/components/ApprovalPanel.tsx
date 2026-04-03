import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, TrendingDown, Star, Shield, ExternalLink, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrossmintExecutionRequest, CrossmintExecutionResponse, PhysicalAddress, ProcurementResult } from "@/lib/consensusTypes";
import { useState, useEffect } from "react";
import { ConsensusConfetti } from "@/components/ConsensusConfetti";

export interface QueuedRequest {
  id: string;
  result: ProcurementResult;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  requester: string;
  execution?: Partial<CrossmintExecutionRequest>;
  crossmintOrder?: CrossmintExecutionResponse;
}

interface ApprovalPanelProps {
  queue: QueuedRequest[];
  isProcessing: boolean;
  onApprove?: (id: string, execution: CrossmintExecutionRequest) => void;
  onReject?: (id: string) => void;
  latestResultId?: string | null;
  executingApprovalId?: string | null;
}

const EMPTY_ADDRESS: PhysicalAddress = {
  name: "",
  line1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

const DEMO_EXECUTION_PROFILE: CrossmintExecutionRequest = {
  productLocator: "",
  recipient: {
    email: "john.d@example.com",
    physicalAddress: {
      name: "John D",
      line1: "123 ABC Street",
      line2: "Apt 4B",
      city: "New York City",
      state: "NY",
      postalCode: "10007",
      country: "US",
    },
  },
  locale: "en-US",
};

const EXECUTION_PROFILE_STORAGE_KEY = "consensusbuy-crossmint-profile";

function readSavedExecutionProfile(): CrossmintExecutionRequest | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(EXECUTION_PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CrossmintExecutionRequest;
    if (!parsed?.recipient?.email || !parsed?.recipient?.physicalAddress?.line1) {
      return null;
    }

    return {
      productLocator: "",
      recipient: parsed.recipient,
      locale: parsed.locale ?? "en-US",
    };
  } catch {
    return null;
  }
}

function saveExecutionProfile(profile: CrossmintExecutionRequest) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    EXECUTION_PROFILE_STORAGE_KEY,
    JSON.stringify({
      recipient: profile.recipient,
      locale: profile.locale ?? "en-US",
    }),
  );
}

function mergeExecutionProfile(base?: Partial<CrossmintExecutionRequest>) {
  const source = readSavedExecutionProfile() ?? DEMO_EXECUTION_PROFILE;

  return {
    productLocator: base?.productLocator ?? "",
    recipient: {
      email: base?.recipient?.email ?? source.recipient.email,
      physicalAddress: {
        ...EMPTY_ADDRESS,
        ...source.recipient.physicalAddress,
        ...(base?.recipient?.physicalAddress ?? {}),
      },
    },
    locale: base?.locale ?? source.locale ?? "en-US",
  } satisfies CrossmintExecutionRequest;
}

function buildFallbackAmazonLink(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return "";
  }

  return `https://www.amazon.com/s?k=${encodeURIComponent(trimmed)}`;
}

export function ApprovalPanel({ queue, isProcessing, onApprove, onReject, latestResultId, executingApprovalId }: ApprovalPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [executionDraft, setExecutionDraft] = useState<CrossmintExecutionRequest>(mergeExecutionProfile());

  const safeQueue = queue ?? [];
  const pendingQueue = safeQueue.filter((q) => q.status === "pending");
  const selected = safeQueue.find((q) => q.id === selectedId);

  // Auto-select latest result when it arrives
  useEffect(() => {
    if (latestResultId) {
      setSelectedId(latestResultId);
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [latestResultId]);

  // Auto-select first pending if nothing selected
  useEffect(() => {
    if (!selectedId && pendingQueue.length > 0) {
      setSelectedId(pendingQueue[0].id);
    }
  }, [pendingQueue, selectedId]);

  useEffect(() => {
    setExecutionDraft(mergeExecutionProfile(selected?.execution));
  }, [selected?.id, selected?.execution]);

  const result = selected?.result ?? null;
  const isPending = selected?.status === "pending";
  const isExecuting = selected?.id === executingApprovalId;
  const canApprove =
    executionDraft.productLocator.trim() &&
    executionDraft.recipient.email.trim() &&
    executionDraft.recipient.physicalAddress.name.trim() &&
    executionDraft.recipient.physicalAddress.line1.trim() &&
    executionDraft.recipient.physicalAddress.city.trim() &&
    executionDraft.recipient.physicalAddress.state.trim() &&
    executionDraft.recipient.physicalAddress.postalCode.trim() &&
    executionDraft.recipient.physicalAddress.country.trim();

  const comparisonRows = result?.alternatives.map((alternative) => ({
    ...alternative,
    savings: Math.max(result.originalPrice - alternative.price, 0),
  })) ?? [];
  const recommendedAlternative = result?.alternatives.find((alternative) => alternative.recommended);
  const recommendedAmazonLink =
    recommendedAlternative?.link ||
    executionDraft.productLocator ||
    result?.sourceLink ||
    buildFallbackAmazonLink(recommendedAlternative?.name || result?.recommendedItem || result?.originalItem || "");

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <ConsensusConfetti trigger={showConfetti} />

      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">CFO Approval</h2>
        </div>
        {pendingQueue.length > 0 && (
          <span className="flex items-center gap-1 text-xs font-mono text-agent-scraper">
            <Clock className="h-3 w-3" />
            {pendingQueue.length} pending
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Queue list - always visible when there are items */}
        {safeQueue.length > 1 && (
          <div className="px-4 pt-3 pb-1 space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2">Approval Queue</div>
            {safeQueue.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full flex items-center justify-between py-2 px-3 rounded-md text-xs transition-all ${
                  selectedId === item.id
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted/20 hover:bg-muted/40"
                } ${item.status === "approved" ? "opacity-60" : ""} ${item.status === "rejected" ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.status === "pending" && <Clock className="h-3 w-3 text-agent-scraper flex-shrink-0" />}
                  {item.status === "approved" && <CheckCircle2 className="h-3 w-3 text-agent-quality flex-shrink-0" />}
                  {item.status === "rejected" && <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />}
                  <span className="truncate text-foreground">{item.result.originalItem}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-agent-quality">-${item.result.savings}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detail view */}
        <div className="p-5">
          {!result && !isProcessing && safeQueue.length === 0 && (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <Shield className="h-8 w-8 mx-auto opacity-30" />
                <p>No requests pending</p>
                <p className="text-xs opacity-60">Submit a purchase request to begin</p>
              </div>
            </div>
          )}

          {isProcessing && !result && safeQueue.length === 0 && (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
                </div>
                <p>Agents reaching consensus...</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Requester + status */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Requested by <span className="text-foreground font-medium">{selected.requester}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selected.status === "pending" ? "bg-agent-scraper/15 text-agent-scraper" :
                    selected.status === "approved" ? "bg-agent-quality/15 text-agent-quality" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {selected.status}
                  </span>
                </div>

                {/* Savings hero */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="rounded-lg bg-muted/50 border border-border p-3 glow-primary text-center"
                >
                  <TrendingDown className="h-5 w-5 text-agent-quality mx-auto mb-1" />
                  <div className="text-2xl font-bold text-agent-quality">${result.savings}</div>
                  <div className="text-xs text-muted-foreground">{result.savingsPercent}% savings</div>
                </motion.div>

                {/* Recommendation */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{result.recommendedItem}</div>
                      <div className="text-lg font-bold text-primary">${result.recommendedPrice}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground line-through">${result.originalPrice}</div>
                      <div className="text-xs text-muted-foreground">{result.originalItem}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.rationale}</p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Verify Target</div>
                      <div className="text-sm font-medium text-foreground">Open the exact Amazon item being handed off for approval</div>
                    </div>
                    {recommendedAmazonLink ? (
                      <a
                        href={recommendedAmazonLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Verify on Amazon
                      </a>
                    ) : (
                      <span className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
                        No live Amazon link
                      </span>
                    )}
                  </div>
                  {recommendedAmazonLink ? (
                    <div className="text-xs text-muted-foreground break-all">{recommendedAmazonLink}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      This result does not currently include a live Amazon product URL. The request likely used fallback data or the scraper did not return a usable product link.
                    </div>
                  )}
                </div>

                {(result.sourceLink || result.sourceThumbnail || result.sourceAsin || recommendedAmazonLink) && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Amazon Evidence</div>
                        <div className="text-sm font-medium text-foreground">Live source context for this recommendation</div>
                      </div>
                      {recommendedAmazonLink && (
                        <a
                          href={recommendedAmazonLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open on Amazon
                        </a>
                      )}
                    </div>

                    <div className="flex gap-3 rounded-md bg-background/50 p-2">
                      {result.sourceThumbnail ? (
                        <img
                          src={result.sourceThumbnail}
                          alt={result.recommendedItem}
                          className="h-20 w-20 rounded-md object-cover border border-border"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-md border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground text-center px-2">
                          Amazon preview unavailable
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm font-medium text-foreground line-clamp-2">{result.recommendedItem}</div>
                        {result.sourceAsin && (
                          <div className="text-xs text-muted-foreground font-mono">ASIN: {result.sourceAsin}</div>
                        )}
                        {recommendedAmazonLink && (
                          <div className="text-xs text-muted-foreground break-all">{recommendedAmazonLink}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground">
                          Amazon pages generally block iframe embedding, so this panel uses the live product link and preview image instead.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Decision Matrix</div>
                    <div className="text-sm font-medium text-foreground">What the agents compared before recommending a winner</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="py-2 pr-3 font-medium">Option</th>
                          <th className="py-2 pr-3 font-medium">Price</th>
                          <th className="py-2 pr-3 font-medium">Savings</th>
                          <th className="py-2 pr-3 font-medium">Rating</th>
                          <th className="py-2 pr-3 font-medium">Warranty</th>
                          <th className="py-2 pr-3 font-medium">Signal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((alternative) => (
                          <tr
                            key={`matrix-${alternative.name}`}
                            className={`border-b border-border/60 last:border-0 ${
                              alternative.recommended ? "bg-agent-quality/10" : ""
                            }`}
                          >
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2 min-w-[190px]">
                                {alternative.recommended ? <CheckCircle2 className="h-3 w-3 text-agent-quality" /> : null}
                                <span className={alternative.recommended ? "text-foreground font-medium" : "text-muted-foreground"}>
                                  {alternative.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 pr-3 font-mono text-foreground">${alternative.price}</td>
                            <td className="py-2 pr-3 font-mono text-agent-quality">${alternative.savings}</td>
                            <td className="py-2 pr-3 text-foreground">{alternative.rating}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{alternative.warranty}</td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {alternative.rating >= 4.5 ? "Strong" : alternative.rating >= 4.0 ? "Viable" : "Risky"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Crossmint Handoff</div>
                  {executionDraft.productLocator ? (
                    <a
                      href={executionDraft.productLocator}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open current order target
                    </a>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setExecutionDraft((prev) => ({
                        ...mergeExecutionProfile(),
                        productLocator: prev.productLocator,
                      }))}
                      disabled={!isPending || isExecuting}
                    >
                      Use Saved Profile
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setExecutionDraft((prev) => ({
                        ...DEMO_EXECUTION_PROFILE,
                        productLocator: prev.productLocator,
                      }))}
                      disabled={!isPending || isExecuting}
                    >
                      Use Demo Profile
                    </Button>
                  </div>
                  <Input
                    value={executionDraft.productLocator}
                    onChange={(e) => setExecutionDraft((prev) => ({ ...prev, productLocator: e.target.value }))}
                    placeholder="Amazon URL or amazon:/url: locator"
                    className="bg-muted/50 border-border"
                    disabled={!isPending || isExecuting}
                  />
                  <Input
                    value={executionDraft.recipient.email}
                    onChange={(e) => setExecutionDraft((prev) => ({
                      ...prev,
                      recipient: { ...prev.recipient, email: e.target.value },
                    }))}
                    placeholder="Recipient email"
                    className="bg-muted/50 border-border"
                    disabled={!isPending || isExecuting}
                  />
                  <Input
                    value={executionDraft.recipient.physicalAddress.name}
                    onChange={(e) => setExecutionDraft((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        physicalAddress: { ...prev.recipient.physicalAddress, name: e.target.value },
                      },
                    }))}
                    placeholder="Recipient name"
                    className="bg-muted/50 border-border"
                    disabled={!isPending || isExecuting}
                  />
                  <Input
                    value={executionDraft.recipient.physicalAddress.line1}
                    onChange={(e) => setExecutionDraft((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        physicalAddress: { ...prev.recipient.physicalAddress, line1: e.target.value },
                      },
                    }))}
                    placeholder="Address line 1"
                    className="bg-muted/50 border-border"
                    disabled={!isPending || isExecuting}
                  />
                  <Input
                    value={executionDraft.recipient.physicalAddress.line2 ?? ""}
                    onChange={(e) => setExecutionDraft((prev) => ({
                      ...prev,
                      recipient: {
                        ...prev.recipient,
                        physicalAddress: { ...prev.recipient.physicalAddress, line2: e.target.value || undefined },
                      },
                    }))}
                    placeholder="Address line 2 (optional)"
                    className="bg-muted/50 border-border"
                    disabled={!isPending || isExecuting}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={executionDraft.recipient.physicalAddress.city}
                      onChange={(e) => setExecutionDraft((prev) => ({
                        ...prev,
                        recipient: {
                          ...prev.recipient,
                          physicalAddress: { ...prev.recipient.physicalAddress, city: e.target.value },
                        },
                      }))}
                      placeholder="City"
                      className="bg-muted/50 border-border"
                      disabled={!isPending || isExecuting}
                    />
                    <Input
                      value={executionDraft.recipient.physicalAddress.state}
                      onChange={(e) => setExecutionDraft((prev) => ({
                        ...prev,
                        recipient: {
                          ...prev.recipient,
                          physicalAddress: { ...prev.recipient.physicalAddress, state: e.target.value },
                        },
                      }))}
                      placeholder="State"
                      className="bg-muted/50 border-border"
                      disabled={!isPending || isExecuting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={executionDraft.recipient.physicalAddress.postalCode}
                      onChange={(e) => setExecutionDraft((prev) => ({
                        ...prev,
                        recipient: {
                          ...prev.recipient,
                          physicalAddress: { ...prev.recipient.physicalAddress, postalCode: e.target.value },
                        },
                      }))}
                      placeholder="Postal code"
                      className="bg-muted/50 border-border"
                      disabled={!isPending || isExecuting}
                    />
                    <Input
                      value={executionDraft.recipient.physicalAddress.country}
                      onChange={(e) => setExecutionDraft((prev) => ({
                        ...prev,
                        recipient: {
                          ...prev.recipient,
                          physicalAddress: { ...prev.recipient.physicalAddress, country: e.target.value.toUpperCase() },
                        },
                      }))}
                      placeholder="Country code"
                      className="bg-muted/50 border-border"
                      disabled={!isPending || isExecuting}
                      maxLength={2}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    After the first successful order, this panel reuses the last Crossmint shipping profile automatically.
                  </div>
                </div>

                {/* Alternatives */}
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Alternatives</div>
                  {result.alternatives.map((alt) => (
                    <div
                      key={alt.name}
                      className={`py-1.5 px-2.5 rounded-md text-xs ${
                        alt.recommended ? "bg-agent-quality/10 border border-agent-quality/20" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {alt.recommended && <CheckCircle2 className="h-3 w-3 text-agent-quality" />}
                            <span className={alt.recommended ? "text-foreground font-medium" : "text-muted-foreground"}>
                              {alt.name}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            {alt.asin && <span className="font-mono">ASIN {alt.asin}</span>}
                            {alt.isPrime ? <span>Prime</span> : null}
                            {alt.availability ? <span>{alt.availability}</span> : null}
                            {alt.link ? (
                              <a href={alt.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" />
                                Amazon link
                              </a>
                            ) : null}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-md bg-background/50 p-2">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pros</div>
                              <div className="space-y-1">
                                {alt.pros.slice(0, 3).map((pro) => (
                                  <div key={pro} className="text-[11px] text-foreground">
                                    + {pro}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-md bg-background/50 p-2">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Concerns</div>
                              <div className="space-y-1">
                                {alt.cons.slice(0, 3).map((con) => (
                                  <div key={con} className="text-[11px] text-muted-foreground">
                                    - {con}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 text-agent-scraper" />{alt.rating}
                          </span>
                          <span className="font-mono">${alt.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {isPending ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => { onReject?.(selected.id); }}
                      variant="outline"
                      className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={isExecuting}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        saveExecutionProfile(executionDraft);
                        onApprove?.(selected.id, executionDraft);
                      }}
                      className="flex-1 glow-primary"
                      disabled={!canApprove || isExecuting}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {isExecuting ? "Creating Order..." : "Approve"}
                    </Button>
                  </div>
                ) : selected.status === "approved" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-agent-quality/30 bg-agent-quality/10 p-3 text-center space-y-1"
                  >
                    <CheckCircle2 className="h-5 w-5 text-agent-quality mx-auto" />
                    <div className="text-sm font-semibold text-agent-quality">Approved</div>
                    <div className="text-xs text-muted-foreground">Crossmint order created in staging</div>
                    {selected.crossmintOrder ? (
                      <div className="space-y-1 text-xs">
                        <div className="text-primary font-mono">{selected.crossmintOrder.orderId}</div>
                        <div className="text-muted-foreground">
                          phase: {selected.crossmintOrder.phase}
                          {selected.crossmintOrder.paymentStatus ? ` • payment: ${selected.crossmintOrder.paymentStatus}` : ""}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-xs text-primary">
                        <ExternalLink className="h-3 w-3" /><span>Awaiting Crossmint status</span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center space-y-1"
                  >
                    <XCircle className="h-5 w-5 text-destructive mx-auto" />
                    <div className="text-sm font-semibold text-destructive">Rejected</div>
                    <div className="text-xs text-muted-foreground">Request sent back to requester</div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
