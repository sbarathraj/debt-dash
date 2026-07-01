import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { type Loan } from "@/lib/loans";
import { formatINR } from "@/lib/format";

interface Props { loans: Loan[]; }

const MOTIVATIONAL: Record<string, string[]> = {
  snowball: [
    "Smallest debt — knock it out first! 🎯",
    "Almost there — one more push! 💪",
    "Keep the momentum going! 🚀",
    "You're making great progress! ⭐",
    "Every rupee paid brings you closer! 💰",
  ],
  progress: [
    "So close to done — finish strong! 🏆",
    "Already halfway — keep going! 💪",
    "Great progress so far! 🎯",
    "You're building momentum! 🚀",
    "Consistent effort pays off! ⭐",
  ],
};

export function SmartSuggestions({ loans }: Props) {
  const [strategy, setStrategy] = useState<"snowball" | "progress">("snowball");
  const active = loans.filter((l) => l.status !== "Completed");

  const sorted = [...active].sort((a, b) => {
    if (strategy === "snowball") return Number(a.debt_remaining) - Number(b.debt_remaining);
    const pa = Number(a.loan_amount) > 0 ? (Number(a.loan_amount) - Number(a.debt_remaining)) / Number(a.loan_amount) : 0;
    const pb = Number(b.loan_amount) > 0 ? (Number(b.loan_amount) - Number(b.debt_remaining)) / Number(b.loan_amount) : 0;
    return pb - pa;
  });

  return (
    <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          Recommended to Pay Off First
        </CardTitle>
        <Tabs value={strategy} onValueChange={(v) => setStrategy(v as any)}>
          <TabsList className="h-8 bg-amber-100/60">
            <TabsTrigger value="snowball" className="text-xs px-3 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              ❄️ Snowball
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs px-3 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              📈 Progress
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {strategy === "snowball"
            ? "Snowball: Pay smallest debt first for quick wins and momentum."
            : "Progress: Pay the loan you've made the most progress on to close it out."}
        </p>
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold text-emerald-600">All loans completed!</p>
            <p className="text-sm text-muted-foreground mt-1">No active loans to suggest.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.slice(0, 5).map((l, i) => {
              const paid = Number(l.loan_amount) - Number(l.debt_remaining);
              const pct = Number(l.loan_amount) > 0 ? (paid / Number(l.loan_amount)) * 100 : 0;
              const motiv = MOTIVATIONAL[strategy][Math.min(i, 4)];
              return (
                <div
                  key={l.id}
                  className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs items-center justify-center font-bold shadow-sm">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800">{l.person_or_bank}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {pct.toFixed(0)}% paid
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-red-600 font-bold">
                      {formatINR(Number(l.debt_remaining))} left
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2 bg-amber-100"
                  />
                  <p className="text-xs text-amber-700 mt-1.5 font-medium">{motiv}</p>
                </div>
              );
            })}
            {sorted.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                +{sorted.length - 5} more active loan{sorted.length - 5 > 1 ? "s" : ""} not shown
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
