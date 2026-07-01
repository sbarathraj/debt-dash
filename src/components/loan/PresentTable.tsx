import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, X, ChevronDown } from "lucide-react";
import { type Loan, type LoanStatus } from "@/lib/loans";
import { formatINR } from "@/lib/format";

interface Props {
  loans: Loan[];
  onUpdate: (id: string, patch: Partial<Loan>) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: LoanStatus[] = ["Active", "Partially Paid", "Completed"];

function statusBadge(status: LoanStatus, showChevron = false) {
  const variants: Record<LoanStatus, string> = {
    Active: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/50",
    "Partially Paid": "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50",
  };
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 select-none cursor-pointer transition-colors",
        variants[status]
      )}
    >
      {status}
      {showChevron && <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />}
    </Badge>
  );
}

function EditableCell({
  children, onEdit, className = "",
}: { children: React.ReactNode; onEdit: () => void; className?: string }) {
  return (
    <div
      onClick={onEdit}
      title="Click to edit"
      className={`cursor-pointer group flex items-center gap-1 ${className}`}
    >
      <span className="group-hover:underline decoration-dashed underline-offset-2">{children}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" />
    </div>
  );
}

function EditableRow({
  loan, serial, onUpdate, onDelete,
}: { loan: Loan; serial: number; onUpdate: Props["onUpdate"]; onDelete: Props["onDelete"] }) {
  type Field = "name" | "amount" | "debt" | null;
  const [editing, setEditing] = useState<Field>(null);
  const [nameVal, setNameVal] = useState(loan.person_or_bank);
  const [amountVal, setAmountVal] = useState(String(loan.loan_amount));
  const [debtVal, setDebtVal] = useState(String(loan.debt_remaining));

  const commitName = () => {
    setEditing(null);
    if (nameVal.trim() && nameVal.trim() !== loan.person_or_bank)
      onUpdate(loan.id, { person_or_bank: nameVal.trim() });
  };
  const cancelName = () => { setEditing(null); setNameVal(loan.person_or_bank); };

  const commitAmount = () => {
    setEditing(null);
    const n = Number(amountVal) || 0;
    if (n !== loan.loan_amount) onUpdate(loan.id, { loan_amount: n });
  };
  const cancelAmount = () => { setEditing(null); setAmountVal(String(loan.loan_amount)); };

  const commitDebt = () => {
    setEditing(null);
    const n = Number(debtVal) || 0;
    const patch: Partial<Loan> = { debt_remaining: n };
    if (n === 0 && loan.status !== "Completed") patch.status = "Completed";
    else if (n > 0 && n < Number(loan.loan_amount) && loan.status === "Active") patch.status = "Partially Paid";
    else if (n > 0 && n >= Number(loan.loan_amount) && loan.status !== "Active") patch.status = "Active";
    if (n !== loan.debt_remaining) onUpdate(loan.id, patch);
  };
  const cancelDebt = () => { setEditing(null); setDebtVal(String(loan.debt_remaining)); };

  const amountPaid = Number(loan.loan_amount) - Number(loan.debt_remaining);

  const rowBg =
    loan.status === "Completed"
      ? "bg-emerald-50/40"
      : loan.status === "Partially Paid"
      ? "bg-amber-50/30"
      : "";

  return (
    <TableRow className={`hover:bg-slate-50/80 transition-colors ${rowBg}`}>
      {/* Serial */}
      <TableCell className="text-center text-muted-foreground font-medium text-sm w-10">
        {serial}
      </TableCell>

      {/* Name */}
      <TableCell className="min-w-[140px]">
        {editing === "name" ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") cancelName(); }}
              className="h-8 text-sm"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={commitName}><Check className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={cancelName}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : (
          <EditableCell onEdit={() => setEditing("name")}>
            <span className="font-medium">{loan.person_or_bank}</span>
          </EditableCell>
        )}
      </TableCell>

      {/* Loan Amount */}
      <TableCell className="text-right">
        {editing === "amount" ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              autoFocus
              type="number"
              value={amountVal}
              onChange={(e) => setAmountVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitAmount(); if (e.key === "Escape") cancelAmount(); }}
              className="h-8 text-right text-sm w-32"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={commitAmount}><Check className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={cancelAmount}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : (
          <EditableCell onEdit={() => setEditing("amount")} className="justify-end">
            <span className="font-semibold text-slate-700">{formatINR(Number(loan.loan_amount))}</span>
          </EditableCell>
        )}
      </TableCell>

      {/* Debt Remaining */}
      <TableCell className="text-right">
        {editing === "debt" ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              autoFocus
              type="number"
              value={debtVal}
              onChange={(e) => setDebtVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitDebt(); if (e.key === "Escape") cancelDebt(); }}
              className="h-8 text-right text-sm w-32"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={commitDebt}><Check className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={cancelDebt}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : (
          <EditableCell onEdit={() => setEditing("debt")} className="justify-end">
            <span className={`font-semibold ${Number(loan.debt_remaining) === 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatINR(Number(loan.debt_remaining))}
            </span>
          </EditableCell>
        )}
      </TableCell>

      {/* Amount Paid (auto-calculated) */}
      <TableCell className="text-right">
        <span className={`font-semibold ${amountPaid > 0 ? "text-emerald-600" : "text-slate-400"}`}>
          {formatINR(amountPaid)}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Select
          value={loan.status}
          onValueChange={(v) => onUpdate(loan.id, { status: v as LoanStatus })}
        >
          <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none hover:opacity-90 active:scale-95 transition-all [&>svg]:hidden">
            {statusBadge(loan.status, true)}
          </SelectTrigger>
          <SelectContent align="center" className="min-w-[125px] rounded-xl border border-slate-200 shadow-md p-1 bg-white">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs rounded-lg py-1.5 px-2 my-0.5 focus:bg-slate-50 focus:text-slate-900 cursor-pointer">
                {statusBadge(s, false)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setEditing("name")}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete loan entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>"{loan.person_or_bank}"</strong> from your current table.
                  Saved snapshots are not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(loan.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PresentTable({ loans, onUpdate, onDelete }: Props) {
  const totals = loans.reduce(
    (a, l) => ({
      loan: a.loan + Number(l.loan_amount || 0),
      debt: a.debt + Number(l.debt_remaining || 0),
      paid: a.paid + (Number(l.loan_amount || 0) - Number(l.debt_remaining || 0)),
    }),
    { loan: 0, debt: 0, paid: 0 },
  );

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 border-b-2 border-slate-200">
            <TableHead className="w-10 text-center text-xs font-bold text-slate-500 uppercase tracking-wide">#</TableHead>
            <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wide">Person / Bank</TableHead>
            <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Loan Amount</TableHead>
            <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Debt Remaining</TableHead>
            <TableHead className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Amount Paid</TableHead>
            <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</TableHead>
            <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="font-medium text-slate-500">No loans yet</p>
                  <p className="text-xs text-slate-400">Click "Add Loan" or "Start Today from Last Entry" to get started.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
          {loans.map((l, i) => (
            <EditableRow key={l.id} loan={l} serial={i + 1} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </TableBody>
        {loans.length > 0 && (
          <tfoot>
            <TableRow className="bg-slate-100 border-t-2 border-slate-200 font-bold">
              <TableCell />
              <TableCell className="text-sm text-slate-600 uppercase tracking-wide">Totals</TableCell>
              <TableCell className="text-right text-slate-700">{formatINR(totals.loan)}</TableCell>
              <TableCell className="text-right text-red-600">{formatINR(totals.debt)}</TableCell>
              <TableCell className="text-right text-emerald-600">{formatINR(totals.paid)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
}
