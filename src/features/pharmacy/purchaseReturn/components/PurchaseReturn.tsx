"use client";

import React, { useRef } from "react";
import { usePurchaseReturn } from "../hooks/usePurchaseReturn";
import {
    Search,
    RotateCcw,
    Truck,
    History,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Loader2
} from "lucide-react";
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

export const PurchaseReturn: React.FC = () => {
    const systemTimezone = useSystemTimezone();
    const {
        searchQuery,
        setSearchQuery,
        invoices,
        selectedInvoice,
        isSearching,
        isSubmitting,
        reason,
        setReason,
        showResults,
        setShowResults,
        focusedIndex,
        setFocusedIndex,
        handleSelectInvoice,
        updateReturnQty,
        submitReturn,
        setSelectedInvoice
    } = usePurchaseReturn();

    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showResults && invoices.length > 0) {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev < invoices.length - 1 ? prev + 1 : prev));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (focusedIndex >= 0 && invoices[focusedIndex]) {
                        handleSelectInvoice(invoices[focusedIndex]);
                    }
                    break;
                case "Escape":
                    setShowResults(false);
                    break;
            }
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-rose-600 text-white rounded-[2rem] shadow-xl shadow-rose-200 ring-4 ring-rose-50">
                        <RotateCcw size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Purchase Return</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Inventory Management // Return to Supplier</p>
                    </div>
                </div>

                {selectedInvoice && (
                    <button
                        onClick={() => setSelectedInvoice(null)}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-black transition-all"
                    >
                        NEW SEARCH (F1)
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            {!selectedInvoice ? (
                <div className="flex flex-col gap-6 relative">
                    {/* Lucrative Search Bar */}
                    <div className="relative group z-50">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <Search className={`transition-colors duration-300 ${isSearching ? 'text-rose-500 animate-pulse' : 'text-slate-400 group-focus-within:text-rose-500'}`} size={24} />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Find Purchase by Invoice No or Supplier..."
                            className="w-full h-20 pl-16 pr-20 bg-white border-2 border-slate-100 rounded-[2.5rem] text-xl font-bold outline-none transition-all focus:border-rose-500 focus:ring-8 focus:ring-rose-500/10 placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => searchQuery.length > 0 && setShowResults(true)}
                            onBlur={() => setTimeout(() => setShowResults(false), 200)}
                        />

                        {isSearching && (
                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                <Loader2 className="animate-spin text-rose-500" size={24} />
                            </div>
                        )}
                    </div>

                    {/* Recommendations Dropdown */}
                    {showResults && invoices.length > 0 && (
                        <div className="absolute top-24 left-0 right-0 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 p-2">
                            <div className="px-6 py-3 border-b border-slate-50 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recommendations Found</span>
                                <span className="text-[9px] font-bold text-slate-300 uppercase">Arrow Keys to Navigate • Enter to Pick</span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                {invoices.map((inv, index) => (
                                    <button
                                        key={inv.purchase_id}
                                        // preventDefault keeps input focus so the onBlur
                                        // close-timer doesn't race the click selection.
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelectInvoice(inv)}
                                        onMouseEnter={() => setFocusedIndex(index)}
                                        className={`w-full p-6 flex items-center justify-between transition-all text-left rounded-3xl mb-1
                                            ${index === focusedIndex ? "bg-rose-600 text-white shadow-xl shadow-rose-200" : "hover:bg-slate-50 text-slate-700"}
                                        `}
                                    >
                                        <div className="flex gap-4 items-center">
                                            <div className={`p-3 rounded-2xl transition-colors ${index === focusedIndex ? "bg-white/20" : "bg-slate-100"}`}>
                                                <Truck size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${index === focusedIndex ? "bg-white/20" : "bg-slate-900 text-white"}`}>
                                                        #{inv.invoice_no}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${index === focusedIndex ? "text-rose-100" : "text-slate-400"}`}>
                                                        {formatDateInTimezone(inv.invoice_timestamp, systemTimezone)}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black tracking-tight mt-0.5">{inv.party_name}</h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <span className={`text-[10px] font-black uppercase ${index === focusedIndex ? "text-rose-100" : "text-slate-400"}`}>Total Value</span>
                                                <p className="font-black text-lg">Rs. {Number(inv.total_amount).toLocaleString()}</p>
                                            </div>
                                            <ChevronRight className={index === focusedIndex ? "text-white" : "text-slate-300"} size={20} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {searchQuery.length > 2 && !isSearching && invoices.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                            <History size={48} className="text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">No matching purchases found</h3>
                            <p className="text-sm text-slate-400">Try a different invoice number or supplier name.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Panel: Invoice Details & Items (Same as before but refined styling) */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Invoice Summary Card */}
                        <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-slate-50 rounded-[2rem]">
                                    <Truck className="text-slate-400" size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inv: {selectedInvoice.invoice_no}</h2>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{selectedInvoice.party_name}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Original Purchase Total</p>
                                <p className="text-2xl font-black text-slate-800 tracking-tighter">Rs. {Number(selectedInvoice.total_amount).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr className="text-left font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-6">Medicine & Batch</th>
                                        <th className="px-6 py-6 text-center">Purchased</th>
                                        <th className="px-6 py-6 text-center">Return Qty</th>
                                        <th className="px-8 py-6 text-right">Unit Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {selectedInvoice.items.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-slate-800 text-lg leading-none">{item.brand_name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.dosage} • {item.form}</span>
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black ring-1 ring-emerald-100">BATCH: {item.batch_number}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center font-black text-slate-500">
                                                {item.quantity} units
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    className="w-24 h-12 bg-slate-100 border-2 border-transparent focus:border-rose-300 focus:bg-white rounded-2xl text-center font-black text-slate-800 outline-none transition-all"
                                                    value={item.return_quantity || ""}
                                                    onChange={(e) => updateReturnQty(item.id, Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-slate-800 tracking-tighter text-lg">
                                                Rs. {Number(item.unit_cost).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Panel: Finalize Return */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white flex flex-col gap-8 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] -mr-32 -mt-32"></div>

                            <h2 className="text-2xl font-black flex items-center gap-3 relative z-10 tracking-tight">
                                <History size={24} className="text-rose-400" /> Finalize Return
                            </h2>

                            <div className="space-y-4 relative z-10">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Reason for Return</label>
                                <textarea
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-6 text-sm font-medium outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 transition-all placeholder:text-slate-600"
                                    placeholder="Enter detailed reason (e.g. Expired, Damaged, Wrong Delivery)..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative z-10 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Items</span>
                                    <span className="text-xl font-black">{selectedInvoice.items.filter(i => (i.return_quantity || 0) > 0).length}</span>
                                </div>
                                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Return Value</span>
                                    <span className="text-4xl font-black text-rose-400 tracking-tighter">
                                        Rs. {selectedInvoice.items.reduce((acc, item) => acc + (item.return_quantity || 0) * item.unit_cost, 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={submitReturn}
                                disabled={isSubmitting}
                                className="w-full h-24 bg-rose-600 hover:bg-rose-500 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-900/60 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 relative z-10"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        PROCEED RETURN
                                        <CheckCircle2 size={28} />
                                    </>
                                )}
                            </button>

                            <div className="flex items-start gap-3 bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 relative z-10">
                                <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                                <p className="text-[11px] text-rose-100/60 leading-relaxed font-bold uppercase tracking-tight">
                                    Decreases stock levels & records a supplier credit transaction.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
