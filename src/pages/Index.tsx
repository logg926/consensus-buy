import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Cpu, ShoppingCart, BarChart3, History } from "lucide-react";
import { RequestPanel } from "@/components/RequestPanel";
import { AgentLog } from "@/components/AgentLog";
import { ApprovalPanel, QueuedRequest } from "@/components/ApprovalPanel";
import { SpendingAnalysis } from "@/components/SpendingAnalysis";
import { PurchaseHistory, PurchaseRecord } from "@/components/PurchaseHistory";
import { generateMockDebate, AgentLogEntry, AgentRole } from "@/lib/mockAgentData";

type Tab = "procurement" | "spending" | "history";

const MOCK_REQUESTERS = ["Sarah Chen", "Mike Johnson", "Priya Patel", "Alex Rivera"];

// Seed some pre-existing pending items for demo
const SEED_QUEUE: QueuedRequest[] = [
  {
    id: "seed-q1",
    result: {
      originalItem: "Cisco Meraki MR46 Access Point",
      originalPrice: 680,
      recommendedItem: "TP-Link Omada EAP670",
      recommendedPrice: 210,
      savings: 470,
      savingsPercent: 69,
      rationale: "The TP-Link Omada EAP670 delivers WiFi 6 with comparable throughput at 31% of the cost. 4.5★ across 1,200 enterprise reviews with centralized management support.",
      alternatives: [
        { name: "TP-Link EAP670", price: 210, rating: 4.5, warranty: "5 years", pros: ["WiFi 6", "Cloud managed"], cons: ["Less brand cachet"], recommended: true },
        { name: "Ubiquiti U6-Pro", price: 320, rating: 4.3, warranty: "1 year", pros: ["Good ecosystem"], cons: ["Short warranty"], recommended: false },
      ],
    },
    status: "pending",
    submittedAt: "10 min ago",
    requester: "Priya Patel",
  },
  {
    id: "seed-q2",
    result: {
      originalItem: "Steelcase Leap V2 Chair",
      originalPrice: 1200,
      recommendedItem: "HON Ignition 2.0",
      recommendedPrice: 480,
      savings: 720,
      savingsPercent: 60,
      rationale: "HON Ignition 2.0 provides comparable lumbar support and adjustability at 40% of the Steelcase price. 4.4★ with 15-year warranty vs Steelcase's 12-year.",
      alternatives: [
        { name: "HON Ignition 2.0", price: 480, rating: 4.4, warranty: "15 years", pros: ["Best warranty", "Ergonomic"], cons: ["Less premium feel"], recommended: true },
        { name: "Autonomous ErgoChair", price: 350, rating: 3.9, warranty: "2 years", pros: ["Budget-friendly"], cons: ["Short warranty", "Lower durability"], recommended: false },
      ],
    },
    status: "pending",
    submittedAt: "25 min ago",
    requester: "Alex Rivera",
  },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("procurement");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logEntries, setLogEntries] = useState<AgentLogEntry[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<QueuedRequest[]>(SEED_QUEUE);
  const [latestResultId, setLatestResultId] = useState<string | null>(null);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pendingCount = approvalQueue.filter((q) => q.status === "pending").length;

  const handleSubmit = useCallback((item: string, budget: number) => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setLogEntries([]);
    setLatestResultId(null);
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

            const newId = `req-${Date.now()}`;
            const newRequest: QueuedRequest = {
              id: newId,
              result: finalResult,
              status: "pending",
              submittedAt: "Just now",
              requester: MOCK_REQUESTERS[Math.floor(Math.random() * MOCK_REQUESTERS.length)],
            };
            setApprovalQueue((prev) => [newRequest, ...prev]);
            setLatestResultId(newId);
          }, 1500);
          timeoutsRef.current.push(finalTid);
        }
      }, entry.timestamp);
      timeoutsRef.current.push(tid);
    });
  }, []);

  const handleApprove = useCallback((id: string) => {
    setApprovalQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "approved" as const } : q))
    );
    const item = approvalQueue.find((q) => q.id === id);
    if (item) {
      const record: PurchaseRecord = {
        id: `purchase-${Date.now()}`,
        item: item.result.originalItem,
        originalPrice: item.result.originalPrice,
        finalPrice: item.result.recommendedPrice,
        savings: item.result.savings,
        date: "Just now",
        status: "approved",
      };
      setPurchaseRecords((prev) => [record, ...prev]);
    }
  }, [approvalQueue]);

  const handleReject = useCallback((id: string) => {
    setApprovalQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "rejected" as const } : q))
    );
  }, []);

  const tabs = [
    { id: "procurement" as Tab, label: "Procurement", icon: ShoppingCart, badge: pendingCount || undefined },
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
            <h1 className="text-sm font-bold tracking-tight text-foreground">Sassy CFO 💳</h1>
            <p className="text-xs text-muted-foreground">Vibe-Based Expense Approvals</p>
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
                  <span className={`ml-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    tab.id === "procurement" ? "bg-agent-scraper/20 text-agent-scraper" : "bg-agent-quality/20 text-agent-quality"
                  }`}>
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
            <ApprovalPanel
              queue={approvalQueue}
              isProcessing={isProcessing}
              onApprove={handleApprove}
              onReject={handleReject}
              latestResultId={latestResultId}
            />
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
