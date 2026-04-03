import { useState } from "react";
import { motion } from "framer-motion";
import { Search, DollarSign, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ConsensusMode } from "@/lib/consensusTypes";

export interface PurchaseRequestDraft {
  item: string;
  budget: number;
  justification: string;
  mode: ConsensusMode;
}

interface RequestPanelProps {
  onSubmit: (draft: PurchaseRequestDraft) => void;
  isProcessing: boolean;
}

export function RequestPanel({ onSubmit, isProcessing }: RequestPanelProps) {
  const [item, setItem] = useState("");
  const [budget, setBudget] = useState("");
  const [justification, setJustification] = useState("");
  const [mode, setMode] = useState<ConsensusMode>("live-amazon");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !budget) {
      return;
    }

    onSubmit({
      item,
      budget: parseFloat(budget),
      justification,
      mode,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">
          Purchase Request
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-5 gap-5">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Decision Mode
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: "live-amazon" as const,
                title: "Live Amazon",
                detail: "Fast real market scan with deterministic comparison.",
              },
              {
                id: "deep-agents" as const,
                title: "Deep Agents",
                detail: "Slower board-style reasoning with timeout fallback.",
              },
            ].map((option) => {
              const isActive = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  disabled={isProcessing}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  } ${isProcessing ? "opacity-60" : ""}`}
                >
                  <div className="text-sm font-medium">{option.title}</div>
                  <div className="mt-1 text-[11px] leading-relaxed">{option.detail}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item" className="text-xs text-muted-foreground uppercase tracking-wider">
            Item Description
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="item"
              placeholder="e.g. Yeti Tundra 65 Hard Cooler"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget" className="text-xs text-muted-foreground uppercase tracking-wider">
            Requested Budget
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="budget"
              type="number"
              placeholder="400"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification" className="text-xs text-muted-foreground uppercase tracking-wider">
            Business Justification
          </Label>
          <Textarea
            id="justification"
            placeholder="Why is this purchase needed?"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="bg-muted/50 border-border resize-none min-h-[80px]"
            disabled={isProcessing}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          Crossmint details move to CFO approval. Live Amazon is the stable fast path. Deep Agents attempts the full board flow, then degrades cleanly if it times out.
        </div>

        <div className="mt-auto">
          <Button
            type="submit"
            disabled={!item || !budget || isProcessing}
            className="w-full glow-primary"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse-dot" />
                Agents Processing...
              </span>
            ) : (
              "Submit to Procurement Swarm"
            )}
          </Button>
        </div>

        {!isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">Quick demos:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { item: "Yeti Tundra 65 Hard Cooler", budget: "400" },
                { item: "Herman Miller Aeron Chair", budget: "1400" },
                { item: "Dell UltraSharp 32\" 4K Monitor", budget: "800" },
              ].map((preset) => (
                <button
                  key={preset.item}
                  type="button"
                  onClick={() => {
                    setItem(preset.item);
                    setBudget(preset.budget);
                    setJustification("Team equipment upgrade");
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  {preset.item.split(" ").slice(0, 2).join(" ")} — ${preset.budget}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
