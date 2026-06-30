import { Card } from "@/components/ui/card";
import { TrendingUp, Wallet, AlertCircle, CheckCircle2, Percent } from "lucide-react";
import { formatINR } from "@/lib/format";

interface Props {
  count: number;
  totalLoan: number;
  totalDebt: number;
  recovered: number;
  recoveryRate: number;
}

export function SummaryCards({ count, totalLoan, totalDebt, recovered, recoveryRate }: Props) {
  const items = [
    { label: "Total Loans Given", value: String(count), icon: Wallet, color: "blue" },
    { label: "Total Loan Amount", value: formatINR(totalLoan), icon: TrendingUp, color: "blue" },
    { label: "Total Debt Remaining", value: formatINR(totalDebt), icon: AlertCircle, color: "red" },
    { label: "Total Recovered", value: formatINR(recovered), icon: CheckCircle2, color: "green" },
    { label: "Recovery Rate", value: `${recoveryRate.toFixed(1)}%`, icon: Percent, color: "green" },
  ] as const;

  const palette: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const iconPalette: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    green: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((it) => (
        <Card key={it.label} className={`p-4 border ${palette[it.color]}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium opacity-80">{it.label}</p>
              <p className="text-lg sm:text-xl font-bold mt-1 truncate">{it.value}</p>
            </div>
            <div className={`p-2 rounded-lg ${iconPalette[it.color]}`}>
              <it.icon className="w-4 h-4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
