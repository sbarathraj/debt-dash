import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchSnapshotOnOrBefore, type Loan } from "@/lib/loans";
import { formatINR, todayISO } from "@/lib/format";

interface Props {
  currentLoans: Loan[];
  onReplace: (loans: Loan[]) => Promise<void>;
  onMerge: (loans: Loan[]) => Promise<void>;
}

export function CopyYesterdayButton({ currentLoans, onReplace, onMerge }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapDate, setSnapDate] = useState<string | null>(null);
  const [snapLoans, setSnapLoans] = useState<Loan[]>([]);
  const [busy, setBusy] = useState(false);

  const openDialog = async () => {
    setLoading(true);
    setOpen(true);
    try {
      // most recent snapshot strictly before today; fall back to any snapshot
      const today = todayISO();
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yy = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      let snap = await fetchSnapshotOnOrBefore(yy);
      if (!snap) snap = await fetchSnapshotOnOrBefore(today);
      if (!snap || snap.snapshot_date === today && snap.data.loans.length === currentLoans.length) {
        // if only today's snapshot exists, still show it but warn
      }
      if (!snap) {
        toast.error("No previous snapshot found");
        setOpen(false);
        return;
      }
      setSnapDate(snap.snapshot_date);
      setSnapLoans(snap.data.loans ?? []);
    } catch (e: any) {
      toast.error(e.message);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const totals = snapLoans.reduce(
    (a, l) => ({
      loan: a.loan + Number(l.loan_amount || 0),
      debt: a.debt + Number(l.debt_remaining || 0),
    }),
    { loan: 0, debt: 0 },
  );

  const hasExisting = currentLoans.length > 0;

  const doReplace = async () => {
    setBusy(true);
    try { await onReplace(snapLoans); setOpen(false); }
    finally { setBusy(false); }
  };
  const doMerge = async () => {
    setBusy(true);
    try {
      const existingNames = new Set(currentLoans.map((l) => l.person_or_bank.trim().toLowerCase()));
      const toAdd = snapLoans.filter((l) => !existingNames.has(l.person_or_bank.trim().toLowerCase()));
      if (toAdd.length === 0) {
        toast.info("No new entries to merge — all names already exist today");
      } else {
        await onMerge(toAdd);
      }
      setOpen(false);
    } finally { setBusy(false); }
  };
  const doCopy = async () => {
    // no existing data → simple copy = replace
    await doReplace();
  };

  return (
    <>
      <Button size="sm" onClick={openDialog} className="gap-1 bg-blue-600 hover:bg-blue-700">
        <CalendarClock className="w-4 h-4" /> Copy Yesterday's Data
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy previous snapshot to today</DialogTitle>
            <DialogDescription>
              {loading
                ? "Looking for the most recent snapshot..."
                : snapDate
                ? `Found snapshot from ${snapDate} with ${snapLoans.length} ${snapLoans.length === 1 ? "entry" : "entries"}. Copy all entries to today?`
                : "No snapshot found."}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : snapDate && (
            <div className="rounded-md border bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Entries</span><span className="font-medium">{snapLoans.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total loan amount</span><span className="font-medium">{formatINR(totals.loan)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total debt remaining</span><span className="font-medium text-red-600">{formatINR(totals.debt)}</span></div>
            </div>
          )}

          {snapDate && hasExisting && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              Today's table already has {currentLoans.length} {currentLoans.length === 1 ? "entry" : "entries"}. Do you want to replace all entries or merge with existing entries?
            </p>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            {snapDate && hasExisting ? (
              <>
                <Button variant="outline" onClick={doMerge} disabled={busy}>Merge new entries</Button>
                <Button onClick={doReplace} disabled={busy} className="bg-blue-600 hover:bg-blue-700">Replace all</Button>
              </>
            ) : snapDate ? (
              <Button onClick={doCopy} disabled={busy} className="bg-blue-600 hover:bg-blue-700">Copy to today</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
