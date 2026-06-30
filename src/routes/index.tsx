import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardCopy, LogOut, Wallet } from "lucide-react";
import {
  fetchLoans, fetchSnapshotDates, saveTodaySnapshot, computeTotals,
  type Loan,
} from "@/lib/loans";
import { formatINR, todayISO } from "@/lib/format";
import { SummaryCards } from "@/components/loan/SummaryCards";
import { PresentTable } from "@/components/loan/PresentTable";
import { BeforePanel } from "@/components/loan/BeforePanel";
import { AddLoanDialog } from "@/components/loan/AddLoanDialog";
import { SmartSuggestions } from "@/components/loan/SmartSuggestions";
import { SnapshotHistory } from "@/components/loan/SnapshotHistory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loan & Debt Tracker" },
      { name: "description", content: "Track loans and debts with daily snapshots and smart payoff suggestions." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [snapshotDates, setSnapshotDates] = useState<string[]>([]);
  const saveTimer = useRef<number | null>(null);

  // Auth gate
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
      else setUserEmail(session.user.email ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  // Initial data load
  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      try {
        const [l, dates] = await Promise.all([fetchLoans(), fetchSnapshotDates()]);
        setLoans(l);
        setSnapshotDates(dates);
      } catch (e: any) {
        toast.error(e.message);
      }
    })();
  }, [authChecked]);

  const scheduleSnapshot = useCallback((next: Loan[]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveTodaySnapshot(next);
        setSnapshotDates((prev) => (prev.includes(todayISO()) ? prev : [todayISO(), ...prev]));
      } catch (e: any) {
        toast.error("Snapshot save failed: " + e.message);
      }
    }, 600);
  }, []);

  const handleAdd = async (entry: {
    person_or_bank: string; loan_amount: number; debt_remaining: number; notes: string | null;
  }) => {
    const { data: u } = await supabase.auth.getUser();
    const status: Loan["status"] = entry.debt_remaining === 0 ? "Completed"
      : entry.debt_remaining < entry.loan_amount ? "Partially Paid" : "Active";
    const { data, error } = await supabase
      .from("loans")
      .insert({ ...entry, status, user_id: u.user!.id })
      .select()
      .single();
    if (error) toast.error(error.message);
    const next = [...loans, data as unknown as Loan];
    setLoans(next);
    scheduleSnapshot(next);
    toast.success("Loan added");
  };

  const handleUpdate = async (id: string, patch: Partial<Loan>) => {
    const next = loans.map((l) => (l.id === id ? { ...l, ...patch, last_updated: new Date().toISOString() } : l));
    setLoans(next);
    const { error } = await supabase.from("loans").update({ ...patch, last_updated: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    scheduleSnapshot(next);
  };

  const handleDelete = async (id: string) => {
    const next = loans.filter((l) => l.id !== id);
    setLoans(next);
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) toast.error(error.message);
    scheduleSnapshot(next);
    toast.success("Loan deleted");
  };

  const handleCopyToPresent = async (incoming: Loan[]) => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user!.id;
    // wipe & replace
    const { error: delErr } = await supabase.from("loans").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) toast.error(delErr.message);
    const rows = incoming.map((l) => ({
      user_id: userId,
      person_or_bank: l.person_or_bank,
      loan_amount: Number(l.loan_amount) || 0,
      debt_remaining: Number(l.debt_remaining) || 0,
      status: l.status,
      notes: l.notes,
    }));
    let inserted: Loan[] = [];
    if (rows.length > 0) {
      const { data, error } = await supabase.from("loans").insert(rows).select();
      if (error) toast.error(error.message);
      inserted = (data ?? []) as unknown as Loan[];
    }
    setLoans(inserted);
    scheduleSnapshot(inserted);
    toast.success("Copied snapshot to Present Date");
  };

  const handleSnapshotDelete = async (date: string) => {
    const { error } = await supabase.from("snapshots").delete().eq("snapshot_date", date);
    if (error) toast.error(error.message);
    setSnapshotDates((p) => p.filter((d) => d !== date));
    toast.success("Snapshot deleted");
  };

  const copyPresentToClipboard = async () => {
    const totals = computeTotals(loans);
    const lines = [
      `Loan Tracker · ${todayISO()}`,
      `Person/Bank\tLoan Amount\tDebt Remaining\tStatus`,
      ...loans.map((l) => `${l.person_or_bank}\t${l.loan_amount}\t${l.debt_remaining}\t${l.status}`),
      `Total\t${totals.total_loan}\t${totals.total_debt}\t`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Copied table to clipboard");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const totals = computeTotals(loans);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Loan & Debt Tracker</h1>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SnapshotHistory dates={snapshotDates} onDelete={handleSnapshotDelete} />
            <Button variant="outline" size="sm" onClick={signOut} className="gap-1">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <SummaryCards
          count={loans.length}
          totalLoan={totals.total_loan}
          totalDebt={totals.total_debt}
          recovered={totals.recovered}
          recoveryRate={totals.recovery_rate}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BeforePanel snapshotDates={snapshotDates} onCopyToPresent={handleCopyToPresent} />

          <Card className="flex flex-col">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Present Date (Current)</CardTitle>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{todayISO()}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <AddLoanDialog onAdd={handleAdd} />
                <Button size="sm" variant="outline" onClick={copyPresentToClipboard} className="gap-1">
                  <ClipboardCopy className="w-4 h-4" /> Copy
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Totals: {formatINR(totals.total_loan)} loaned · {formatINR(totals.total_debt)} due
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <PresentTable loans={loans} onUpdate={handleUpdate} onDelete={handleDelete} />
            </CardContent>
          </Card>
        </div>

        <SmartSuggestions loans={loans} />

        <p className="text-center text-xs text-muted-foreground py-4">
          Tip: Pick yesterday's snapshot → Copy to Present Date → edit only what changed. Today's snapshot saves automatically.
        </p>
      </main>
    </div>
  );
}
