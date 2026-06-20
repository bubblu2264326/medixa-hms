"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { usePatient } from "@/contexts/PatientIdContext";
import { searchPatients, fetchPatientVisit } from "@/src/features/reception/queueManagement/api";
import { Patient } from "@/src/features/reception/queueManagement/types";
import toast from "react-hot-toast";

export function SharedSearch() {
  const { setPatientVisit } = usePatient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastSelectedName = useRef<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchPatients(q);
      setResults(data);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query && query !== lastSelectedName.current) {
        search(query);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [query, search]);

  const handleSelect = async (patient: Patient) => {
    const nextPatientId = patient.patient_id.toString();
    setIsSelecting(true);
    lastSelectedName.current = patient.patient_name;
    setQuery(patient.patient_name);
    setResults([]);
    setShowDropdown(false);

    try {
      const visit = await fetchPatientVisit(nextPatientId);
      const visitId = visit?.visit_id != null ? String(visit.visit_id) : null;

      if (visitId) {
        setPatientVisit(nextPatientId, visitId);
        toast.success(`Patient + Visit Selected: ${patient.patient_name} (Visit #${visitId})`);
        return;
      }

      setPatientVisit(nextPatientId, null);
      toast("Patient selected. No active queued visit found.", { icon: "ℹ️" });
    } catch {
      setPatientVisit(nextPatientId, null);
      toast("Patient selected. No active queued visit found.", { icon: "ℹ️" });
    } finally {
      setIsSelecting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1 max-w-[500px] group" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          {isSearching || isSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search by Name, ID, or CNIC..."
          disabled={isSelecting}
          className="w-full h-9 pl-9 pr-4 bg-background hover:border-ring/40 border-input focus:border-ring rounded-md text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-none border shadow-sm"
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1.5 max-h-[360px] overflow-y-auto custom-scrollbar">
            {results.map((p, idx) => (
              <button
                key={p.patient_id}
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors border-b border-border last:border-none ${
                  highlightedIndex === idx ? "bg-accent" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0 font-semibold text-sm">
                    {p.patient_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate leading-tight">{p.patient_name}</span>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight flex items-center gap-1">
                        ID: <span className="text-foreground font-mono tabular-nums">{p.patient_id}</span>
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight flex items-center gap-1">
                        Age: <span className="text-foreground font-mono tabular-nums">{p.age}</span>
                      </span>
                      {p.cnic && (
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight flex items-center gap-1 border-l pl-3 border-border">
                          CNIC: <span className="text-foreground font-mono tabular-nums">{p.cnic}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
