import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Cpu, ShoppingCart, BarChart3 } from "lucide-react";
import { RequestPanel } from "@/components/RequestPanel";
import { AgentLog } from "@/components/AgentLog";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { SpendingAnalysis } from "@/components/SpendingAnalysis";
import { generateMockDebate, AgentLogEntry, AgentRole, ProcurementResult } from "@/lib/mockAgentData";

type Tab = "procurement" | "spending";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("procurement");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logEntries, setLogEntries] = useState<AgentLogEntry[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [result, setResult] = useState<ProcurementResult | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSubmit = useCallback((item: string, budget: number) => {
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

  const tabs = [
    { id: "procurement" as Tab, label: "Procurement Swarm", icon: ShoppingCart },
    { id: "spending" as Tab, label: "Spend Analysis", icon: BarChart3 },
  ];

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

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${isProcessing ? "bg-agent-scraper animate-pulse-dot" : "bg-agent-quality"}`} />
          {isProcessing ? "Agents Active" : "System Ready"}
        </div>
      </header>

      {/* Content */}
      {activeTab === "procurement" ? (
        <div className="flex-1 flex overflow-hidden">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-[320px] flex-shrink-0 border-r border-border panel-gradient"
          >
            <RequestPanel onSubmit={handleSubmit} isProcessing={isProcessing} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0 border-r border-border panel-gradient"
          >
            <AgentLog entries={logEntries} activeAgent={activeAgent} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="w-[340px] flex-shrink-0 panel-gradient"
          >
            <ApprovalPanel result={result} isProcessing={isProcessing} />
          </motion.div>
        </div>
      ) : (
        <motion.div
          key="spending"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-hidden panel-gradient"
        >
          <SpendingAnalysis />
        </motion.div>
      )}
    </div>
  );
};

export default Index;
