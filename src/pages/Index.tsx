import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Cpu, ShoppingCart, BarChart3, History } from "lucide-react";
import { RequestPanel } from "@/components/RequestPanel";
import { AgentLog } from "@/components/AgentLog";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { SpendingAnalysis } from "@/components/SpendingAnalysis";
import { PurchaseHistory, PurchaseRecord } from "@/components/PurchaseHistory";
import { generateMockDebate, AgentLogEntry, AgentRole, ProcurementResult } from "@/lib/mockAgentData";

type Tab = "procurement" | "spending" | "history";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("procurement");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logEntries, setLogEntries] = useState<AgentLogEntry[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [result, setResult] = useState<ProcurementResult | null>(null);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
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

  const handleApprove = useCallback((approvedResult: ProcurementResult) => {
    const record: PurchaseRecord = {
      id: `purchase-${Date.now()}`,
      item: approvedResult.originalItem,
      originalPrice: approvedResult.originalPrice,
      finalPrice: approvedResult.recommendedPrice,
      savings: approvedResult.savings,
      date: "Just now",
      status: "approved",
    };
    setPurchaseRecords((prev) => [record, ...prev]);
  }, []);

  const tabs = [
    { id: "procurement" as Tab, label: "Procurement", icon: ShoppingCart },
    { id: "history" as Tab, label: "History", icon: History, badge: purchaseRecords.length || undefined },
    { id: "spending" as Tab, label: "Spend Analysis", icon: BarChart3 },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
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

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.badge ? (
                  <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full bg-agent-quality/20 text-agent-quality text-[10px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${isProcessing ? "bg-agent-scraper animate-pulse-dot" : "bg-agent-quality"}`} />
          {isProcessing ? "Agents Active" : "System Ready"}
        </div>
      </header>

      {activeTab === "procurement" && (
        <div className="flex-1 flex overflow-hidden">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="w-[320px] flex-shrink-0 border-r border-border panel-gradient">
            <RequestPanel onSubmit={handleSubmit} isProcessing={isProcessing} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 min-w-0 border-r border-border panel-gradient">
            <AgentLog entries={logEntries} activeAgent={activeAgent} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="w-[340px] flex-shrink-0 panel-gradient">
            <ApprovalPanel result={result} isProcessing={isProcessing} onApprove={handleApprove} />
          </motion.div>
        </div>
      )}

      {activeTab === "history" && (
        <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-hidden panel-gradient">
          <PurchaseHistory records={purchaseRecords} />
        </motion.div>
      )}

      {activeTab === "spending" && (
        <motion.div key="spending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-hidden panel-gradient">
          <SpendingAnalysis />
        </motion.div>
      )}
    </div>
  );
};

export default Index;
