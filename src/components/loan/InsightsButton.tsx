import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp,
  Clock, Target, Flame, Trophy, Loader2, Sparkles, BrainCircuit,
  ArrowRight, ShieldAlert, Check, Copy, ShieldCheck, ArrowUpRight, Scale
} from "lucide-react";
import { type Loan, computeTotals } from "@/lib/loans";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  loans: Loan[];
}

type InsightLevel = "success" | "warning" | "info" | "danger";

interface Insight {
  id: string;
  level: InsightLevel;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: string;
}

const LEVEL_STYLE: Record<InsightLevel, { card: string; icon: string; badge: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50/55 hover:bg-emerald-100/40",
    icon: "text-emerald-600 bg-emerald-100/70",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    text: "text-emerald-800",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/55 hover:bg-amber-100/40",
    icon: "text-amber-600 bg-amber-100/70",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    text: "text-amber-800",
  },
  info: {
    card: "border-indigo-200 bg-indigo-50/55 hover:bg-indigo-100/40",
    icon: "text-indigo-600 bg-indigo-100/70",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    text: "text-indigo-800",
  },
  danger: {
    card: "border-red-200 bg-red-50/55 hover:bg-red-100/40",
    icon: "text-red-600 bg-red-100/70",
    badge: "bg-red-100 text-red-700 border-red-200",
    text: "text-red-800",
  },
};

const LEVEL_LABEL: Record<InsightLevel, string> = {
  success: "Optimized",
  warning: "Exposure Risk",
  info: "AI Advisory",
  danger: "Action Required",
};

export function InsightsButton({ loans }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"advisor" | "strategy" | "risk">("advisor");
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => {
    if (loans.length === 0) return null;

    const totals = computeTotals(loans);
    const active = loans.filter((l) => l.status === "Active");
    const partiallyPaid = loans.filter((l) => l.status === "Partially Paid");
    const completed = loans.filter((l) => l.status === "Completed");
    const incomplete = [...active, ...partiallyPaid];

    // Compute Health Score (0 - 100)
    let score = Math.round(totals.recovery_rate);
    if (active.length > 5) score = Math.max(0, score - 10); // Deduct for high lender fragmentation
    if (totals.total_debt > 500000) score = Math.max(0, score - 5); // Deduct for very large absolute debt

    let rating: "Poor" | "Fair" | "Good" | "Excellent" | "Critical" = "Fair";
    let ratingColor = "text-amber-700 bg-amber-50 border-amber-200";
    let ratingProgressColor = "bg-amber-500";

    if (score >= 80) {
      rating = "Excellent";
      ratingColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
      ratingProgressColor = "bg-emerald-500";
    } else if (score >= 60) {
      rating = "Good";
      ratingColor = "text-blue-700 bg-blue-50 border-blue-200";
      ratingProgressColor = "bg-blue-500";
    } else if (score >= 40) {
      rating = "Fair";
      ratingColor = "text-amber-700 bg-amber-50 border-amber-200";
      ratingProgressColor = "bg-amber-500";
    } else if (score > 0) {
      rating = "Poor";
      ratingColor = "text-orange-700 bg-orange-50 border-orange-200";
      ratingProgressColor = "bg-orange-500";
    } else {
      rating = "Critical";
      ratingColor = "text-red-700 bg-red-50 border-red-200";
      ratingProgressColor = "bg-red-500";
    }

    // AI Narrative generation
    let narrative = "";
    if (score >= 80) {
      narrative = `Your loan portfolio is in a highly optimized state with a recovery rate of ${totals.recovery_rate.toFixed(0)}%. You have successfully repaid ${formatINR(totals.recovered)} of your debt. Outstanding balance is well-controlled. Maintain current schedules to achieve absolute debt freedom.`;
    } else if (score >= 60) {
      narrative = `Your portfolio shows positive momentum, having cleared over half of the total initial balances. However, ${incomplete.length} active liabilities remain. Focusing your liquid resources towards individual accounts will streamline your payments and boost efficiency.`;
    } else if (score >= 40) {
      narrative = `Your portfolio is moderately balanced. While progress has been made, debt fragmentation (${incomplete.length} active liabilities) is creating high cognitive overhead. We recommend accelerating repayments using the Snowball strategy.`;
    } else {
      narrative = `AI Alert: Your debt profile shows elevated pressure indicators with ${totals.recovery_rate.toFixed(0)}% overall repayment and ${formatINR(totals.total_debt)} outstanding. Immediate cash-flow prioritization is required. Avoid taking on new debt and focus on micro-payments.`;
    }

    // Rule-Based Insights Array
    const insights: Insight[] = [];

    // Rule 1: All completed
    if (completed.length === loans.length) {
      insights.push({
        id: "all-completed",
        level: "success",
        icon: Trophy,
        title: "Absolute Debt Freedom! 🎉",
        description: `Stellar performance! All ${loans.length} tracked accounts have been successfully settled. Total capital recovered/cleared: ${formatINR(totals.total_loan)}.`,
      });
      return { totals, active, partiallyPaid, completed, incomplete, score, rating, ratingColor, ratingProgressColor, narrative, insights };
    }

    // Rule 2: High single-lender exposure (Concentration Risk)
    if (incomplete.length > 0) {
      const highestDebt = [...incomplete].sort((a, b) => Number(b.debt_remaining) - Number(a.debt_remaining))[0];
      const ratio = Number(highestDebt.debt_remaining) / totals.total_debt;
      if (ratio >= 0.5 && totals.total_debt > 50000) {
        insights.push({
          id: "exposure-risk",
          level: "danger",
          icon: ShieldAlert,
          title: `High Concentration Risk: "${highestDebt.person_or_bank}"`,
          description: `A single lender accounts for ${(ratio * 100).toFixed(0)}% of your outstanding liabilities (${formatINR(Number(highestDebt.debt_remaining))}). Any extra financial windfalls should be directed here to reduce this primary risk factor.`,
          action: "Direct extra funds to clear concentration exposure",
        });
      }
    }

    // Rule 3: High fragmentation (> 5 active accounts)
    if (incomplete.length > 4) {
      insights.push({
        id: "high-fragmentation",
        level: "warning",
        icon: AlertTriangle,
        title: "Lender Fragmentation Warning",
        description: `You are managing ${incomplete.length} separate active accounts. This fragments your capital and raises administrative burden. Consolidate your payments or target small accounts to eliminate them quickly.`,
        action: "Reduce account count to under 3",
      });
    }

    // Rule 4: Close to payoff (within 15%)
    const nearlyPaid = incomplete.filter((l) => {
      const d = Number(l.debt_remaining);
      const loan = Number(l.loan_amount);
      return loan > 0 && d > 0 && d / loan <= 0.15;
    });
    if (nearlyPaid.length > 0) {
      const targetList = nearlyPaid.map((l) => l.person_or_bank).join(", ");
      insights.push({
        id: "nearly-paid",
        level: "success",
        icon: Target,
        title: "Immediate Closure Available",
        description: `Accounts: [ ${targetList} ] are within 15% of completion. Allocating a combined sum of ${formatINR(nearlyPaid.reduce((acc, curr) => acc + Number(curr.debt_remaining), 0))} will fully close out these liabilities.`,
        action: `Clear remaining balance for: ${targetList}`,
      });
    }

    // Rule 5: Stagnant loan checklist
    const stagnant = active.filter((l) => Number(l.debt_remaining) === Number(l.loan_amount));
    if (stagnant.length > 0) {
      insights.push({
        id: "stagnation-check",
        level: "warning",
        icon: Clock,
        title: "Stagnant Balances Detected",
        description: `You have ${stagnant.length} account${stagnant.length > 1 ? "s" : ""} with 0% payment progress. A token payment as small as ₹500 will break the stagnation and trigger a status upgrade.`,
        action: "Initiate micro-payments on stagnant accounts",
      });
    }

    // Rule 6: Progress Champion
    const progressing = incomplete.filter((l) => Number(l.debt_remaining) < Number(l.loan_amount));
    if (progressing.length > 0) {
      const best = [...progressing].sort((a, b) => {
        const pa = 1 - Number(a.debt_remaining) / Number(a.loan_amount);
        const pb = 1 - Number(b.debt_remaining) / Number(b.loan_amount);
        return pb - pa;
      })[0];
      const paidPct = (1 - Number(best.debt_remaining) / Number(best.loan_amount)) * 100;
      if (paidPct >= 50 && paidPct < 90) {
        insights.push({
          id: "progress-champion",
          level: "info",
          icon: CheckCircle2,
          title: `Progress Leader: "${best.person_or_bank}"`,
          description: `Excellent focus shown on this account — you've cleared ${paidPct.toFixed(0)}% of the balance. Remaining debt is ${formatINR(Number(best.debt_remaining))}. Push this across the finish line first!`,
        });
      }
    }

    return { totals, active, partiallyPaid, completed, incomplete, score, rating, ratingColor, ratingProgressColor, narrative, insights };
  }, [loans]);

  const copyAdvisoryReport = () => {
    if (!analysis) return;
    const text = `=== AI FINANCIAL PORTFOLIO REPORT ===
Generated: ${new Date().toLocaleDateString()}
Health Score: ${analysis.score}/100 (${analysis.rating})
Recovery Rate: ${analysis.totals.recovery_rate.toFixed(1)}%
Outstanding Balance: ${formatINR(analysis.totals.total_debt)}
Advisory Narrative: ${analysis.narrative}

Action Items:
${analysis.insights.map((ins, i) => `${i + 1}. [${LEVEL_LABEL[ins.level]}] ${ins.title}: ${ins.description}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("AI Advisory Report copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const snowballList = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.incomplete].sort((a, b) => Number(a.debt_remaining) - Number(b.debt_remaining));
  }, [analysis]);

  const avalancheList = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.incomplete].sort((a, b) => Number(b.debt_remaining) - Number(a.debt_remaining));
  }, [analysis]);

  return (
    <>
      <Button
        id="insights-btn"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-300 font-medium shadow-sm transition-all"
      >
        <BrainCircuit className="w-4 h-4 text-indigo-600 animate-pulse" />
        AI Insights
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[85vh] flex flex-col p-0 border border-indigo-100 rounded-2xl overflow-hidden shadow-2xl">
          {/* Glassmorphic Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white relative">
            <div className="absolute top-2 right-12 flex items-center gap-1.5 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-[10px] text-indigo-200 font-semibold tracking-wide uppercase">AI Engine Online</span>
            </div>
            
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              Portfolio Intelligence AI
            </DialogTitle>
            <p className="text-xs text-indigo-200/70 mt-1">
              Advanced rule-based financial analysis of your {loans.length} active loan channels.
            </p>
          </DialogHeader>

          {loans.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-10 bg-slate-50/50">
              <Loader2 className="w-10 h-10 text-indigo-200 animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Add debt items to activate AI Analysis.</p>
            </div>
          ) : (
            analysis && (
              <>
                {/* Health Score Panel */}
                <div className="bg-slate-50 border-b p-5 shrink-0 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-4 flex items-center gap-3 border-r pr-2 border-slate-200/80">
                    <div className="relative flex items-center justify-center">
                      {/* Circular Rating Score */}
                      <div className="w-16 h-16 rounded-full border-4 border-slate-200 flex flex-col items-center justify-center bg-white shadow-sm">
                        <span className="text-lg font-extrabold text-slate-800 leading-none">{analysis.score}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Health</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Rating</h4>
                      <Badge className={`mt-0.5 border text-xs font-extrabold px-2 py-0.5 rounded-lg shadow-sm ${analysis.ratingColor}`}>
                        {analysis.rating}
                      </Badge>
                    </div>
                  </div>

                  <div className="sm:col-span-8 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Debt Repayment Velocity</span>
                      <span className="font-bold text-slate-800">{analysis.totals.recovery_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={analysis.totals.recovery_rate} className={`h-2 ${analysis.ratingProgressColor}`} />
                    <p className="text-[10.5px] text-slate-500 leading-normal">
                      Outstanding capital: <strong className="text-slate-700">{formatINR(analysis.totals.total_debt)}</strong> remaining out of a total of <strong className="text-slate-700">{formatINR(analysis.totals.total_loan)}</strong> principal.
                    </p>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-slate-100/50 border-b p-1 shrink-0 gap-1 px-4">
                  <button
                    onClick={() => setActiveTab("advisor")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "advisor"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    AI Advisory
                  </button>
                  <button
                    onClick={() => setActiveTab("strategy")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "strategy"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Optimal Strategies
                  </button>
                  <button
                    onClick={() => setActiveTab("risk")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "risk"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Risk Matrix
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
                  
                  {activeTab === "advisor" && (
                    <div className="space-y-4">
                      {/* AI Executive Narration */}
                      <div className="bg-gradient-to-r from-indigo-55 to-purple-55/50 border border-indigo-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-indigo-905 uppercase tracking-wider mb-1">Executive Summary</h4>
                          <p className="text-xs text-indigo-950 font-medium leading-relaxed">{analysis.narrative}</p>
                        </div>
                      </div>

                      {/* Rule-Based Detailed Alerts */}
                      <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Detailed Findings</h5>
                        {analysis.insights.length === 0 ? (
                          <div className="rounded-xl border p-4 bg-emerald-50/30 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-emerald-800">Your portfolio is perfectly cleared and optimized!</p>
                          </div>
                        ) : (
                          analysis.insights.map((ins) => {
                            const style = LEVEL_STYLE[ins.level];
                            const Icon = ins.icon;
                            return (
                              <div
                                key={ins.id}
                                className={`rounded-xl border p-4 flex gap-3 items-start transition-all ${style.card}`}
                              >
                                <div className={`p-2 rounded-lg flex-shrink-0 ${style.icon}`}>
                                  <Icon className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                                    <p className="font-bold text-slate-800 text-sm leading-snug">{ins.title}</p>
                                    <Badge variant="secondary" className={`border text-[9px] font-extrabold tracking-wider uppercase px-1.5 py-0 shrink-0 ${style.badge}`}>
                                      {LEVEL_LABEL[ins.level]}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{ins.description}</p>
                                  {ins.action && (
                                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-extrabold text-indigo-600 bg-indigo-50/50 w-fit px-2 py-0.5 rounded-md border border-indigo-100">
                                      <ArrowRight className="w-3 h-3 text-indigo-500 animate-pulse" />
                                      <span>Action: {ins.action}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "strategy" && (
                    <div className="space-y-4">
                      {/* Explainer */}
                      <div className="text-xs text-slate-500 leading-relaxed border-b pb-3">
                        Here are two mathematically optimized debt acceleration strategies. Comparing their structures will help you pick a plan that fits your liquidity and cash-flow characteristics.
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Snowball card */}
                        <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm flex flex-col h-full">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                              <Flame className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">Debt Snowball Strategy</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fastest Psychological Wins</p>
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-600 mb-4 leading-relaxed font-medium">
                            Prioritize outstanding loans by <strong>smallest outstanding balance first</strong>. Repaying small sums generates immediate momentum and motivates continuous progress.
                          </p>

                          <div className="space-y-2 mt-auto border-t pt-3">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposed Repayment Priority:</h5>
                            {snowballList.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No active loans.</p>
                            ) : (
                              <ol className="space-y-1.5">
                                {snowballList.slice(0, 4).map((l, i) => (
                                  <li key={l.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                                      <span className="text-slate-800 truncate max-w-[120px]">{l.person_or_bank}</span>
                                    </div>
                                    <span className="font-extrabold text-slate-700">{formatINR(Number(l.debt_remaining))}</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </div>

                        {/* Avalanche card */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col h-full">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                              <Scale className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">Exposure Avalanche</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lender Risk Reduction</p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 mb-4 leading-relaxed font-medium">
                            Prioritize loans with the <strong>largest outstanding debt</strong>. Targeting major credit lines removes high-level liability concentration and heavy exposures first.
                          </p>

                          <div className="space-y-2 mt-auto border-t pt-3">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposed Repayment Priority:</h5>
                            {avalancheList.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No active loans.</p>
                            ) : (
                              <ol className="space-y-1.5">
                                {avalancheList.slice(0, 4).map((l, i) => (
                                  <li key={l.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                                    <div className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                                      <span className="text-slate-800 truncate max-w-[120px]">{l.person_or_bank}</span>
                                    </div>
                                    <span className="font-extrabold text-slate-700">{formatINR(Number(l.debt_remaining))}</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "risk" && (
                    <div className="space-y-4">
                      {/* Risk matrices */}
                      <div className="rounded-xl border border-red-100 bg-red-50/10 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-red-900 border-b pb-2 border-red-100">
                          <ShieldAlert className="w-5 h-5 text-red-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Liability Risk Vector Analysis</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                          <div className="bg-white border rounded-lg p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Lenders</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{analysis.incomplete.length}</p>
                            <Badge variant="secondary" className="mt-1 text-[9px] px-1 bg-slate-100 text-slate-600 border border-slate-200">
                              Fragmentation level: {analysis.incomplete.length > 4 ? "Elevated" : "Normal"}
                            </Badge>
                          </div>

                          <div className="bg-white border rounded-lg p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Untouched Accounts</p>
                            <p className="text-xl font-black text-amber-600 mt-1">
                              {analysis.active.filter(l => Number(l.debt_remaining) === Number(l.loan_amount)).length}
                            </p>
                            <Badge variant="secondary" className="mt-1 text-[9px] px-1 bg-amber-50 text-amber-700 border border-amber-200">
                              Stagnancy risk: {analysis.active.filter(l => Number(l.debt_remaining) === Number(l.loan_amount)).length > 2 ? "High" : "Low"}
                            </Badge>
                          </div>

                          <div className="bg-white border rounded-lg p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concentration Index</p>
                            <p className="text-xl font-black text-red-600 mt-1">
                              {analysis.incomplete.length > 0
                                ? `${((Math.max(...analysis.incomplete.map(l => Number(l.debt_remaining))) / analysis.totals.total_debt) * 100).toFixed(0)}%`
                                : "0%"
                              }
                            </p>
                            <Badge variant="secondary" className="mt-1 text-[9px] px-1 bg-red-50 text-red-700 border border-red-200">
                              Single lender exposure
                            </Badge>
                          </div>
                        </div>

                        {/* Mitigation advisory */}
                        <div className="bg-white border border-slate-200 p-3.5 rounded-lg flex gap-3 items-start mt-2">
                          <div className="p-1.5 rounded bg-slate-100 text-slate-700 flex-shrink-0 mt-0.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-800">Mitigation Strategy Recommendation</h5>
                            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                              Maintain a strict weekly check on the tracker. Reducing the active accounts count (lender fragmentation) should be prioritized over partial payments to many lenders at once. Focus capital to close specific targets to immediately release cash-flow constraints.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t shrink-0 flex justify-between items-center bg-slate-50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAdvisoryReport}
                    className="gap-1.5 border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied Report" : "Copy AI Report"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setOpen(false)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs"
                  >
                    Done
                  </Button>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
