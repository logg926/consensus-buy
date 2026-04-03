import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, TrendingUp, TrendingDown, AlertTriangle, DollarSign, PieChart, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";

const MONTHLY_SPEND = [
  { month: "Jan", amount: 42800, optimized: 31200 },
  { month: "Feb", amount: 38500, optimized: 28900 },
  { month: "Mar", amount: 51200, optimized: 35600 },
  { month: "Apr", amount: 44900, optimized: 32100 },
  { month: "May", amount: 47300, optimized: 33800 },
  { month: "Jun", amount: 53100, optimized: 37200 },
];

const CATEGORY_SPEND = [
  { name: "Office Equipment", value: 84200, color: "hsl(199, 89%, 48%)" },
  { name: "Software Licenses", value: 62400, color: "hsl(142, 71%, 45%)" },
  { name: "Travel & Lodging", value: 38900, color: "hsl(37, 90%, 55%)" },
  { name: "Supplies", value: 28300, color: "hsl(280, 60%, 55%)" },
  { name: "Services", value: 19800, color: "hsl(350, 70%, 55%)" },
];

const FLAGGED_PURCHASES = [
  { item: "Adobe Creative Suite (10 seats)", vendor: "Adobe Inc.", amount: 7200, flag: "Only 4 seats actively used — 60% waste", severity: "high" as const },
  { item: "WeWork Hot Desk (Monthly)", vendor: "WeWork", amount: 4500, flag: "Cheaper coworking available at $2,800/mo", severity: "medium" as const },
  { item: "Cisco Meraki Switch", vendor: "CDW", amount: 3200, flag: "Same model found for $1,900 on B&H", severity: "medium" as const },
  { item: "FedEx Overnight Shipping", vendor: "FedEx", amount: 2800, flag: "82% of shipments were non-urgent", severity: "high" as const },
];

const STATS = [
  { label: "Total Q2 Spend", value: "$233,600", icon: DollarSign, trend: "+8.2%", trendUp: true },
  { label: "Potential Savings", value: "$67,400", icon: TrendingDown, trend: "28.8%", trendUp: false },
  { label: "Flagged Items", value: "12", icon: AlertTriangle, trend: "+3", trendUp: true },
  { label: "Avg. Savings / Order", value: "$842", icon: TrendingUp, trend: "+12%", trendUp: false },
];

export function SpendingAnalysis() {
  const [connected] = useState(true); // mock connected state

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">
            QuickBooks Spend Analysis
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-agent-quality" />
          <span className="text-xs text-muted-foreground">Connected — Acme Corp</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-muted/50 border border-border p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={`text-xs font-mono ${stat.trendUp ? "text-agent-scraper" : "text-agent-quality"}`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="text-lg font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-5 gap-4">
          {/* Bar chart */}
          <div className="col-span-3 rounded-lg bg-muted/30 border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Monthly Spend vs. Optimized</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={MONTHLY_SPEND} barGap={2}>
                <XAxis dataKey="month" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(210, 20%, 90%)" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
                <Bar dataKey="amount" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} name="Actual" opacity={0.7} />
                <Bar dataKey="optimized" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} name="Optimized" opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-sm bg-primary opacity-70" /> Actual</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-sm bg-agent-quality opacity-90" /> With ConsensusBuy</div>
            </div>
          </div>

          {/* Pie chart */}
          <div className="col-span-2 rounded-lg bg-muted/30 border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">By Category</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <RPieChart>
                <Pie data={CATEGORY_SPEND} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                  {CATEGORY_SPEND.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
              </RPieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {CATEGORY_SPEND.map((cat) => (
                <div key={cat.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  {cat.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flagged purchases */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-agent-scraper" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">AI-Flagged Overspending</span>
          </div>
          <div className="space-y-2">
            {FLAGGED_PURCHASES.map((purchase) => (
              <motion.div
                key={purchase.item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start justify-between p-3 rounded-md border ${
                  purchase.severity === "high"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-agent-scraper/20 bg-agent-scraper/5"
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{purchase.item}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                      purchase.severity === "high" ? "bg-destructive/20 text-destructive" : "bg-agent-scraper/20 text-agent-scraper"
                    }`}>
                      {purchase.severity}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{purchase.vendor}</div>
                  <div className="text-xs text-agent-scraper">{purchase.flag}</div>
                </div>
                <div className="text-sm font-mono font-semibold text-foreground ml-3">${purchase.amount.toLocaleString()}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
