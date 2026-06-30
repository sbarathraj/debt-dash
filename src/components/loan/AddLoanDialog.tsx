import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface Props {
  onAdd: (entry: {
    person_or_bank: string;
    loan_amount: number;
    debt_remaining: number;
    notes: string | null;
  }) => Promise<void>;
}

export function AddLoanDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loan, setLoan] = useState("");
  const [debt, setDebt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        person_or_bank: name.trim(),
        loan_amount: Number(loan) || 0,
        debt_remaining: debt === "" ? Number(loan) || 0 : Number(debt) || 0,
        notes: notes.trim() || null,
      });
      setName(""); setLoan(""); setDebt(""); setNotes("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Add Loan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Loan Entry</DialogTitle>
          <DialogDescription>Add a new loan or debt to track.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pname">Person / Bank Name *</Label>
            <Input id="pname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul / HDFC Bank" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Loan Amount *</Label>
              <Input id="amount" type="number" required min={0} value={loan} onChange={(e) => setLoan(e.target.value)} placeholder="50000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="debt">Debt Remaining</Label>
              <Input id="debt" type="number" min={0} value={debt} onChange={(e) => setDebt(e.target.value)} placeholder="defaults to loan amount" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Loan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
