import { motion, AnimatePresence } from "framer-motion";
import { History, CheckCircle2, TrendingDown, DollarSign } from "lucide-react";

export interface PurchaseRecord {
  id: string;
  item: string;
  originalPrice: number;
  finalPrice: number;
  savings: number;
  date: string;
  status: "approved" | "pending";
}

interface PurchaseHistoryProps {
  records: PurchaseRecord[];
}

const SEED_RECORDS: PurchaseRecord[] = [
  { id: "seed-1", item: "Ergonomic Standing Desk", originalPrice: 850, finalPrice: 380, savings: 470, date: "Today, 2:14 PM", status: "approved" },
  { id: "seed-2", item: "Team Zoom Pro License (x5)", originalPrice: 1200, finalPrice: 720, savings: 480, date: "Today, 11:30 AM", status: "approved" },
  { id: "seed-3", item: "APC UPS Battery Backup", originalPrice: 320, finalPrice: 165, savings: 155, date: "Yesterday", status: "approved" },
];

export function PurchaseHistory({ records }: PurchaseHistoryProps) {
  const allRecords = [...records, ...SEED_RECORDS];
  const totalSavings = allRecords.reduce((sum, r) => sum + r.savings, 0);
  const totalOriginal = allRecords.reduce((sum, r) => sum + r.originalPrice, 0);
  const savingsPercent = totalOriginal > 0 ? Math.round((totalSavings / totalOriginal) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">Purchase History</h2>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{allRecords.length} orders</span>
      </div>

      {/* Cumulative savings banner */}
      <div className="mx-5 mt-4 rounded-lg bg-agent-quality/5 border border-agent-quality/20 p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <DollarSign className="h-4 w-4 text-agent-quality" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Savings This Quarter</span>
        </div>
        <motion.div
          key={totalSavings}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold text-agent-quality"
        >
          ${totalSavings.toLocaleString()}
        </motion.div>
        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
          <TrendingDown className="h-3 w-3 text-agent-quality" />
          {savingsPercent}% avg. reduction across {allRecords.length} purchases
        </div>
      </div>

      {/* Records list */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        <AnimatePresence>
          {allRecords.map((record, i) => (
            <motion.div
              key={record.id}
              initial={i === 0 && records.length > 0 ? { opacity: 0, x: -12 } : { opacity: 1 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between py-3 px-3 rounded-md bg-muted/30 border border-border/50"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <CheckCircle2 className="h-4 w-4 text-agent-quality flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{record.item}</div>
                  <div className="text-xs text-muted-foreground">{record.date}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-xs text-muted-foreground line-through">${record.originalPrice}</div>
                <div className="text-sm font-semibold text-foreground">${record.finalPrice}</div>
                <div className="text-xs font-mono text-agent-quality">-${record.savings}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
