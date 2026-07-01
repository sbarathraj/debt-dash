import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp,
  Clock, Target, Flame, Trophy, Loader2,
} from "lucide-react";
import { type Loan, computeTotals } from "@/lib/loans";
import { formatINR } from "@/lib/format";

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

const LEVEL_STYLE: Record<InsightLevel, { card: string; icon: string; badge: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600 bg-emerald-100",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  warning: {
    card: "border-amber-200 bg-amber-50",
    icon: "text-amber-600 bg-amber-100",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  info: {
    card: "border-blue-200 bg-blue-50",
    icon: "text-blue-600 bg-blue-100",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  danger: {
    card: "border-red-200 bg-red-50",
    icon: "text-red-600 bg-red-100",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

const LEVEL_LABEL: Record<InsightLevel, string> = {
  success: "Great News",
  warning: "Attention",
  info: "Tip",
  danger: "Action Needed",
};

function generateInsights(loans: Loan[]): Insight[] {
  const insights: Insight[] = [];
  if (loans.length === 0) return insights;

  const totals = computeTotals(loans);
  const active = loans.filter((l) => l.status === "Active");
  const partiallyPaid = loans.filter((l) => l.status === "Partially Paid");
  const completed = loans.filter((l) => l.status === "Completed");
  const incomplete = [...active, ...partiallyPaid];

  // ── Rule 1: All loans completed
  if (completed.length === loans.length && loans.length > 0) {
    insights.push({
      id: "all-completed",
      level: "success",
      icon: Trophy,
      title: "All Loans Cleared! 🎉",
      description: `Amazing — all ${loans.length} loan${loans.length > 1 ? "s" : ""} have been fully repaid. Total amount recovered: ${formatINR(totals.total_loan)}.`,
    });
    return insights; // No other insights needed
  }

  // ── Rule 2: High recovery rate (≥70%)
  if (totals.recovery_rate >= 70) {
    insights.push({
      id: "high-recovery",
      level: "success",
      icon: TrendingUp,
      title: `Excellent Recovery Rate — ${totals.recovery_rate.toFixed(0)}%`,
      description: `You've recovered ${formatINR(totals.recovered)} out of ${formatINR(totals.total_loan)}. Keep going — you're almost there!`,
    });
  }

  // ── Rule 3: Low recovery rate (<30%)
  if (totals.recovery_rate > 0 && totals.recovery_rate < 30) {
    insights.push({
      id: "low-recovery",
      level: "warning",
      icon: TrendingDown,
      title: `Low Recovery Rate — ${totals.recovery_rate.toFixed(0)}%`,
      description: `Only ${formatINR(totals.recovered)} recovered so far. Focus on the smallest loans first (snowball method) to build momentum.`,
      action: "Start with the smallest debt",
    });
  }

  // ── Rule 4: Loans very close to completion (within 10% remaining)
  const nearlyDone = incomplete.filter((l) => {
    const debt = Number(l.debt_remaining);
    const loan = Number(l.loan_amount);
    return loan > 0 && debt / loan <= 0.1 && debt > 0;
  });
  if (nearlyDone.length > 0) {
    const names = nearlyDone.map((l) => l.person_or_bank).join(", ");
    insights.push({
      id: "nearly-done",
      level: "success",
      icon: Target,
      title: `${nearlyDone.length} Loan${nearlyDone.length > 1 ? "s" : ""} Almost Cleared!`,
      description: `${names} ${nearlyDone.length > 1 ? "are" : "is"} within 10% of being fully paid. One last push and ${nearlyDone.length > 1 ? "they're" : "it's"} done!`,
      action: `Pay off: ${names}`,
    });
  }

  // ── Rule 5: Snowball candidate (smallest debt)
  if (incomplete.length >= 2) {
    const snowball = [...incomplete].sort((a, b) => Number(a.debt_remaining) - Number(b.debt_remaining))[0];
    const debt = Number(snowball.debt_remaining);
    if (debt > 0) {
      insights.push({
        id: "snowball-pick",
        level: "info",
        icon: Flame,
        title: `Snowball Pick: "${snowball.person_or_bank}"`,
        description: `Only ${formatINR(debt)} remaining on this loan — the smallest in your list. Pay this off first for the quickest win and momentum boost!`,
        action: `Reduce debt on: ${snowball.person_or_bank}`,
      });
    }
  }

  // ── Rule 6: More than 5 active loans
  if (active.length > 5) {
    insights.push({
      id: "too-many-active",
      level: "warning",
      icon: AlertTriangle,
      title: `${active.length} Loans Are Still Active`,
      description: `You have ${active.length} untouched active loans. Consider making even small payments on them to move to "Partially Paid" status and reduce total debt.`,
      action: "Make a payment on each active loan",
    });
  }

  // ── Rule 7: Progress champion (highest % paid)
  if (incomplete.length > 0) {
    const progress = [...incomplete].sort((a, b) => {
      const pa = Number(a.loan_amount) > 0 ? 1 - Number(a.debt_remaining) / Number(a.loan_amount) : 0;
      const pb = Number(b.loan_amount) > 0 ? 1 - Number(b.debt_remaining) / Number(b.loan_amount) : 0;
      return pb - pa;
    })[0];
    const pct = Number(progress.loan_amount) > 0
      ? ((Number(progress.loan_amount) - Number(progress.debt_remaining)) / Number(progress.loan_amount) * 100)
      : 0;
    if (pct >= 50 && pct < 90) {
      insights.push({
        id: "progress-champ",
        level: "info",
        icon: CheckCircle2,
        title: `"${progress.person_or_bank}" — ${pct.toFixed(0)}% Paid!`,
        description: `More than half of this loan is cleared. Only ${formatINR(Number(progress.debt_remaining))} remains. Consider prioritizing it to close it out.`,
      });
    }
  }

  // ── Rule 8: Large total outstanding debt warning
  if (totals.total_debt > 500000) {
    insights.push({
      id: "large-debt",
      level: "danger",
      icon: AlertTriangle,
      title: `Total Outstanding Debt: ${formatINR(totals.total_debt)}`,
      description: `Your total debt remaining is significant. Make sure to track payments regularly and use the Compare feature to see daily progress.`,
      action: "Review all debts and make a plan",
    });
  }

  // ── Rule 9: Only one loan left
  if (incomplete.length === 1) {
    insights.push({
      id: "final-loan",
      level: "success",
      icon: Clock,
      title: "You're Down to Your Last Loan!",
      description: `Only "${incomplete[0].person_or_bank}" (${formatINR(Number(incomplete[0].debt_remaining))} remaining) stands between you and being completely debt-free. Almost there!`,
    });
  }

  // ── Rule 10: No partial payments (all still fully active)
  if (active.length === loans.length && loans.length > 1) {
    insights.push({
      id: "no-progress",
      level: "warning",
      icon: TrendingDown,
      title: "No Payments Made Yet",
      description: `All ${loans.length} loans are still at full amount. Start by making a payment on the smallest loan (${formatINR(Math.min(...active.map(l => Number(l.debt_remaining))))}) to begin your journey!`,
      action: "Make your first payment today",
    });
  }

  return insights;
}

export function InsightsButton({ loans }: Props) {
  const [open, setOpen] = useState(false);
  const insights = useMemo(() => generateInsights(loans), [loans]);

  return (
    <>
      <Button
        id="insights-btn"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
      >
        <Lightbulb className="w-4 h-4" />
        Idea
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              Smart Insights
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rule-based analysis of your current loan portfolio — {loans.length} loan{loans.length !== 1 ? "s" : ""} tracked.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loans.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-10">
                <Loader2 className="w-10 h-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">Add some loans to see insights.</p>
              </div>
            ) : insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-300" />
                <p className="text-sm font-medium text-slate-400">Looking good! No specific insights at this time.</p>
              </div>
            ) : (
              insights.map((ins) => {
                const style = LEVEL_STYLE[ins.level];
                const Icon = ins.icon;
                return (
                  <div
                    key={ins.id}
                    className={`rounded-xl border p-4 flex gap-3 items-start ${style.card}`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${style.icon}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{ins.title}</p>
                        <Badge variant="secondary" className={`border text-[10px] px-1.5 py-0 shrink-0 ${style.badge}`}>
                          {LEVEL_LABEL[ins.level]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{ins.description}</p>
                      {ins.action && (
                        <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1">
                          <span className="text-amber-500">→</span> {ins.action}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-4 border-t shrink-0 flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {insights.length} insight{insights.length !== 1 ? "s" : ""} generated from your data
            </p>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
