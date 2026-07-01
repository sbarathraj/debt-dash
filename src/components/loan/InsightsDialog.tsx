import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, TrendingUp, TrendingDown, Target, Zap, AlertCircle } from "lucide-react";
import { type Loan, computeTotals } from "@/lib/loans";
import { formatINR } from "@/lib/format";

interface Props {
  loans: Loan[];
  snapshotDates: string[];
  getSnapshotTotals?: (date: string) => Promise<{ loan_amount: number; debt_remaining: number } | null>;
}

export function InsightsDialog({ loans }: Props) {
  const insights = useMemo(() => {
    const totals = computeTotals(loans);
    const active = loans.filter((l) => l.status !== "Completed");
    const completed = loans.filter((l) => l.status === "Completed");

    const smallest = [...active].sort((a, b) => a.debt_remaining - b.debt_remaining)[0];
    const largest = [...active].sort((a, b) => b.debt_remaining - a.debt_remaining)[0];
    const closest = [...active]
      .map((l) => ({ l, pct: l.loan_amount > 0 ? (l.loan_amount - l.debt_remaining) / l.loan_amount : 0 }))
      .sort((a, b) => b.pct - a.pct)[0];
    const untouched = active.filter((l) => l.debt_remaining >= l.loan_amount);

    const avgDebt = active.length ? totals.total_debt / active.length : 0;

    return { totals, active, completed, smallest, largest, closest, untouched, avgDebt };
  }, [loans]);

  const { totals, active, completed, smallest, largest, closest, untouched, avgDebt } = insights;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
          <Lightbulb className="w-4 h-4" /> Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Finish Faster — Smart Insights
          </DialogTitle>
          <DialogDescription>
            Instant rule-based analysis of your loans to help you pay off faster.
          </DialogDescription>
        </DialogHeader>

        {loans.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Add some loans to see insights.</p>
        ) : (
          <div className="space-y-4">
            {/* Recovery */}
            <div className="rounded-lg border p-4 bg-emerald-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <TrendingUp className="w-4 h-4" /> Recovery Progress
                </div>
                <span className="text-sm font-bold text-emerald-700">
                  {totals.recovery_rate.toFixed(1)}%
                </span>
              </div>
              <Progress value={totals.recovery_rate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {formatINR(totals.recovered)} recovered of {formatINR(totals.total_loan)}.
                {" "}{formatINR(totals.total_debt)} still remaining across {active.length} active loan{active.length === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {smallest && (
                <InsightCard
                  icon={<Zap className="w-4 h-4 text-blue-600" />}
                  title="Quickest Win"
                  body={<>Pay off <b>{smallest.person_or_bank}</b> next — just <b>{formatINR(smallest.debt_remaining)}</b> left. Builds momentum instantly.</>}
                  tone="blue"
                />
              )}
              {closest && closest.pct > 0 && (
                <InsightCard
                  icon={<Target className="w-4 h-4 text-emerald-600" />}
                  title="Almost There"
                  body={<><b>{closest.l.person_or_bank}</b> is <b>{(closest.pct * 100).toFixed(0)}%</b> paid. Finishing it clears one loan from the list.</>}
                  tone="emerald"
                />
              )}
              {largest && (
                <InsightCard
                  icon={<TrendingDown className="w-4 h-4 text-red-600" />}
                  title="Biggest Weight"
                  body={<><b>{largest.person_or_bank}</b> holds the largest debt: <b>{formatINR(largest.debt_remaining)}</b>. Consider directing extra funds here.</>}
                  tone="red"
                />
              )}
              {untouched.length > 0 && (
                <InsightCard
                  icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
                  title="Not Started Yet"
                  body={<><b>{untouched.length}</b> loan{untouched.length === 1 ? " has" : "s have"} zero repayment progress. Even a small payment starts the clock.</>}
                  tone="amber"
                />
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Active" value={String(active.length)} />
              <Stat label="Completed" value={String(completed.length)} />
              <Stat label="Avg. Debt" value={formatINR(Math.round(avgDebt))} />
            </div>

            {/* Action plan */}
            <div className="rounded-lg border p-4 bg-blue-50/50">
              <p className="text-sm font-semibold text-blue-900 mb-2">📌 Suggested Payoff Order</p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-slate-700">
                {[...active].sort((a, b) => a.debt_remaining - b.debt_remaining).slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <span className="font-medium">{l.person_or_bank}</span> — {formatINR(l.debt_remaining)}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Snowball order: clear the smallest debts first to gain momentum.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InsightCard({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: React.ReactNode; tone: "blue" | "emerald" | "red" | "amber" }) {
  const tones: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
    red: "border-red-200 bg-red-50/40",
    amber: "border-amber-200 bg-amber-50/40",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">{icon} {title}</div>
      <p className="text-xs text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2 bg-white">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
