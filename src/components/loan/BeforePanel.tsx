import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, ArrowRight, ClipboardCopy } from "lucide-react";
import { format } from "date-fns";
import { fetchSnapshotOnOrBefore, type Loan, type SnapshotRow } from "@/lib/loans";
import { dateToISO, formatINR } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  snapshotDates: string[];
  onCopyToPresent: (loans: Loan[]) => Promise<void>;
}

export function BeforePanel({ snapshotDates, onCopyToPresent }: Props) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [snap, setSnap] = useState<SnapshotRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) { setSnap(null); return; }
    setLoading(true);
    fetchSnapshotOnOrBefore(dateToISO(date))
      .then(setSnap)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  const loans = snap?.data?.loans ?? [];
  const totals = snap?.data?.totals ?? { loan_amount: 0, debt_remaining: 0 };

  const snapshotDateSet = new Set(snapshotDates);
  const modifiers = {
    hasSnapshot: (d: Date) => snapshotDateSet.has(dateToISO(d)),
  };

  const copyToClipboard = async () => {
    if (!snap) return;
    const lines = [
      `Snapshot · ${snap.snapshot_date}`,
      `Person/Bank\tLoan Amount\tDebt Remaining\tStatus`,
      ...loans.map((l) => `${l.person_or_bank}\t${l.loan_amount}\t${l.debt_remaining}\t${l.status}`),
      `Total\t${totals.loan_amount}\t${totals.debt_remaining}\t`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Copied table to clipboard");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Before Date (Historical Snapshot)</CardTitle>
          <Badge variant="outline" className="bg-slate-50">Read-only</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal flex-1 min-w-[180px]", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a snapshot date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                modifiers={modifiers}
                modifiersClassNames={{ hasSnapshot: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-blue-500" }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={!snap || loans.length === 0} className="gap-1 bg-blue-600 hover:bg-blue-700">
                <ArrowRight className="w-4 h-4" /> Copy to Present Date
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Replace Present Date table?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace your current table with the snapshot from{" "}
                  <strong>{snap?.snapshot_date}</strong>. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => snap && onCopyToPresent(loans)}>Yes, replace</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="outline" onClick={copyToClipboard} disabled={!snap} className="gap-1">
            <ClipboardCopy className="w-4 h-4" /> Copy
          </Button>
        </div>
        {snap && (
          <p className="text-xs text-muted-foreground">
            Showing snapshot from <strong>{snap.snapshot_date}</strong>
            {date && snap.snapshot_date !== dateToISO(date) && " (closest before selected date)"}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
        ) : !date ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Pick a date to load a snapshot.</p>
        ) : !snap ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No snapshot found on or before this date.</p>
        ) : (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Person / Bank</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">Debt Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.person_or_bank}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(l.loan_amount))}</TableCell>
                    <TableCell className="text-right text-red-600">{formatINR(Number(l.debt_remaining))}</TableCell>
                    <TableCell>{l.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted/70 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatINR(Number(totals.loan_amount))}</TableCell>
                  <TableCell className="text-right text-red-600">{formatINR(Number(totals.debt_remaining))}</TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
