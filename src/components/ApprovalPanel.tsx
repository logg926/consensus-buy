import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, TrendingDown, Star, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcurementResult } from "@/lib/mockAgentData";
import { useState, useEffect } from "react";
import { ConsensusConfetti } from "@/components/ConsensusConfetti";

interface ApprovalPanelProps {
  result: ProcurementResult | null;
  isProcessing: boolean;
  onApprove?: (result: ProcurementResult) => void;
}

export function ApprovalPanel({ result, isProcessing, onApprove }: ApprovalPanelProps) {
  const [approved, setApproved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset approved state when a new result comes in
  useEffect(() => {
    setApproved(false);
  }, [result]);

  // Fire confetti when result arrives (consensus reached)
  useEffect(() => {
    if (result) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleApprove = () => {
    setApproved(true);
    if (result && onApprove) onApprove(result);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <ConsensusConfetti trigger={showConfetti} />

      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Shield className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">CFO Approval</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!result && !isProcessing && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <Shield className="h-8 w-8 mx-auto opacity-30" />
              <p>No recommendation pending</p>
              <p className="text-xs opacity-60">Submit a request to begin</p>
            </div>
          </div>
        )}

        {isProcessing && !result && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
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

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-5"
            >
              {/* Consensus reached banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg border border-agent-quality/30 bg-agent-quality/5 p-3 text-center"
              >
                <div className="text-xs font-semibold text-agent-quality uppercase tracking-widest">
                  ✦ Consensus Reached ✦
                </div>
              </motion.div>

              {/* Savings hero */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="rounded-lg bg-muted/50 border border-border p-4 glow-primary text-center"
              >
                <TrendingDown className="h-6 w-6 text-agent-quality mx-auto mb-2" />
                <div className="text-3xl font-bold text-agent-quality">${result.savings}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.savingsPercent}% savings identified
                </div>
              </motion.div>

              {/* Recommendation */}
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Consensus Recommendation</div>
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

              {/* Alternatives comparison */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Alternatives Evaluated</div>
                {result.alternatives.map((alt) => (
                  <div
                    key={alt.name}
                    className={`flex items-center justify-between py-2 px-3 rounded-md text-xs ${
                      alt.recommended ? "bg-agent-quality/10 border border-agent-quality/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {alt.recommended && <CheckCircle2 className="h-3 w-3 text-agent-quality" />}
                      <span className={alt.recommended ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {alt.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-agent-scraper" />
                        {alt.rating}
                      </span>
                      <span className="font-mono">${alt.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Approval button */}
              {!approved ? (
                <Button
                  onClick={handleApprove}
                  className="w-full glow-primary"
                  size="lg"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Execute Purchase
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-agent-quality/30 bg-agent-quality/10 p-4 text-center space-y-2"
                >
                  <CheckCircle2 className="h-6 w-6 text-agent-quality mx-auto" />
                  <div className="text-sm font-semibold text-agent-quality">Purchase Approved</div>
                  <div className="text-xs text-muted-foreground">
                    Order submitted via Crossmint checkout
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-primary">
                    <ExternalLink className="h-3 w-3" />
                    <span>View on-chain receipt</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
