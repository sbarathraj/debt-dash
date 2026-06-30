import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { type Loan } from "@/lib/loans";
import { formatINR } from "@/lib/format";

interface Props { loans: Loan[]; }

export function SmartSuggestions({ loans }: Props) {
  const [strategy, setStrategy] = useState<"snowball" | "progress">("snowball");
  const active = loans.filter((l) => l.status !== "Completed");

  const sorted = [...active].sort((a, b) => {
    if (strategy === "snowball") return Number(a.debt_remaining) - Number(b.debt_remaining);
    const pa = a.loan_amount > 0 ? (a.loan_amount - a.debt_remaining) / a.loan_amount : 0;
    const pb = b.loan_amount > 0 ? (b.loan_amount - b.debt_remaining) / b.loan_amount : 0;
    return pb - pa;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Recommended: Pay These Off First
        </CardTitle>
        <Tabs value={strategy} onValueChange={(v) => setStrategy(v as any)}>
          <TabsList>
            <TabsTrigger value="snowball">Snowball</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active loans to recommend. 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.slice(0, 5).map((l, i) => {
              const paid = Number(l.loan_amount) - Number(l.debt_remaining);
              const pct = l.loan_amount > 0 ? (paid / l.loan_amount) * 100 : 0;
              const label =
                strategy === "snowball"
                  ? `Only ${formatINR(Number(l.debt_remaining))} left!`
                  : `${pct.toFixed(0)}% paid already!`;
              return (
                <div key={l.id} className="border rounded-md p-3 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-6 h-6 rounded-full bg-blue-600 text-white text-xs items-center justify-center font-semibold">
                        {i + 1}
                      </span>
                      <span className="font-medium">{l.person_or_bank}</span>
                    </div>
                    <span className="text-sm text-red-600 font-semibold">
                      {formatINR(Number(l.debt_remaining))}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-emerald-700 mt-1.5 font-medium">{label}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
