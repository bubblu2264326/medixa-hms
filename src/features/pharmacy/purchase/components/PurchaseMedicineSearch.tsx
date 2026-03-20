"use client"

import React, { useState, useRef, useEffect } from "react";
import { Medicine } from "../types";
import { Search, Loader2, X } from "lucide-react";

interface PurchaseMedicineSearchProps {
    query: string;
    results: Medicine[];
    isSearching: boolean;
    onSearch: (query: string) => void;
    onSelect: (medicine: Medicine) => void;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const PurchaseMedicineSearch: React.FC<PurchaseMedicineSearchProps> = ({
    query,
    results,
    isSearching,
    onSearch,
    onSelect,
    placeholder = "Search brand or generic name...",
    inputRef,
    onKeyDown,
}) => {
    const [showResults, setShowResults] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // We remove the useEffect that automatically syncs showResults with query/results
    // and instead use explicit user-action based control.

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showResults) {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedIndex((prev) =>
                        prev < results.length - 1 ? prev + 1 : prev
                    );
                    return;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    return;
                case "Enter":
                    e.preventDefault();
                    if (focusedIndex >= 0 && results[focusedIndex]) {
                        handleSelect(results[focusedIndex]);
                    }
                    return;
                case "Escape":
                    setShowResults(false);
                    return;
            }
        }
        onKeyDown?.(e);
    };

    const handleSelect = (medicine: Medicine) => {
        onSelect(medicine);
        setShowResults(false);
        setFocusedIndex(-1);
    };

    return (
        <div className="relative w-full">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value;
                        onSearch(val);
                        if (val.length > 0) setShowResults(true);
                        else setShowResults(false);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length > 0 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    placeholder={placeholder}
                    className="
            w-full h-14 
            pl-12 pr-12
            text-lg font-bold
            bg-white border-2 border-slate-200 rounded-2xl
            outline-none transition-all
            focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
            placeholder:text-slate-400 placeholder:font-normal
          "
                />
                {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-emerald-500" size={20} />
                    </div>
                )}
                {!isSearching && query && (
                    <button
                        onClick={() => {
                            onSearch('');
                            setShowResults(false);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {results.map((medicine, index) => (
                        <button
                            key={medicine.id}
                            onClick={() => handleSelect(medicine)}
                            onMouseEnter={() => setFocusedIndex(index)}
                            className={`
                w-full p-4 flex items-center justify-between rounded-xl transition-all text-left
                ${index === focusedIndex ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-700"}
              `}
                        >
                            <div className="flex flex-col">
                                <span className="font-black tracking-tight">{medicine.brand_name}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${index === focusedIndex ? "text-emerald-100" : "text-slate-400"}`}>
                                    {medicine.generic_name} • {medicine.form}
                                </span>
                                {medicine.manufacturer && (
                                    <span className={`text-[10px] font-medium truncate mt-0.5 ${index === focusedIndex ? 'text-emerald-100/80' : 'text-slate-500'}`}>
                                        Manufacturer: {medicine.manufacturer}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${index === focusedIndex ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                                    {medicine.dosage_value}{medicine.dosage_unit}
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${index === focusedIndex ? "bg-white/20" : "bg-emerald-100 text-emerald-600"}`}>
                                    Stk: {medicine.stock_quantity ?? 0}
                                </div>
                                <div className={`font-black text-sm ${index === focusedIndex ? "text-white" : "text-emerald-600"}`}>
                                    MRP: {medicine.display_mrp !== null ? medicine.display_mrp.toLocaleString() : "N/A"}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
