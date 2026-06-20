"use client"
import React, { useState, useRef, useEffect } from "react";
import { Medicine } from "../../types";
import { formatStockQuantity, getMedicineAvailability } from "../../stock";
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

interface MedicineSearchProps {
  query: string;
  results: Medicine[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onSelect: (medicine: Medicine) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const MedicineSearch: React.FC<MedicineSearchProps> = ({
  query,
  results,
  isSearching,
  onSearch,
  onSelect,
  placeholder = "Search for medicine",
  inputRef,
  onKeyDown,
}) => {
  const systemTimezone = useSystemTimezone();
  const [showResults, setShowResults] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowResults(results.length > 0);
  }, [results]);

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

    // If not handled by the dropdown logic, pass to parent
    onKeyDown?.(e);
  };

  const handleSelect = (medicine: Medicine) => {
    const isExpired = medicine.expiry_date ? new Date(medicine.expiry_date) < new Date() : false;
    const { isOutOfStock } = getMedicineAvailability(medicine);
    if (isExpired || isOutOfStock) {
      return;
    }

    onSelect(medicine);
    setShowResults(false);
    setFocusedIndex(-1);
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className="
            w-full 
            px-[15px] py-[12px] 
            text-[16px]
            bg-white/70 backdrop-blur-md
            border-2 border-slate-200/50
            rounded-xl 
            outline-none 
            transition-all duration-300
            placeholder:text-slate-400 placeholder:italic
            focus:border-ring/50
            focus:bg-white/90
            focus:shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_4px_rgba(99,102,241,0.1)]
            group-hover:border-slate-300/50
          "
        />
        {isSearching && (
          <div className="absolute right-[15px] top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-ring border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="
            absolute 
            top-[calc(100%+8px)] left-0 right-0 
            max-h-[450px] 
            overflow-y-auto overflow-x-hidden
            bg-white/80 backdrop-blur-xl
            border border-slate-200/50
            rounded-md
            shadow-[0_20px_50px_rgba(0,0,0,0.15)]
            z-[5000]
            p-1.5
            animate-in fade-in zoom-in-95 duration-200
          "
        >
          {results.map((medicine, index) => {
            const isExpired = medicine.expiry_date ? new Date(medicine.expiry_date) < new Date() : false;
            const { isOutOfStock, isLowStock, available } = getMedicineAvailability(medicine);
            const isDisabled = isExpired || isOutOfStock;
            const stockLabel = isExpired
              ? "Expired"
              : isOutOfStock
                ? "Out of stock"
                : isLowStock
                  ? "Low stock"
                  : "In stock";

            return (
              <div
                key={`${medicine.id}-${medicine.batch_id || index}`}
                // preventDefault on mousedown keeps the input focused so the
                // input's onBlur (which closes the dropdown) doesn't race the
                // click and swallow the selection.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(medicine)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`
                  mb-1.5 last:mb-0
                  px-4 py-2.5
                  rounded-xl
                  transition-all duration-300
                  flex items-center gap-4 border
                  ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                  ${index === focusedIndex
                    ? "bg-primary border-ring text-white shadow-lg scale-[1.01] z-10"
                    : isDisabled
                      ? "bg-slate-100/80 border-slate-200 text-slate-500 shadow-sm"
                      : isLowStock
                        ? "bg-amber-50/80 border-amber-200 text-slate-800 shadow-sm hover:bg-amber-50"
                        : "bg-white/50 border-slate-100/50 hover:bg-white hover:border-primary/20 text-slate-800 shadow-sm"}
                `}
              >
                {/* 1. Main Info: Brand & Generic */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="font-semibold text-[14px] tracking-tight leading-tight truncate">
                    {medicine.brand_name}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${index === focusedIndex ? 'text-primary-foreground/80' : 'text-slate-400'}`}>
                    {medicine.generic_name}
                  </span>
                  {medicine.manufacturer && (
                    <span className={`text-[10px] font-medium truncate mt-0.5 ${index === focusedIndex ? 'text-primary-foreground/90' : 'text-slate-500'}`}>
                      By: {medicine.manufacturer}
                    </span>
                  )}
                </div>

                {/* 2. Dosage & Form */}
                <div className="shrink-0 flex flex-col items-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-tighter ${index === focusedIndex ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {medicine.dosage_value}{medicine.dosage_unit}
                  </span>
                  <span className={`text-[9px] font-bold uppercase opacity-60 mt-0.5 ${index === focusedIndex ? 'text-primary-foreground/90' : 'text-slate-400'}`}>
                    {medicine.form}
                  </span>
                </div>

                {/* 3. Supplier lot info (if exists) */}
                <div className="shrink-0 hidden md:flex flex-col">
                  {medicine.batch_number ? (
                    <>
                      <span className={`text-[9px] font-semibold uppercase tracking-widest leading-none mb-1 ${index === focusedIndex ? 'text-primary-foreground/80' : 'text-slate-400'}`}>Lot / Batch</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${index === focusedIndex ? 'bg-black/20 text-primary-foreground/90' : 'bg-primary/10 text-primary'}`}>
                        {medicine.batch_number}
                      </span>
                      {medicine.batch_code ? (
                        <span className={`mt-1 text-[9px] font-mono ${index === focusedIndex ? 'text-primary-foreground/90' : 'text-slate-400'}`}>
                          Ref: {medicine.batch_code}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">No lot</span>
                  )}
                </div>

                {/* 4. Availability & Expiry */}
                <div className="shrink-0 flex gap-6 px-4 border-l border-current/10">
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-semibold uppercase tracking-widest leading-none mb-1 ${index === focusedIndex ? 'text-primary-foreground/80' : 'text-slate-400'}`}>Stock</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isExpired || isOutOfStock
                          ? 'bg-rose-500'
                          : isLowStock
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-emerald-400'
                      }`}></div>
                      <span className="text-xs font-semibold">
                        {formatStockQuantity(available, medicine)}
                      </span>
                    </div>
                    <span className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                      index === focusedIndex
                        ? 'text-primary-foreground/90'
                        : isExpired || isOutOfStock
                          ? 'text-rose-600'
                          : isLowStock
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                    }`}>
                      {stockLabel}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-[9px] font-semibold uppercase tracking-widest leading-none mb-1 ${index === focusedIndex ? 'text-primary-foreground/80' : 'text-slate-400'}`}>Exp</span>
                    <span className={`text-xs font-semibold ${index === focusedIndex ? 'text-white' : (medicine.expiry_date && new Date(medicine.expiry_date) < new Date() ? 'text-rose-500' : 'text-slate-600')}`}>
                      {medicine.expiry_date ? formatDateInTimezone(medicine.expiry_date, systemTimezone, { month: 'short', year: '2-digit' }) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* 5. Price */}
                <div className={`shrink-0 min-w-[100px] px-3 py-1.5 rounded-lg flex items-center justify-center font-semibold text-[16px] tracking-tighter ${index === focusedIndex ? 'bg-white text-primary' : 'bg-emerald-50 text-emerald-600'}`}>
                  PKR {(medicine.batch_sale_price ?? medicine.price ?? 0).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
