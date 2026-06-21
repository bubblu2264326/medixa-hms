"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Users, Maximize, Minimize, ChevronRight, Stethoscope, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";
import { formatDateInTimezone, formatDateTimeInTimezone } from "@/src/lib/timezone/client";

interface QueueItem {
  patient_id: string | number;
  visit_id: string | number;
  patient_name: string;
  clinic_number: string;
  doctor_id?: string;
  doctor_name: string;
  status?: string;
  visit_type: "OPD" | "Emergency" | "Other";
}

interface Doctor {
  doctor_id: string | number;
  doctor_name: string;
}

export function PublicQueue() {
  const systemTimezone = useSystemTimezone();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"ALL" | "OPD" | "Emergency">("ALL");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchQueueData = useCallback(async () => {
    try {
      const url = `/api/public/queue?doctor_id=${selectedDoctorId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setQueue(data);
      }
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    }
  }, [selectedDoctorId]);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/public/doctors");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDoctors(data);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, [fetchQueueData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        toast.error(`Error enabling full-screen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const filteredQueue = queue.filter(item => {
    if (selectedType === "ALL") return true;
    return item.visit_type === selectedType;
  });

  const nextUp = filteredQueue.slice(0, 3);
  const remaining = filteredQueue.slice(3);

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-slate-950 text-white font-sans selection:bg-primary/30 ${isFullscreen ? 'p-12' : 'p-6'}`}
    >
      {/* Header Section */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-md bg-primary flex items-center justify-center shadow-sm rotate-3">
            <Users size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight  text-foreground  ">
              Patient Queue
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground font-bold uppercase tracking-widest text-xs">
              <span className="flex items-center gap-1.5 bg-foreground border border-white/5 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Live Update
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {formatDateInTimezone(currentTime, systemTimezone)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="text-5xl font-semibold font-mono tracking-tighter text-primary">
              {formatDateTimeInTimezone(currentTime, systemTimezone, {
                day: undefined,
                month: undefined,
                year: undefined,
                second: "2-digit",
              })}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">
              {systemTimezone}
            </div>
          </div>
          
          <div className="h-12 w-px bg-white/10 mx-4 hidden md:block" />

          <button
            onClick={toggleFullscreen}
            className="h-14 w-14 flex items-center justify-center rounded-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="text-muted-foreground group-hover:text-white transition-colors" /> : <Maximize className="text-muted-foreground group-hover:text-white transition-colors" />}
          </button>
        </div>
      </header>

      {/* Control Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-12">
        <div className="xl:col-span-3 flex flex-wrap items-center gap-4 p-2 bg-white/5 border border-white/10 rounded-lg backdrop-blur-xl">
          <div className="flex items-center gap-2 px-6 py-2 border-r border-white/10">
            <Stethoscope size={18} className="text-primary" />
            <span className="text-sm font-bold text-muted-foreground">Filter View</span>
          </div>
          
          <div className="flex gap-2 p-1 bg-black/40 rounded-md">
            {["ALL", "OPD", "Emergency"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type as any)}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedType === type 
                    ? "bg-primary text-white shadow-lg " 
                    : "text-muted-foreground hover:text-muted-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[300px] flex items-center gap-3 px-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">By Doctor:</span>
            <select 
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="flex-1 bg-transparent border-none text-primary font-bold focus:ring-0 cursor-pointer appearance-none"
            >
              <option value="all" className="bg-foreground">All Practitioners</option>
              {doctors.map(doc => (
                <option key={doc.doctor_id} value={doc.doctor_id} className="bg-foreground">
                  {doc.doctor_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 bg-primary/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">
              Total waiting
            </div>
            <div className="text-3xl font-semibold text-white">{filteredQueue.length}</div>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      </div>

      {/* Next Up Section */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-2 w-8 bg-primary rounded-full" />
          <h2 className="text-2xl font-semibold tracking-tight text-white/90 uppercase">Calling Next</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {nextUp.length > 0 ? nextUp.map((item, idx) => (
            <div 
              key={String(item.visit_id)}
              className={`relative overflow-hidden group rounded-lg p-8 border transition-all duration-500 ${
                idx === 0 
                  ? "bg-primary border-emerald-400 shadow-[0_20px_50px_rgba(16,185,129,0.3)] scale-105 z-10" 
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <div className="absolute top-0 right-0 p-8">
                <div className={`text-6xl font-semibold opacity-10 font-mono tracking-tighter ${idx === 0 ? 'text-black' : 'text-white'}`}>
                  0{idx + 1}
                </div>
              </div>

              <div className="relative z-10">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest ${
                  idx === 0 ? "bg-white/20 text-white" : "bg-primary/20 text-primary"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  ID #{item.clinic_number}
                </div>

                <div className={`text-3xl font-semibold tracking-tight mb-2 ${idx === 0 ? 'text-white' : 'text-slate-100'}`}>
                  {item.patient_name}
                </div>

                <div className={`flex items-center gap-2 font-bold ${idx === 0 ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                  <Stethoscope size={16} />
                  {item.doctor_name}
                </div>

                {idx === 0 && (
                  <div className="mt-8 pt-8 border-t border-white/20 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold tracking-widest opacity-80">Proceed to consultation</span>
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="md:col-span-3 h-64 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-white/5">
              <Users size={48} className="text-foreground mb-4" />
              <p className="text-lg font-bold text-muted-foreground">Waitlist is currently empty</p>
            </div>
          )}
        </div>
      </section>

      {/* Remaining Queue */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-2 w-8 bg-slate-700 rounded-full" />
          <h2 className="text-2xl font-semibold tracking-tight text-white/50 uppercase">Waiting List</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {remaining.length > 0 ? remaining.map((item) => (
            <div 
              key={String(item.visit_id)}
              className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-xl bg-foreground border border-white/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground font-mono">#{item.clinic_number}</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-100">{item.patient_name}</div>
                  <div className="text-sm font-bold text-muted-foreground mt-0.5">Assigned to {item.doctor_name}</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest ${
                  item.visit_type === "Emergency" ? "bg-destructive/10 text-destructive border border-rose-500/20" : "bg-white/10 text-muted-foreground border border-white/5"
                }`}>
                  {item.visit_type}
                </span>
                <div className="h-10 w-px bg-white/5" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</span>
                  <span className="text-xs font-bold text-white">{item.status || 'Waiting'}</span>
                </div>
              </div>
            </div>
          )) : (
            remaining.length === 0 && nextUp.length > 0 && (
              <div className="lg:col-span-2 p-12 text-center rounded-lg bg-white/5 border border-white/10">
                <p className="text-muted-foreground font-bold">Priority patients only. No additional waiting.</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="mt-20 pt-12 border-t border-white/5 flex items-center justify-between opacity-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-semibold text-white text-xs">H</div>
          <span className="text-sm font-semibold tracking-tighter uppercase">HMS Professional Display Cloud</span>
        </div>
        <div className="text-[10px] font-mono tracking-widest uppercase">
          Station: MAIN_LCD_01 // SECURE_TERM_2.4
        </div>
      </footer>
    </div>
  );
}
