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
    {
      label: "Total Loans",
      value: String(count),
      sub: "entries tracked",
      icon: Wallet,
      card: "border-indigo-400 bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 text-white shadow-indigo-100",
      icon_bg: "bg-white/20 text-white",
      text: "text-white",
      sub_text: "text-indigo-100",
    },
    {
      label: "Total Loan Amount",
      value: formatINR(totalLoan),
      sub: "total disbursed",
      icon: TrendingUp,
      card: "border-purple-400 bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 text-white shadow-purple-100",
      icon_bg: "bg-white/20 text-white",
      text: "text-white",
      sub_text: "text-purple-100",
    },
    {
      label: "Total Debt Remaining",
      value: formatINR(totalDebt),
      sub: "still owed",
      icon: AlertCircle,
      card: "border-rose-400 bg-gradient-to-br from-rose-500 via-rose-600 to-red-600 text-white shadow-rose-100",
      icon_bg: "bg-white/20 text-white",
      text: "text-white",
      sub_text: "text-rose-100",
    },
    {
      label: "Total Recovered",
      value: formatINR(recovered),
      sub: "collected back",
      icon: CheckCircle2,
      card: "border-emerald-400 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-emerald-100",
      icon_bg: "bg-white/20 text-white",
      text: "text-white",
      sub_text: "text-emerald-100",
    },
    {
      label: "Recovery Rate",
      value: `${recoveryRate.toFixed(1)}%`,
      sub: "of total loan",
      icon: Percent,
      card: "border-amber-400 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-500 text-white shadow-amber-100",
      icon_bg: "bg-white/20 text-white",
      text: "text-white",
      sub_text: "text-amber-100",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {items.map((it) => (
        <Card
          key={it.label}
          className={`p-3.5 border border-white/10 ${it.card} shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-xl flex flex-col justify-between`}
        >
          <div className="flex flex-col justify-between h-full gap-2.5 w-full">
            {/* Top row: Label and Icon */}
            <div className="flex items-center justify-between gap-1 w-full">
              <p className={`text-[10px] xs:text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-90 ${it.sub_text}`}>
                {it.label}
              </p>
              <div className={`p-1.5 rounded-lg ${it.icon_bg} shadow-inner flex-shrink-0 flex items-center justify-center`}>
                <it.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            
            {/* Bottom block: Large Value & Sub-text */}
            <div className="mt-1">
              <p className={`text-[16px] xs:text-[18px] sm:text-xl md:text-2xl font-black leading-none tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${it.text}`} title={it.value}>
                {it.value}
              </p>
              <p className={`text-[10px] xs:text-[11px] sm:text-xs mt-1.5 ${it.sub_text} opacity-85 font-medium whitespace-nowrap overflow-hidden text-ellipsis`}>
                {it.sub}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
