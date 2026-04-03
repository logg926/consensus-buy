import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { RequestPanel } from "@/components/RequestPanel";
import { AgentLog } from "@/components/AgentLog";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { generateMockDebate, AgentLogEntry, AgentRole, ProcurementResult } from "@/lib/mockAgentData";

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logEntries, setLogEntries] = useState<AgentLogEntry[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [result, setResult] = useState<ProcurementResult | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSubmit = useCallback((item: string, budget: number) => {
    // Reset
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setLogEntries([]);
    setResult(null);
    setIsProcessing(true);
    setActiveAgent("scraper");

    const { logs, result: finalResult } = generateMockDebate(item, budget);

    logs.forEach((entry, i) => {
      const tid = setTimeout(() => {
        setActiveAgent(entry.agent);
        setLogEntries((prev) => [...prev, entry]);

        // If last entry, show result
        if (i === logs.length - 1) {
          const finalTid = setTimeout(() => {
            setActiveAgent(null);
            setIsProcessing(false);
            setResult(finalResult);
          }, 1500);
          timeoutsRef.current.push(finalTid);
        }
      }, entry.timestamp);
      timeoutsRef.current.push(tid);
    });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center glow-primary">
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">ConsensusBuy</h1>
            <p className="text-xs text-muted-foreground">Multi-Agent Procurement Swarm</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${isProcessing ? "bg-agent-scraper animate-pulse-dot" : "bg-agent-quality"}`} />
          {isProcessing ? "Agents Active" : "System Ready"}
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Request */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-[320px] flex-shrink-0 border-r border-border panel-gradient"
        >
          <RequestPanel onSubmit={handleSubmit} isProcessing={isProcessing} />
        </motion.div>

        {/* Center: Agent Log */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 min-w-0 border-r border-border panel-gradient"
        >
          <AgentLog entries={logEntries} activeAgent={activeAgent} />
        </motion.div>

        {/* Right: Approval */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-[340px] flex-shrink-0 panel-gradient"
        >
          <ApprovalPanel result={result} isProcessing={isProcessing} />
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
