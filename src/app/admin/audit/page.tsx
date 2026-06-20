"use client";
import React, { useEffect, useRef, useState } from "react";
import { 
  Activity, 
  Clock, 
  Shield, 
  Search, 
  Calendar, 
  ArrowRight,
  Filter,
  MoreVertical,
  ChevronDown
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import toast from "react-hot-toast";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

export default function AuditLogsPage() {
  const systemTimezone = useSystemTimezone();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyMode, setHistoryMode] = useState(false);
  const knownLogIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void fetchLogs(historyMode ? 500 : 50, { showLoader: true, showToast: false });
  }, [historyMode]);

  const fetchLogs = async (
    limit = 50,
    options?: { showLoader?: boolean; showToast?: boolean }
  ) => {
    const showLoader = options?.showLoader ?? false;
    const showToast = options?.showToast ?? false;

    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?limit=${limit}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) return;

      const incoming = data as any[];
      let newCount = 0;
      for (const row of incoming) {
        const rowId = String(row?.log_id ?? "");
        if (rowId && !knownLogIdsRef.current.has(rowId)) {
          newCount++;
        }
      }

      setLogs(incoming);
      knownLogIdsRef.current = new Set(
        incoming.map((row) => String(row?.log_id ?? "")).filter(Boolean)
      );

      if (showToast && newCount > 0) {
        toast.success(newCount === 1 ? "New audit event" : `${newCount} new audit events`, {
          id: "audit-page-live-update",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let source: EventSource | null = null;

    const connect = () => {
      if (disposed) return;

      source = new EventSource("/api/admin/audit-logs/stream");
      source.addEventListener("invalidate", () => {
        void fetchLogs(historyMode ? 500 : 50, { showLoader: false, showToast: true });
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();
    const interval = setInterval(() => {
      void fetchLogs(historyMode ? 500 : 50, { showLoader: false, showToast: false });
    }, 60000);

    return () => {
      disposed = true;
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, [historyMode]);

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add')) return 'text-success bg-success/10 border-success/20';
    if (act.includes('update') || act.includes('edit')) return 'text-warning-foreground bg-warning/15 border-warning/20';
    if (act.includes('delete') || act.includes('remove')) return 'text-destructive bg-destructive/10 border-destructive/20';
    if (act.includes('login') || act.includes('auth')) return 'text-info bg-info/10 border-info/20';
    return 'text-muted-foreground bg-muted border-border';
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Security &amp; System Audit</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time immutable ledger of all administrative actions</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-md border-border">
               <Calendar className="w-4 h-4 mr-2" aria-hidden />
               Date Range
           </Button>
           <Button variant="outline" className="rounded-md border-border">
               <Filter className="w-4 h-4 mr-2" aria-hidden />
               Critical Only
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden min-h-[700px]">
          <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-6 divide-x divide-border">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                      <Activity className="w-6 h-6 text-primary" aria-hidden />
                   </div>
                   <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Events</p>
                      <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{logs.length}</p>
                   </div>
                </div>
                <div className="pl-6 flex items-center gap-3">
                   <div className="w-12 h-12 bg-success/10 rounded-md flex items-center justify-center">
                      <Shield className="w-6 h-6 text-success" aria-hidden />
                   </div>
                   <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">System Health</p>
                      <p className="text-xl font-semibold text-success">Secure</p>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-muted border border-border px-5 py-3 rounded-md w-full md:w-96">
                <Search className="w-4 h-4 text-muted-foreground" aria-hidden />
                <input
                  type="text"
                  placeholder="Filter events, users, or modules..."
                  className="bg-transparent border-none focus:outline-none text-sm w-full font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>

          <div className="relative">
             {/* Timeline Line */}
             <div className="absolute left-[3.25rem] top-0 bottom-0 w-[2px] bg-border hidden md:block" />

             <div className="divide-y divide-border px-4">
                {loading ? (
                   <div className="py-20 flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Fetching encrypted logs...</p>
                   </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">No audit events matched your current filters.</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      New admin and cashier actions will appear here automatically.
                    </p>
                  </div>
                ) : filteredLogs.map((log) => (
                   <div key={log.log_id} className="relative py-6 px-4 md:px-8 group hover:bg-accent transition-all">
                      <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                         {/* Icon/Dot */}
                         <div className="hidden md:flex shrink-0 w-12 h-12 bg-card border-4 border-muted rounded-md items-center justify-center shadow-sm z-10 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-muted-foreground group-hover:text-primary" aria-hidden />
                         </div>

                         {/* Content */}
                         <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                               <div className="flex items-center gap-3">
                                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide border ${getActionColor(log.action)}`}>
                                     {log.action}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" aria-hidden />
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</span>
                               </div>
                               <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Clock className="w-3 h-3" aria-hidden />
                                  <span className="text-[10px] font-semibold font-mono tabular-nums tracking-tight">{formatDateTimeInTimezone(log.created_at, systemTimezone)}</span>
                               </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                               <div className="flex items-center gap-2 pr-4 md:border-r border-border min-w-[200px]">
                                  <div className="w-7 h-7 bg-muted rounded-md flex items-center justify-center text-[9px] font-semibold text-muted-foreground uppercase">
                                     {log.staff_name?.slice(0, 2) || "S"}
                                  </div>
                                  <div>
                                     <p className="text-xs font-semibold text-foreground leading-none">{log.staff_name || "System Process"}</p>
                                     <p className="text-[9px] font-semibold text-muted-foreground mt-1 uppercase tracking-tight">{log.staff_role || "CORE"}</p>
                                  </div>
                               </div>

                               <p className="text-xs font-medium text-muted-foreground italic">
                                  {log.details ? (
                                    typeof log.details === "string"
                                      ? log.details
                                      : JSON.stringify(log.details).slice(0, 160)
                                  ) : `Automated action performed on ${log.entity_type || 'system'}`}
                               </p>
                            </div>
                         </div>

                         <div className="flex shrink-0">
                            <button className="p-2 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
                               <MoreVertical className="w-4 h-4" aria-hidden />
                            </button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div className="p-8 bg-muted border-t border-border flex items-center justify-center">
             <Button
                variant="outline"
                className="rounded-md border-border bg-card shadow-sm font-semibold text-[10px] uppercase tracking-wide py-3 px-8 hover:bg-accent"
                onClick={() => setHistoryMode(true)}
             >
                Load Historical Data
                <ChevronDown className="w-4 h-4 ml-2" aria-hidden />
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
