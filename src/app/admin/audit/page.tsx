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
    if (act.includes('create') || act.includes('add')) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (act.includes('update') || act.includes('edit')) return 'text-amber-500 bg-amber-50 border-amber-100';
    if (act.includes('delete') || act.includes('remove')) return 'text-rose-500 bg-rose-50 border-rose-100';
    if (act.includes('login') || act.includes('auth')) return 'text-indigo-500 bg-indigo-50 border-indigo-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Security & System Audit</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">Real-time immutable ledger of all administrative actions</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-2xl border-slate-200">
               <Calendar className="w-4 h-4 mr-2" />
               Date Range
           </Button>
           <Button variant="outline" className="rounded-2xl border-slate-200">
               <Filter className="w-4 h-4 mr-2" />
               Critical Only
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-0 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden min-h-[700px]">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-6 divide-x divide-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Activity className="w-6 h-6 text-indigo-600" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Events</p>
                      <p className="text-xl font-black text-slate-800">{logs.length}</p>
                   </div>
                </div>
                <div className="pl-6 flex items-center gap-3">
                   <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-emerald-600" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</p>
                      <p className="text-xl font-black text-emerald-600">Secure</p>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400" />
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
             <div className="absolute left-[3.25rem] top-0 bottom-0 w-[2px] bg-slate-100 hidden md:block" />

             <div className="divide-y divide-slate-50 px-4">
                {loading ? (
                   <div className="py-20 flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Fetching encrypted logs...</p>
                   </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-bold text-slate-500">No audit events matched your current filters.</p>
                    <p className="text-xs font-semibold text-slate-400">
                      New admin and cashier actions will appear here automatically.
                    </p>
                  </div>
                ) : filteredLogs.map((log) => (
                   <div key={log.log_id} className="relative py-6 px-4 md:px-8 group hover:bg-slate-50/50 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                         {/* Icon/Dot */}
                         <div className="hidden md:flex shrink-0 w-12 h-12 bg-white border-4 border-slate-50 rounded-2xl items-center justify-center shadow-sm z-10 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                         </div>

                         {/* Content */}
                         <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                               <div className="flex items-center gap-3">
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                                     {log.action}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</span>
                               </div>
                               <div className="flex items-center gap-1.5 text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-[10px] font-bold font-mono tracking-tight">{formatDateTimeInTimezone(log.created_at, systemTimezone)}</span>
                               </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                               <div className="flex items-center gap-2 pr-4 md:border-r border-slate-100 min-w-[200px]">
                                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[9px] font-black text-slate-400 uppercase">
                                     {log.staff_name?.slice(0, 2) || "S"}
                                  </div>
                                  <div>
                                     <p className="text-xs font-black text-slate-700 leading-none">{log.staff_name || "System Process"}</p>
                                     <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{log.staff_role || "CORE"}</p>
                                  </div>
                               </div>

                               <p className="text-xs font-medium text-slate-500 italic">
                                  {log.details ? (
                                    typeof log.details === "string"
                                      ? log.details
                                      : JSON.stringify(log.details).slice(0, 160)
                                  ) : `Automated action performed on ${log.entity_type || 'system'}`}
                               </p>
                            </div>
                         </div>

                         <div className="flex shrink-0">
                            <button className="p-2 text-slate-300 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100">
                               <MoreVertical className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-center">
             <Button
                variant="outline"
                className="rounded-2xl border-slate-200 bg-white shadow-sm font-black text-[10px] uppercase tracking-widest py-3 px-8 hover:bg-slate-50"
                onClick={() => setHistoryMode(true)}
             >
                Load Historical Data
                <ChevronDown className="w-4 h-4 ml-2" />
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
