import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { type Loan } from "@/lib/loans";
import { formatINR } from "@/lib/format";
import { Calculator, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  loans: Loan[];
}

export function PayoffSimulator({ loans }: Props) {
  const [monthlyBudget, setMonthlyBudget] = useState<number>(30000);
  const [strategy, setStrategy] = useState<"snowball" | "equal">("snowball");

  // Get active loans (debt > 0)
  const activeLoans = loans
    .filter((l) => Number(l.debt_remaining) > 0)
    .sort((a, b) => {
      if (strategy === "snowball") {
        // Snowball: Smallest debt balance first
        return Number(a.debt_remaining) - Number(b.debt_remaining);
      }
      // Otherwise keep default created order
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const totalDebt = activeLoans.reduce((sum, l) => sum + Number(l.debt_remaining), 0);

  // Compute allocations
  let remainingBudget = monthlyBudget;
  const allocations = activeLoans.map((l) => {
    const debt = Number(l.debt_remaining);
    let payment = 0;

    if (strategy === "snowball") {
      // Allocate to current smallest debt up to its balance, roll remaining over
      payment = Math.min(remainingBudget, debt);
      remainingBudget -= payment;
    } else {
      // Equal split among all active loans
      const share = monthlyBudget / activeLoans.length;
      payment = Math.min(share, debt);
    }

    const remainingDebt = Math.max(0, debt - payment);
    
    // Estimate months to clear:
    // If we allocate 'payment' every month, estimated months is:
    const monthlyRate = strategy === "snowball" 
      ? (payment > 0 ? payment : monthlyBudget / activeLoans.length) // placeholder logic if snowball hasn't hit it yet
      : payment;
      
    const estMonths = monthlyRate > 0 ? Math.ceil(debt / monthlyRate) : null;

    return {
      loan: l,
      originalDebt: debt,
      payment,
      remainingDebt,
      estMonths,
    };
  });

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-800">🔮 Smart Payoff Simulator</CardTitle>
            <CardDescription className="text-xs">Estimate how quickly you can get debt-free by setting a monthly budget</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {activeLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold text-sm">Congratulations! You are Debt-Free 🎉</p>
            <p className="text-xs max-w-xs">All loans are fully paid off. Add a loan to test the payoff simulator.</p>
          </div>
        ) : (
          <>
            {/* Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
              {/* Slider & Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="budget-input" className="text-xs font-semibold text-slate-600">
                    Monthly Payoff Budget (₹)
                  </Label>
                  <span className="font-bold text-blue-600 text-sm">{formatINR(monthlyBudget)}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <Slider
                    min={5000}
                    max={Math.max(200000, Math.ceil(totalDebt / 2))}
                    step={5000}
                    value={[monthlyBudget]}
                    onValueChange={(val) => setMonthlyBudget(val[0])}
                    className="flex-1 cursor-pointer"
                  />
                  <Input
                    id="budget-input"
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 h-8 text-right font-semibold text-xs border-slate-200"
                  />
                </div>
              </div>

              {/* Strategy Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Allocation Strategy</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={strategy === "snowball" ? "default" : "outline"}
                    onClick={() => setStrategy("snowball")}
                    className={cn(
                      "h-8 text-xs font-medium rounded-lg",
                      strategy === "snowball" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600"
                    )}
                  >
                    ❄️ Debt Snowball
                  </Button>
                  <Button
                    size="sm"
                    variant={strategy === "equal" ? "default" : "outline"}
                    onClick={() => setStrategy("equal")}
                    className={cn(
                      "h-8 text-xs font-medium rounded-lg",
                      strategy === "equal" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600"
                    )}
                  >
                    📊 Equal Split
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {strategy === "snowball"
                    ? "Focuses all extra budget on the smallest debt first for fast psychological wins."
                    : "Divides your budget equally among all outstanding loan balances."}
                </p>
              </div>
            </div>

            {/* Results Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Payoff Allocations</h4>
                <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-500">
                  Total Active Debt: {formatINR(totalDebt)}
                </Badge>
              </div>

              <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-3">Person / Bank</th>
                        <th className="p-3 text-right">Current Balance</th>
                        <th className="p-3 text-right">This Month Pay</th>
                        <th className="p-3 text-right">Remaining Balance</th>
                        <th className="p-3 text-center">Time to Clear</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {allocations.map(({ loan, originalDebt, payment, remainingDebt, estMonths }) => (
                        <tr key={loan.id} className="hover:bg-slate-50/40">
                          <td className="p-3 font-semibold text-slate-800">{loan.person_or_bank}</td>
                          <td className="p-3 text-right text-slate-600 font-medium">{formatINR(originalDebt)}</td>
                          <td className="p-3 text-right text-blue-600 font-bold">
                            {payment > 0 ? `+${formatINR(payment)}` : "—"}
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">
                            {remainingDebt === 0 ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px] px-1.5 py-0 font-bold animate-pulse">
                                Cleared!
                              </Badge>
                            ) : (
                              formatINR(remainingDebt)
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {estMonths !== null ? (
                              <span className={cn(
                                "font-semibold text-[11px] px-2 py-0.5 rounded-full inline-block border",
                                estMonths <= 2 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                estMonths <= 6 ? "bg-amber-50 text-amber-700 border-amber-100" :
                                "bg-red-50 text-red-700 border-red-100"
                              )}>
                                {estMonths} month{estMonths !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Payoff Simulation Summary */}
            <div className="flex gap-2.5 items-start p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-800 text-xs leading-relaxed font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                At a monthly payoff rate of <strong className="text-blue-900">{formatINR(monthlyBudget)}</strong>, you will be completely debt-free in approximately{" "}
                <strong className="text-blue-900 text-sm bg-blue-100/60 px-1.5 py-0.5 rounded font-bold">
                  {Math.ceil(totalDebt / monthlyBudget)} month{Math.ceil(totalDebt / monthlyBudget) !== 1 ? "s" : ""}
                </strong>
                ! Continuing to stick to your budget accelerates recovery and frees up your money.
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
