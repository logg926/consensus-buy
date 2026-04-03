import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, TrendingDown, Star, Shield, ExternalLink, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcurementResult } from "@/lib/mockAgentData";
import { useState, useEffect } from "react";
import { ConsensusConfetti } from "@/components/ConsensusConfetti";

export interface QueuedRequest {
  id: string;
  result: ProcurementResult;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  requester: string;
}

interface ApprovalPanelProps {
  queue: QueuedRequest[];
  isProcessing: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  latestResultId?: string | null;
}

const MOCK_REQUESTERS = ["Sarah Chen", "Mike Johnson", "Priya Patel", "Alex Rivera"];

export function ApprovalPanel({ queue, isProcessing, onApprove, onReject, latestResultId }: ApprovalPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const pendingQueue = queue.filter((q) => q.status === "pending");
  const selected = queue.find((q) => q.id === selectedId);

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

  const result = selected?.result ?? null;
  const isPending = selected?.status === "pending";

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
        {queue.length > 1 && (
          <div className="px-4 pt-3 pb-1 space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2">Approval Queue</div>
            {queue.map((item) => (
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
          {!result && !isProcessing && queue.length === 0 && (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <Shield className="h-8 w-8 mx-auto opacity-30" />
                <p>No requests pending</p>
                <p className="text-xs opacity-60">Submit a purchase request to begin</p>
              </div>
            </div>
          )}

          {isProcessing && !result && queue.length === 0 && (
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

                {/* Alternatives */}
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Alternatives</div>
                  {result.alternatives.map((alt) => (
                    <div
                      key={alt.name}
                      className={`flex items-center justify-between py-1.5 px-2.5 rounded-md text-xs ${
                        alt.recommended ? "bg-agent-quality/10 border border-agent-quality/20" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {alt.recommended && <CheckCircle2 className="h-3 w-3 text-agent-quality" />}
                        <span className={alt.recommended ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {alt.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-agent-scraper" />{alt.rating}
                        </span>
                        <span className="font-mono">${alt.price}</span>
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
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => { onApprove?.(selected.id); }}
                      className="flex-1 glow-primary"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Approve
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
                    <div className="text-xs text-muted-foreground">Order submitted via Crossmint</div>
                    <div className="flex items-center justify-center gap-1 text-xs text-primary">
                      <ExternalLink className="h-3 w-3" /><span>View on-chain receipt</span>
                    </div>
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
