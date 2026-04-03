import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Search, Shield, Briefcase } from "lucide-react";
import { AgentLogEntry, AgentRole } from "@/lib/consensusTypes";

const AGENT_CONFIG: Record<AgentRole, { icon: typeof Bot; colorClass: string; dotColor: string; bubbleClass: string; label: string }> = {
  scraper: {
    icon: Search,
    colorClass: "text-agent-scraper",
    dotColor: "bg-agent-scraper",
    bubbleClass: "bg-agent-scraper/10 border-agent-scraper/20",
    label: "Market Scraper",
  },
  quality: {
    icon: Shield,
    colorClass: "text-agent-quality",
    dotColor: "bg-agent-quality",
    bubbleClass: "bg-agent-quality/10 border-agent-quality/20",
    label: "Quality Analyst",
  },
  director: {
    icon: Briefcase,
    colorClass: "text-agent-director",
    dotColor: "bg-agent-director",
    bubbleClass: "bg-agent-director/10 border-agent-director/20",
    label: "Procurement Director",
  },
};

interface AgentLogProps {
  entries: AgentLogEntry[];
  activeAgent: AgentRole | null;
  isProcessing?: boolean;
  processingHint?: string | null;
}

export function AgentLog({ entries, activeAgent, isProcessing = false, processingHint = null }: AgentLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">Agent Consensus Log</h2>
        </div>
        <div className="flex items-center gap-3">
          {(["scraper", "quality", "director"] as AgentRole[]).map((role) => {
            const config = AGENT_CONFIG[role];
            return (
              <div key={role} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${config.dotColor} ${activeAgent === role ? "animate-pulse-dot" : "opacity-40"}`} />
                <span className={`text-xs font-mono ${activeAgent === role ? config.colorClass : "text-muted-foreground"}`}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
        {entries.length === 0 && !isProcessing && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <Bot className="h-8 w-8 mx-auto opacity-30" />
              <p>Awaiting procurement request...</p>
              <p className="text-xs opacity-60">Consensus will appear here as a live group chat between the three agents</p>
            </div>
          </div>
        )}

        {entries.length === 0 && isProcessing && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Deep Agent Status</div>
              <div className="mt-2 text-sm text-foreground">
                {processingHint ?? "Deep Agent is planning the procurement workflow."}
              </div>
            </div>

            {([
              {
                role: "scraper" as AgentRole,
                title: "Plan + Search",
                detail: "Planning the workflow and gathering real Amazon candidates.",
              },
              {
                role: "quality" as AgentRole,
                title: "Compare Quality",
                detail: "Checking ratings, review volume, durability, and warranty signals.",
              },
              {
                role: "director" as AgentRole,
                title: "Write Recommendation",
                detail: "Preparing the final CFO-ready recommendation and savings summary.",
              },
            ]).map((step) => {
              const isActive = activeAgent === step.role;
              const isCompleted =
                (step.role === "scraper" && activeAgent !== "scraper" && activeAgent !== null) ||
                (step.role === "quality" && activeAgent === "director");

              return (
                <div
                  key={step.role}
                  className={`rounded-lg border p-3 ${
                    isActive
                      ? "border-primary/30 bg-primary/10"
                      : isCompleted
                        ? "border-agent-quality/20 bg-agent-quality/10"
                        : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{step.detail}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? AGENT_CONFIG[step.role].dotColor : isCompleted ? "bg-agent-quality" : "bg-muted"
                        } ${isActive ? "animate-pulse-dot" : ""}`}
                      />
                      <span className={`text-[10px] uppercase tracking-wider ${isActive ? AGENT_CONFIG[step.role].colorClass : "text-muted-foreground"}`}>
                        {isActive ? "active" : isCompleted ? "done" : "queued"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {entries.map((entry) => {
            const config = AGENT_CONFIG[entry.agent];
            const Icon = config.icon;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 py-1.5"
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border mt-0.5 ${config.bubbleClass}`}>
                  <Icon className={`h-3.5 w-3.5 ${config.colorClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <span className={`font-semibold ${config.colorClass}`}>{entry.agentName}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {entry.type === "thinking" ? "Thinking" : entry.type === "debate" ? "Debate" : "Decision"}
                    </span>
                  </div>
                  <div className={`max-w-[92%] rounded-2xl border px-3 py-2 leading-relaxed ${config.bubbleClass}`}>
                    <span className={entry.type === "result" ? "text-foreground" : "text-foreground/90"}>
                      {entry.message}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activeAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 py-2"
          >
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${AGENT_CONFIG[activeAgent].bubbleClass}`}>
              {(() => {
                const ActiveIcon = AGENT_CONFIG[activeAgent].icon;
                return <ActiveIcon className={`h-3.5 w-3.5 ${AGENT_CONFIG[activeAgent].colorClass}`} />;
              })()}
            </div>
            <div className={`rounded-2xl border px-3 py-2 ${AGENT_CONFIG[activeAgent].bubbleClass}`}>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${AGENT_CONFIG[activeAgent].colorClass}`}>{AGENT_CONFIG[activeAgent].label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Typing</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${AGENT_CONFIG[activeAgent].dotColor} animate-pulse-dot`} />
                <span className={`h-1.5 w-1.5 rounded-full ${AGENT_CONFIG[activeAgent].dotColor} animate-pulse-dot`} style={{ animationDelay: "0.2s" }} />
                <span className={`h-1.5 w-1.5 rounded-full ${AGENT_CONFIG[activeAgent].dotColor} animate-pulse-dot`} style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
