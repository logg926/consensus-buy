import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Search, Shield, Briefcase } from "lucide-react";
import { AgentLogEntry, AgentRole } from "@/lib/mockAgentData";

const AGENT_CONFIG: Record<AgentRole, { icon: typeof Bot; colorClass: string; glowClass: string; dotColor: string }> = {
  scraper: { icon: Search, colorClass: "text-agent-scraper", glowClass: "glow-scraper", dotColor: "bg-agent-scraper" },
  quality: { icon: Shield, colorClass: "text-agent-quality", glowClass: "glow-quality", dotColor: "bg-agent-quality" },
  director: { icon: Briefcase, colorClass: "text-agent-director", glowClass: "glow-director", dotColor: "bg-agent-director" },
};

interface AgentLogProps {
  entries: AgentLogEntry[];
  activeAgent: AgentRole | null;
}

export function AgentLog({ entries, activeAgent }: AgentLogProps) {
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
        {entries.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center space-y-2">
              <Bot className="h-8 w-8 mx-auto opacity-30" />
              <p>Awaiting procurement request...</p>
              <p className="text-xs opacity-60">Three AI agents will debate the optimal purchase</p>
            </div>
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
                className={`flex gap-3 py-2 px-3 rounded-md ${entry.type === "result" ? "bg-muted/50" : ""}`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${config.colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold ${config.colorClass}`}>{entry.agentName}</span>
                  <span className="text-muted-foreground mx-1.5">›</span>
                  <span className={`${entry.type === "result" ? "text-foreground" : "text-muted-foreground"} break-words`}>
                    {entry.message}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {activeAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-2 px-3 text-muted-foreground"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${AGENT_CONFIG[activeAgent].dotColor} animate-pulse-dot`} />
            <span className={`h-1.5 w-1.5 rounded-full ${AGENT_CONFIG[activeAgent].dotColor} animate-pulse-dot`} style={{ animationDelay: "0.2s" }} />
            <span className={`h-1.5 w-1.5 rounded-full ${AGENT_CONFIG[activeAgent].dotColor} animate-pulse-dot`} style={{ animationDelay: "0.4s" }} />
            <span className="text-xs ml-1">{AGENT_CONFIG[activeAgent].colorClass.replace("text-agent-", "")} is reasoning...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
