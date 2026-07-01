import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClipboardCopy, LogOut, Wallet, Calendar, History } from "lucide-react";
import {
  fetchLoans, saveTodaySnapshot, computeTotals, logLoanChange,
  type Loan,
} from "@/lib/loans";
import { formatINR, todayISO } from "@/lib/format";
import { SummaryCards } from "@/components/loan/SummaryCards";
import { PresentTable } from "@/components/loan/PresentTable";
import { AddLoanDialog } from "@/components/loan/AddLoanDialog";
import { SmartSuggestions } from "@/components/loan/SmartSuggestions";
import { InsightsButton } from "@/components/loan/InsightsButton";
import { HistoryTab } from "@/components/loan/HistoryTab";
import { PayoffSimulator } from "@/components/loan/PayoffSimulator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loan & Debt Tracker" },
      { name: "description", content: "Track loans and debts with daily snapshots, smart payoff suggestions, and progress comparison." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [historyKey, setHistoryKey] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const saveStatusTimer = useRef<number | null>(null);

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
        const l = await fetchLoans();
        setLoans(l);
      } catch (e: any) {
        toast.error(e.message);
      }
    })();
  }, [authChecked]);

  /** Debounced snapshot save — fires 1s after last change */
  const scheduleSnapshot = useCallback((next: Loan[]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus("idle");
    saveTimer.current = window.setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveTodaySnapshot(next);
        setSaveStatus("saved");
        setHistoryKey((k) => k + 1); // refresh history
        if (saveStatusTimer.current) window.clearTimeout(saveStatusTimer.current);
        saveStatusTimer.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (e: any) {
        setSaveStatus("idle");
        toast.error("Snapshot save failed: " + e.message);
      }
    }, 1000);
  }, []);

  /** Immediate snapshot save — for Completed status, CopyToday, etc. */
  const saveNow = useCallback(async (next: Loan[], label = "Snapshot saved") => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    try {
      await saveTodaySnapshot(next);
      setSaveStatus("saved");
      setHistoryKey((k) => k + 1); // refresh history
      toast.success(label, { duration: 2500 });
      if (saveStatusTimer.current) window.clearTimeout(saveStatusTimer.current);
      saveStatusTimer.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: any) {
      setSaveStatus("idle");
      toast.error("Save failed: " + e.message);
    }
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
    if (error) { toast.error(error.message); return; }
    const next = [...loans, data as unknown as Loan];
    setLoans(next);
    toast.success(`Added "${entry.person_or_bank}" successfully`);
    // Log the change
    await logLoanChange({
      action: "add",
      loan_id: (data as any).id,
      person_name: entry.person_or_bank,
      new_value: `Added loan of ${formatINR(entry.loan_amount)} with remaining debt of ${formatINR(entry.debt_remaining)}`,
      note: `Added new loan entry for ${entry.person_or_bank}`
    });
    // Immediately save so it shows in history right away
    await saveNow(next, `✅ "${entry.person_or_bank}" added — snapshot saved!`);
  };

  const handleUpdate = async (id: string, patch: Partial<Loan>) => {
    const oldLoan = loans.find((l) => l.id === id);
    const next = loans.map((l) => (l.id === id ? { ...l, ...patch, last_updated: new Date().toISOString() } : l));
    setLoans(next);
    const { error } = await supabase.from("loans").update({ ...patch, last_updated: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }

    // Log the specific change
    if (oldLoan) {
      if (patch.person_or_bank !== undefined && patch.person_or_bank !== oldLoan.person_or_bank) {
        await logLoanChange({
          action: "edit",
          loan_id: id,
          person_name: patch.person_or_bank,
          field_name: "person_or_bank",
          old_value: oldLoan.person_or_bank,
          new_value: patch.person_or_bank,
          note: `Renamed "${oldLoan.person_or_bank}" to "${patch.person_or_bank}"`
        });
      }
      if (patch.loan_amount !== undefined && Number(patch.loan_amount) !== oldLoan.loan_amount) {
        await logLoanChange({
          action: "edit",
          loan_id: id,
          person_name: oldLoan.person_or_bank,
          field_name: "loan_amount",
          old_value: String(oldLoan.loan_amount),
          new_value: String(patch.loan_amount),
          note: `Changed loan amount for "${oldLoan.person_or_bank}" from ${formatINR(oldLoan.loan_amount)} to ${formatINR(Number(patch.loan_amount))}`
        });
      }
      if (patch.debt_remaining !== undefined && Number(patch.debt_remaining) !== oldLoan.debt_remaining) {
        await logLoanChange({
          action: "edit",
          loan_id: id,
          person_name: oldLoan.person_or_bank,
          field_name: "debt_remaining",
          old_value: String(oldLoan.debt_remaining),
          new_value: String(patch.debt_remaining),
          note: `Changed debt remaining for "${oldLoan.person_or_bank}" from ${formatINR(oldLoan.debt_remaining)} to ${formatINR(Number(patch.debt_remaining))}`
        });
      }
      if (patch.status !== undefined && patch.status !== oldLoan.status) {
        const isCompleteAction = patch.status === "Completed";
        await logLoanChange({
          action: isCompleteAction ? "complete" : "edit",
          loan_id: id,
          person_name: oldLoan.person_or_bank,
          field_name: "status",
          old_value: oldLoan.status,
          new_value: patch.status,
          note: isCompleteAction 
            ? `Marked "${oldLoan.person_or_bank}" as Completed!` 
            : `Changed status of "${oldLoan.person_or_bank}" to ${patch.status}`
        });
      }
    }

    // Completed → immediate save to lock into history
    if (patch.status === "Completed") {
      const loan = loans.find((l) => l.id === id);
      await saveNow(next, `✅ "${loan?.person_or_bank}" completed — saved to history!`);
    } else {
      // Any other change → debounced save
      scheduleSnapshot(next);
    }
  };

  const handleDelete = async (id: string) => {
    const loan = loans.find((l) => l.id === id);
    const next = loans.filter((l) => l.id !== id);
    setLoans(next);
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    
    if (loan) {
      await logLoanChange({
        action: "delete",
        loan_id: id,
        person_name: loan.person_or_bank,
        old_value: `Loan: ${formatINR(loan.loan_amount)}, Debt: ${formatINR(loan.debt_remaining)}`,
        note: `Deleted loan entry for ${loan.person_or_bank}`
      });
    }
    
    scheduleSnapshot(next);
    toast.success(`"${loan?.person_or_bank ?? "Entry"}" deleted`);
  };

  const handleCopyToPresent = async (incoming: Loan[]) => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user!.id;
    const { error: delErr } = await supabase.from("loans").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) { toast.error(delErr.message); return; }
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
      if (error) { toast.error(error.message); return; }
      inserted = (data ?? []) as unknown as Loan[];
    }
    setLoans(inserted);

    await logLoanChange({
      action: "copy",
      loan_id: null,
      person_name: "System",
      note: `Copied ${incoming.length} entries from the previous day's snapshot.`
    });

    await saveNow(inserted, `📋 ${inserted.length} entries loaded — snapshot saved!`);
  };

  const copyTableToClipboard = async () => {
    const totals = computeTotals(loans);
    const lines = [
      `Loan & Debt Tracker · ${todayISO()}`,
      `─────────────────────────────────────`,
      `#\tPerson/Bank\tLoan Amount\tDebt Remaining\tAmount Paid\tStatus`,
      ...loans.map((l, i) => {
        const paid = Number(l.loan_amount) - Number(l.debt_remaining);
        return `${i + 1}\t${l.person_or_bank}\t${formatINR(Number(l.loan_amount))}\t${formatINR(Number(l.debt_remaining))}\t${formatINR(paid)}\t${l.status}`;
      }),
      `─────────────────────────────────────`,
      `\tTotals\t${formatINR(totals.total_loan)}\t${formatINR(totals.total_debt)}\t${formatINR(totals.recovered)}\t`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Table copied to clipboard!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const totals = computeTotals(loans);
  const displayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/20 via-slate-50 to-violet-50/30 pb-12 transition-all duration-300">
      {/* ── Sticky Header ── */}
      <header className="bg-gradient-to-r from-fuchsia-800 via-rose-700 to-purple-800 text-white shadow-md border-b border-rose-800/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shadow-inner border border-white/10 animate-pulse">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white flex items-center gap-1.5">
                Loan & Debt Tracker
              </h1>
              <p className="text-xs text-white/70">{userEmail}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Save status pill in header */}
            {saveStatus === "saving" && (
              <span className="text-xs text-amber-100 flex items-center gap-1 font-medium px-2 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                Saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-emerald-100 flex items-center gap-1 font-medium px-2 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                ✓ Saved
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-1.5 border-white/10 hover:border-red-400/50 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── Summary Cards (always visible) ── */}
        <SummaryCards
          count={loans.length}
          totalLoan={totals.total_loan}
          totalDebt={totals.total_debt}
          recovered={totals.recovered}
          recoveryRate={totals.recovery_rate}
        />

        {/* ── Main Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const tab = v as "today" | "history";
            setActiveTab(tab);
            // Refresh history when switching to it
            if (tab === "history") setHistoryKey((k) => k + 1);
          }}
        >
          <TabsList className="w-full sm:w-auto h-10 bg-white border border-slate-200 shadow-sm rounded-xl p-1">
            <TabsTrigger
              value="today"
              className="flex-1 sm:flex-none gap-1.5 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 font-medium transition-all"
            >
              <Calendar className="w-4 h-4" />
              Today's Tracker
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 sm:flex-none gap-1.5 rounded-lg data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 font-medium transition-all"
            >
              <History className="w-4 h-4" />
              History
              {/* badge if there are snapshots */}
            </TabsTrigger>
          </TabsList>

          {/* ──────────────────── TODAY TAB ──────────────────── */}
          <TabsContent value="today" className="mt-4 space-y-6">
            {/* Loan Table Card */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100">
                {/* Title row */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl font-bold text-slate-800">
                      Today's Loan Tracker
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border gap-1 font-medium">
                      <Calendar className="w-3 h-3" />
                      {todayISO()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{displayDate}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <AddLoanDialog onAdd={handleAdd} />
                  <InsightsButton loans={loans} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyTableToClipboard}
                    className="gap-1.5 text-slate-600 hover:text-slate-800 ml-auto"
                  >
                    <ClipboardCopy className="w-4 h-4" />
                    Copy Table
                  </Button>
                </div>

                {/* Save indicator */}
                <div className="flex items-center gap-1.5 mt-2">
                  {saveStatus === "saving" && (
                    <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Saving to history…
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ✓ Saved to history — visible in the History tab
                    </span>
                  )}
                  {saveStatus === "idle" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
                      Changes auto-save as today's snapshot
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 pt-0">
                <div className="p-4">
                  <PresentTable loans={loans} onUpdate={handleUpdate} onDelete={handleDelete} />
                </div>
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            <SmartSuggestions loans={loans} />

            {/* Smart Payoff Simulator (Advanced Feature) */}
            <PayoffSimulator loans={loans} />

            {/* Daily workflow tip */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                💡 Daily Workflow
              </h3>
              <ol className="text-sm text-slate-500 space-y-1 list-decimal list-inside leading-relaxed">
                <li><strong className="text-slate-700">Add Loans</strong> — Use "+ Add Loan" to record new active debts.</li>
                <li><strong className="text-slate-700">Quick Edit</strong> — Click directly on names or debt amounts in the table to edit them instantly.</li>
                <li><strong className="text-slate-700">Auto-save</strong> — Every letter or number edit is saved to the activity log in real-time.</li>
                <li><strong className="text-slate-700">Simulate</strong> — Use the Smart Payoff Simulator above to plan monthly payoff budgets!</li>
                <li><strong className="text-slate-700">History</strong> — Switch to the "History" tab to see all tracked updates chronologically.</li>
              </ol>
            </div>
          </TabsContent>

          {/* ──────────────────── HISTORY TAB ──────────────────── */}
          <TabsContent value="history" className="mt-4">
            <HistoryTab refreshKey={historyKey} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
