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

export interface LoanChange {
  id?: string;
  user_id?: string;
  loan_id?: string | null;
  changed_at: string;
  action: "add" | "edit" | "delete" | "copy" | "complete";
  person_name: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  note?: string | null;
}

export interface SnapshotRow {
  snapshot_date: string;
  data: {
    loans: Loan[];
    totals: { loan_amount: number; debt_remaining: number };
  };
}

export async function logLoanChange(change: Omit<LoanChange, "user_id" | "changed_at">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const changedAt = new Date().toISOString();

  const fullChange = {
    ...change,
    user_id: userId || "local-user",
    changed_at: changedAt,
  };

  // 1. Try to save to Supabase
  if (userId) {
    try {
      const { error } = await supabase.from("loan_changes" as any).insert({
        user_id: userId,
        loan_id: change.loan_id,
        action: change.action,
        person_name: change.person_name,
        field_name: change.field_name,
        old_value: change.old_value,
        new_value: change.new_value,
        note: change.note,
        changed_at: changedAt,
      });
      if (!error) {
        return;
      }
      console.warn("Supabase insert failed, saving locally:", error.message);
    } catch (e: any) {
      console.warn("Supabase insert error, saving locally:", e.message || e);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    const key = `debt_dash_local_changes_${userId || "default"}`;
    const localData = localStorage.getItem(key);
    const list = localData ? JSON.parse(localData) : [];
    list.unshift(fullChange);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
}

export async function fetchLoanChanges(): Promise<LoanChange[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  let dbChanges: LoanChange[] = [];

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("loan_changes" as any)
        .select("*")
        .order("changed_at", { ascending: false });
      if (!error && data) {
        dbChanges = data as unknown as LoanChange[];
      }
    } catch (e) {
      console.warn("Fetch loan_changes from Supabase failed:", e);
    }
  }

  // Fetch local fallback changes
  let localChanges: LoanChange[] = [];
  try {
    const key = `debt_dash_local_changes_${userId || "default"}`;
    const localData = localStorage.getItem(key);
    if (localData) {
      localChanges = JSON.parse(localData);
    }
  } catch (e) {
    console.error("Local storage load error:", e);
  }

  // Merge and sort newest first
  const merged = [...dbChanges, ...localChanges];
  merged.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  return merged;
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

/** Returns the most recent snapshot whose date is strictly before today (IST). */
export async function fetchLastSnapshotBeforeToday(): Promise<SnapshotRow | null> {
  const today = todayISO();
  const { data, error } = await supabase
    .from("snapshots")
    .select("snapshot_date, data")
    .lt("snapshot_date", today)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SnapshotRow) ?? null;
}

/** Returns ALL snapshots for the current user, newest first. */
export async function fetchAllSnapshots(): Promise<SnapshotRow[]> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("snapshot_date, data")
    .order("snapshot_date", { ascending: false });
  if (error) throw error;
  return (data as unknown as SnapshotRow[]) ?? [];
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
