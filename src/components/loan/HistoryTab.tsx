import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, TrendingDown, TrendingUp, InboxIcon, RefreshCw, History, Search,
} from "lucide-react";
import { fetchLoanChanges, type LoanChange } from "@/lib/loans";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  refreshKey?: number;
}

export function HistoryTab({ refreshKey }: Props) {
  const [changes, setChanges] = useState<LoanChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const prevKey = useRef<number | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const changeData = await fetchLoanChanges();
      setChanges(changeData);
    } catch (e: any) {
      toast.error("Failed to load activity logs: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prevKey.current !== refreshKey) {
      prevKey.current = refreshKey;
      load();
    }
  }, [refreshKey]);

  useEffect(() => { load(); }, []);

  // Filter logs by search query
  const filteredChanges = changes.filter((c) =>
    c.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.field_name && c.field_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.note && c.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper: Get how many times a person has been edited
  const getEditCountForPerson = (name: string) => {
    return changes.filter(
      (c) => c.person_name.trim().toLowerCase() === name.trim().toLowerCase() && c.action === "edit"
    ).length;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        <p className="text-sm font-medium">Loading history logs…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base leading-tight">Activity History</h2>
            <p className="text-xs text-muted-foreground">
              {changes.length} change log{changes.length !== 1 ? "s" : ""} recorded in real-time
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          className="gap-1.5 text-slate-600 h-9"
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Search & filter bar */}
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <Input
          placeholder="Filter history by person, field name, action (e.g. edit, delete)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 border-0 shadow-none focus-visible:ring-0 p-0 text-sm placeholder:text-slate-400"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="h-7 text-xs text-slate-400 hover:text-slate-600 px-2"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Activity Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredChanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <InboxIcon className="w-12 h-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No history records found</p>
            <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
              {searchQuery ? "No matches for your query." : "Every single letter/number edit is tracked here in real-time."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="w-[140px] text-[11px] font-bold text-slate-500 uppercase tracking-wide">Date & Time</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Person / Bank</TableHead>
                  <TableHead className="w-[90px] text-[11px] font-bold text-slate-500 uppercase tracking-wide">Action</TableHead>
                  <TableHead className="w-[100px] text-[11px] font-bold text-slate-500 uppercase tracking-wide">Field</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Prev Value</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">New Value</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Change</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wide min-w-[220px]">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChanges.map((log, idx) => {
                  const date = new Date(log.changed_at);
                  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  
                  const editCount = getEditCountForPerson(log.person_name);
                  const isAmountField = log.field_name && (log.field_name.includes("amount") || log.field_name.includes("debt"));
                  
                  const formatVal = (val: string | null | undefined) => {
                    if (!val) return "—";
                    if (isAmountField) return formatINR(Number(val));
                    return val;
                  };

                  const getChangeDelta = () => {
                    if (log.action === "edit" && isAmountField && log.old_value && log.new_value) {
                      const oldNum = Number(log.old_value);
                      const newNum = Number(log.new_value);
                      const diff = oldNum - newNum; // positive = reduced
                      if (diff > 0) return <span className="text-emerald-600 font-bold text-xs flex items-center justify-end gap-0.5"><TrendingDown className="w-3 h-3" /> -{formatINR(diff)}</span>;
                      if (diff < 0) return <span className="text-red-600 font-bold text-xs flex items-center justify-end gap-0.5"><TrendingUp className="w-3 h-3" /> +{formatINR(Math.abs(diff))}</span>;
                    }
                    return <span className="text-slate-300">—</span>;
                  };

                  const getActionStyle = () => {
                    switch (log.action) {
                      case "add": return "bg-blue-100 text-blue-800 border-blue-200";
                      case "delete": return "bg-red-100 text-red-800 border-red-200";
                      case "complete": return "bg-emerald-100 text-emerald-800 border-emerald-200";
                      case "copy": return "bg-purple-100 text-purple-800 border-purple-200";
                      default: return "bg-amber-100 text-amber-800 border-amber-200";
                    }
                  };

                  return (
                    <TableRow key={log.id || idx} className="hover:bg-slate-50/60 text-xs">
                      {/* Date & Time */}
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        <div className="font-semibold text-[11px]">{dateStr}</div>
                        <div className="text-[10px] text-slate-400">{timeStr}</div>
                      </TableCell>
                      
                      {/* Person / Bank name */}
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{log.person_name}</span>
                          {log.action !== "copy" && log.person_name !== "System" && editCount > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 bg-slate-50 text-slate-500">
                              {editCount} edit{editCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Action Badge */}
                      <TableCell>
                        <span className={cn("px-1.5 py-0.5 rounded border font-semibold text-[10px] uppercase", getActionStyle())}>
                          {log.action}
                        </span>
                      </TableCell>
                      
                      {/* Field name */}
                      <TableCell className="capitalize text-slate-500 font-medium">
                        {log.field_name ? log.field_name.replace("_", " ") : "—"}
                      </TableCell>
                      
                      {/* Old Value */}
                      <TableCell className="text-right text-red-500/80 line-through">
                        {formatVal(log.old_value)}
                      </TableCell>
                      
                      {/* New Value */}
                      <TableCell className="text-right text-emerald-600 font-semibold">
                        {formatVal(log.new_value)}
                      </TableCell>
                      
                      {/* Change Delta */}
                      <TableCell className="text-right">
                        {getChangeDelta()}
                      </TableCell>
                      
                      {/* Description Note */}
                      <TableCell className="text-slate-600 font-medium">
                        {log.note || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
