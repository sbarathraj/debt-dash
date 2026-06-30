import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./format";

export type LoanStatus = "Active" | "Partially Paid" | "Completed";

export interface Loan {
  id: string;
  person_or_bank: string;
  loan_amount: number;
  debt_remaining: number;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  last_updated: string;
}

export interface SnapshotRow {
  snapshot_date: string;
  data: {
    loans: Loan[];
    totals: { loan_amount: number; debt_remaining: number };
  };
}

export async function fetchLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Loan[];
}

export async function fetchSnapshotDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.snapshot_date as string);
}

export async function fetchSnapshotOnOrBefore(date: string): Promise<SnapshotRow | null> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("snapshot_date, data")
    .lte("snapshot_date", date)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SnapshotRow) ?? null;
}

export async function deleteSnapshot(date: string) {
  const { error } = await supabase.from("snapshots").delete().eq("snapshot_date", date);
  if (error) throw error;
}

export async function saveTodaySnapshot(loans: Loan[]) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const totals = loans.reduce(
    (acc, l) => ({
      loan_amount: acc.loan_amount + Number(l.loan_amount || 0),
      debt_remaining: acc.debt_remaining + Number(l.debt_remaining || 0),
    }),
    { loan_amount: 0, debt_remaining: 0 },
  );
  const payload = {
    user_id: userId,
    snapshot_date: todayISO(),
    data: { loans, totals },
  };
  const { error } = await supabase.from("snapshots").upsert(payload as any, {
    onConflict: "user_id,snapshot_date",
  });
  if (error) throw error;
}

export function computeTotals(loans: Loan[]) {
  const total_loan = loans.reduce((s, l) => s + Number(l.loan_amount || 0), 0);
  const total_debt = loans.reduce((s, l) => s + Number(l.debt_remaining || 0), 0);
  const recovered = total_loan - total_debt;
  const recovery_rate = total_loan > 0 ? (recovered / total_loan) * 100 : 0;
  return { total_loan, total_debt, recovered, recovery_rate };
}
