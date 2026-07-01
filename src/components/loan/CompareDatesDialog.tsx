import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, GitCompareArrows, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { fetchSnapshotOnOrBefore, type Loan, computeTotals } from "@/lib/loans";
import { dateToISO, formatINR, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  liveLoans: Loan[];
  triggerLabel?: string;
  variant?: "default" | "outline";
  autoYesterdayToday?: boolean;
}

function yesterdayISO() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return dateToISO(d);
}

export function CompareDatesDialog({ liveLoans, triggerLabel = "Compare Dates", variant = "outline", autoYesterdayToday }: Props) {
  const [open, setOpen] = useState(false);
  const [dateA, setDateA] = useState<Date | undefined>(undefined);
  const [dateB, setDateB] = useState<Date | undefined>(undefined);
  const [loansA, setLoansA] = useState<Loan[] | null>(null);
  const [loansB, setLoansB] = useState<Loan[] | null>(null);
  const [effA, setEffA] = useState<string | null>(null);
  const [effB, setEffB] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initA = new Date(); initA.setDate(initA.getDate() - 1);
    const initB = new Date();
    setDateA((cur) => cur ?? initA);
    setDateB((cur) => cur ?? initB);
  }, [open]);

  useEffect(() => {
    if (!open || !dateA) return;
    const iso = dateToISO(dateA);
    fetchSnapshotOnOrBefore(iso).then((s) => {
      setLoansA(s?.data.loans ?? []);
      setEffA(s?.snapshot_date ?? null);
    }).catch((e) => toast.error(e.message));
  }, [dateA, open]);

  useEffect(() => {
    if (!open || !dateB) return;
    const iso = dateToISO(dateB);
    if (iso === todayISO()) {
      setLoansB(liveLoans);
      setEffB(iso);
      return;
    }
    fetchSnapshotOnOrBefore(iso).then((s) => {
      setLoansB(s?.data.loans ?? []);
      setEffB(s?.snapshot_date ?? null);
    }).catch((e) => toast.error(e.message));
  }, [dateB, open, liveLoans]);

  const rows = useMemo(() => {
    const map = new Map<string, { name: string; a?: Loan; b?: Loan }>();
    (loansA ?? []).forEach((l) => {
      const k = l.person_or_bank.trim().toLowerCase();
      map.set(k, { name: l.person_or_bank, a: l });
    });
    (loansB ?? []).forEach((l) => {
      const k = l.person_or_bank.trim().toLowerCase();
      const ex = map.get(k);
      if (ex) ex.b = l; else map.set(k, { name: l.person_or_bank, b: l });
    });
    return Array.from(map.values());
  }, [loansA, loansB]);

  const totalsA = computeTotals(loansA ?? []);
  const totalsB = computeTotals(loansB ?? []);

  const summary = useMemo(() => {
    let reduced = 0, completed = 0, increased = 0;
    rows.forEach((r) => {
      const dA = Number(r.a?.debt_remaining ?? 0);
      const dB = Number(r.b?.debt_remaining ?? 0);
      if (r.a && r.b) {
        if (dB < dA) reduced += 1;
        if (dB > dA) increased += 1;
        if (r.a.status !== "Completed" && r.b.status === "Completed") completed += 1;
      }
    });
    return { reduced, completed, increased };
  }, [rows]);

  const debtChange = totalsB.total_debt - totalsA.total_debt;
  const loanChange = totalsB.total_loan - totalsA.total_loan;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className="gap-1">
          <GitCompareArrows className="w-4 h-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Dates</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePick label="Date A" date={dateA} onChange={setDateA} effective={effA} />
          <DatePick label="Date B" date={dateB} onChange={setDateB} effective={effB} />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[140px]">Person / Bank</TableHead>
                <TableHead className="text-right">A Loan</TableHead>
                <TableHead className="text-right">B Loan</TableHead>
                <TableHead className="text-right">Loan Δ</TableHead>
                <TableHead className="text-right">A Debt</TableHead>
                <TableHead className="text-right">B Debt</TableHead>
                <TableHead className="text-right">Debt Δ</TableHead>
                <TableHead>Status A → B</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No data for these dates.</TableCell></TableRow>
              )}
              {rows.map((r) => {
                const aL = Number(r.a?.loan_amount ?? 0);
                const bL = Number(r.b?.loan_amount ?? 0);
                const aD = Number(r.a?.debt_remaining ?? 0);
                const bD = Number(r.b?.debt_remaining ?? 0);
                const dLoan = bL - aL;
                const dDebt = bD - aD;
                const becameCompleted = r.a && r.b && r.a.status !== "Completed" && r.b.status === "Completed";
                const anyChange = dLoan !== 0 || dDebt !== 0 || (r.a?.status !== r.b?.status);
                const rowClass = becameCompleted ? "bg-green-50" : anyChange ? "bg-yellow-50" : "";
                return (
                  <TableRow key={r.name} className={rowClass}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.a ? formatINR(aL) : "—"}</TableCell>
                    <TableCell className="text-right">{r.b ? formatINR(bL) : "—"}</TableCell>
                    <TableCell className="text-right"><Delta value={dLoan} invert /></TableCell>
                    <TableCell className="text-right">{r.a ? formatINR(aD) : "—"}</TableCell>
                    <TableCell className="text-right">{r.b ? formatINR(bD) : "—"}</TableCell>
                    <TableCell className="text-right"><Delta value={dDebt} /></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{r.a?.status ?? "—"} → {r.b?.status ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {rows.length > 0 && (
              <tfoot>
                <TableRow className="bg-muted/70 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatINR(totalsA.total_loan)}</TableCell>
                  <TableCell className="text-right">{formatINR(totalsB.total_loan)}</TableCell>
                  <TableCell className="text-right"><Delta value={loanChange} invert /></TableCell>
                  <TableCell className="text-right">{formatINR(totalsA.total_debt)}</TableCell>
                  <TableCell className="text-right">{formatINR(totalsB.total_debt)}</TableCell>
                  <TableCell className="text-right"><Delta value={debtChange} /></TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>

        {rows.length > 0 && (
          <div className="rounded-md border bg-slate-50 p-3 text-sm space-y-1">
            <p className="font-medium">
              Between {effA ?? "—"} and {effB ?? "—"}:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
              <li>{summary.reduced} {summary.reduced === 1 ? "loan" : "loans"} reduced their debt</li>
              <li>{summary.completed} {summary.completed === 1 ? "loan was" : "loans were"} fully completed</li>
              {summary.increased > 0 && <li>{summary.increased} {summary.increased === 1 ? "loan" : "loans"} increased their debt</li>}
              <li>
                Total debt {debtChange <= 0 ? "decreased" : "increased"} by{" "}
                <span className={debtChange <= 0 ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                  {formatINR(Math.abs(debtChange))}
                </span>
              </li>
              <li>
                Recovery rate {totalsB.recovery_rate >= totalsA.recovery_rate ? "improved" : "dropped"} from{" "}
                {totalsA.recovery_rate.toFixed(1)}% to {totalsB.recovery_rate.toFixed(1)}%
              </li>
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function DatePick({ label, date, onChange, effective }: { label: string; date?: Date; onChange: (d?: Date) => void; effective: string | null }) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-full", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={onChange} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {effective && date && effective !== dateToISO(date) && (
          <p className="text-[11px] text-muted-foreground">Using nearest earlier snapshot: {effective}</p>
        )}
      </div>
    );
  }
}

function Delta({ value, invert }: { value: number; invert?: boolean }) {
  if (value === 0) return <span className="inline-flex items-center gap-1 text-slate-400"><Minus className="w-3 h-3" /> —</span>;
  // For debt: decrease (negative) is GOOD (green).
  // For loan amount: use `invert` so an increase is neutralish; we still color decrease green.
  const good = invert ? value < 0 : value < 0;
  const cls = good ? "text-green-700" : "text-red-700";
  const Icon = value < 0 ? ArrowDown : ArrowUp;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", cls)}>
      <Icon className="w-3 h-3" /> {formatINR(Math.abs(value))}
    </span>
  );
}
