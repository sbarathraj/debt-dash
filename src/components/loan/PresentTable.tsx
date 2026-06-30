import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { type Loan, type LoanStatus } from "@/lib/loans";
import { formatINR } from "@/lib/format";

interface Props {
  loans: Loan[];
  onUpdate: (id: string, patch: Partial<Loan>) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: LoanStatus[] = ["Active", "Partially Paid", "Completed"];

function statusBadge(status: LoanStatus) {
  const variants: Record<LoanStatus, string> = {
    Active: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    "Partially Paid": "bg-amber-100 text-amber-700 hover:bg-amber-100",
    Completed: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  };
  return <Badge variant="secondary" className={variants[status]}>{status}</Badge>;
}

export function PresentTable({ loans, onUpdate, onDelete }: Props) {
  const totals = loans.reduce(
    (a, l) => ({
      loan: a.loan + Number(l.loan_amount || 0),
      debt: a.debt + Number(l.debt_remaining || 0),
    }),
    { loan: 0, debt: 0 },
  );

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Person / Bank</TableHead>
            <TableHead className="text-right">Loan Amount</TableHead>
            <TableHead className="text-right">Debt Remaining</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No loans yet. Click "Add Loan" to get started.
              </TableCell>
            </TableRow>
          )}
          {loans.map((l) => (
            <EditableRow key={l.id} loan={l} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </TableBody>
        {loans.length > 0 && (
          <tfoot>
            <TableRow className="bg-muted/70 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatINR(totals.loan)}</TableCell>
              <TableCell className="text-right text-red-600">{formatINR(totals.debt)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );

  function EditableRow({
    loan, onUpdate, onDelete,
  }: { loan: Loan; onUpdate: Props["onUpdate"]; onDelete: Props["onDelete"] }) {
    const [editing, setEditing] = useState<null | "name" | "amount" | "debt">(null);
    const [nameVal, setNameVal] = useState(loan.person_or_bank);
    const [amountVal, setAmountVal] = useState(String(loan.loan_amount));
    const [debtVal, setDebtVal] = useState(String(loan.debt_remaining));

    const commitName = () => {
      setEditing(null);
      if (nameVal !== loan.person_or_bank) onUpdate(loan.id, { person_or_bank: nameVal });
    };
    const commitAmount = () => {
      setEditing(null);
      const n = Number(amountVal) || 0;
      if (n !== loan.loan_amount) onUpdate(loan.id, { loan_amount: n });
    };
    const commitDebt = () => {
      setEditing(null);
      const n = Number(debtVal) || 0;
      const patch: Partial<Loan> = { debt_remaining: n };
      if (n === 0 && loan.status !== "Completed") patch.status = "Completed";
      if (n !== loan.debt_remaining) onUpdate(loan.id, patch);
    };

    return (
      <TableRow>
        <TableCell onClick={() => setEditing("name")} className="cursor-pointer min-w-[140px]">
          {editing === "name" ? (
            <Input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={commitName}
              onKeyDown={(e) => e.key === "Enter" && commitName()} className="h-8" />
          ) : (
            <span className="hover:underline">{loan.person_or_bank}</span>
          )}
        </TableCell>
        <TableCell onClick={() => setEditing("amount")} className="cursor-pointer text-right">
          {editing === "amount" ? (
            <Input autoFocus type="number" value={amountVal} onChange={(e) => setAmountVal(e.target.value)} onBlur={commitAmount}
              onKeyDown={(e) => e.key === "Enter" && commitAmount()} className="h-8 text-right" />
          ) : (
            <span className="hover:underline">{formatINR(Number(loan.loan_amount))}</span>
          )}
        </TableCell>
        <TableCell onClick={() => setEditing("debt")} className="cursor-pointer text-right">
          {editing === "debt" ? (
            <Input autoFocus type="number" value={debtVal} onChange={(e) => setDebtVal(e.target.value)} onBlur={commitDebt}
              onKeyDown={(e) => e.key === "Enter" && commitDebt()} className="h-8 text-right" />
          ) : (
            <span className="hover:underline text-red-600">{formatINR(Number(loan.debt_remaining))}</span>
          )}
        </TableCell>
        <TableCell>
          <Select value={loan.status} onValueChange={(v) => onUpdate(loan.id, { status: v as LoanStatus })}>
            <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent shadow-none p-0">
              <SelectValue>{statusBadge(loan.status)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete loan entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{loan.person_or_bank}" from your current table. Snapshots are not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(loan.id)} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      </TableRow>
    );
  }
}
