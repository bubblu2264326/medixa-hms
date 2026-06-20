"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
    Plus,
    Trash2,
    Pencil,
    ShoppingCart,
    Package,
    Save,
    Loader2,
    Layout,
    Maximize,
    Minimize,
    Keyboard,
} from 'lucide-react';
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Label } from "@/src/components/ui/Label";
import { getAllMedicines, getAllPartiesName, getMedicinePriceHistory, getPurchaseFormMetadata, submitPurchase, fetchPurchase, updatePurchase } from "../api";
import { Medicine, Party, PurchaseFormMetadata, PurchaseItem, PurchaseInvoice } from "../types";
import { PurchaseMedicineSearch } from "./PurchaseMedicineSearch";
import toast from 'react-hot-toast';
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

export default function MedicinePurchaseForm() {
    const systemTimezone = useSystemTimezone();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editPurchaseId, setEditPurchaseId] = useState<number | null>(null);

    // Master Data
    const [parties, setParties] = useState<Party[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);

    // Invoice Header
    const [selectedParty, setSelectedParty] = useState<number | ''>('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [batchCodePreview, setBatchCodePreview] = useState('');
    const [supplierBatchNumber, setSupplierBatchNumber] = useState('');
    const [formMetadata, setFormMetadata] = useState<PurchaseFormMetadata | null>(null);

    // Item Entry State
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredMeds, setFilteredMeds] = useState<Medicine[]>([]);
    const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const [batchInfo, setBatchInfo] = useState({
        quantity: 1,
        subQuantity: 0,
        unitCost: 0,
        subUnitCost: 0,
        expiryDate: '',
        salePrice: 0,
        saleSubUnitPrice: 0
    });
    const [medStats, setMedStats] = useState<any | null>(null);

    // Invoice Items (Cart)
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoCalc, setAutoCalc] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Input Refs for Keyboard Navigation
    const searchInputRef = useRef<HTMLInputElement>(null);
    const partyRef = useRef<HTMLSelectElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const costInputRef = useRef<HTMLInputElement>(null);
    const expiryInputRef = useRef<HTMLInputElement>(null);
    const salePriceInputRef = useRef<HTMLInputElement>(null);

    const fieldRefs = [qtyInputRef, costInputRef, expiryInputRef, salePriceInputRef];

    const refreshFormMetadata = async () => {
        const metadata = await getPurchaseFormMetadata();
        setFormMetadata(metadata);
        if (!isEditing && metadata) {
            setInvoiceNo(metadata.next_invoice_no_preview);
            setBatchCodePreview(metadata.next_batch_code_preview);
            setSupplierBatchNumber((current) => current || metadata.next_supplier_batch_number_suggestion);
        }
    };

    useEffect(() => {
        async function init() {
            try {
                const [pData, mData, metadata] = await Promise.all([
                    getAllPartiesName(),
                    getAllMedicines(),
                    getPurchaseFormMetadata()
                ]);
                setParties(pData);
                setMedicines(mData);
                setFormMetadata(metadata);

                if (metadata) {
                    setInvoiceNo(metadata.next_invoice_no_preview);
                    setBatchCodePreview(metadata.next_batch_code_preview);
                    setSupplierBatchNumber(metadata.next_supplier_batch_number_suggestion);
                }

                // Check for edit mode
                const mode = searchParams.get('mode');
                const ref = searchParams.get('ref');

                if (mode === 'edit' && ref) {
                    const purchaseId = parseInt(ref);
                    setIsEditing(true);
                    setEditPurchaseId(purchaseId);

                    const res = await fetchPurchase(purchaseId);
                    if (res.success && res.data) {
                        setSelectedParty(res.data.party_id);
                        setInvoiceNo(res.data.invoice_no);
                        setBatchCodePreview(res.data.items?.[0]?.batch_code || '');
                        setSupplierBatchNumber(res.data.items?.[0]?.batch_number || '');

                        // Defensive check for items array
                        const mappedItems = (res.data.items || []).map((item: any) => ({
                            medicine_id: item.medicine_id,
                            medicine_name: item.medicine_name,
                            quantity: item.quantity,
                            sub_quantity: item.sub_quantity,
                            unit_cost: item.unit_cost,
                            sub_unit_cost: item.sub_unit_cost,
                            batch_number: item.batch_number,
                            batch_code: item.batch_code,
                            expiry_date: item.expiry_date || '',
                            sale_price: item.sale_price,
                            sale_sub_unit_price: item.sale_sub_unit_price,
                        }));
                        setItems(mappedItems);
                        toast.success(`Loaded purchase #${res.data.invoice_no} for editing`);
                    } else {
                        toast.error(res.error || 'Failed to load purchase for editing');
                    }
                }
            } catch {
                toast.error("Failed to load initial data");
            } finally {
                setIsLoading(false);
            }
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keyboard Navigation: Side Arrow Navigation
    useEffect(() => {
        const handleArrowNav = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

            const activeEl = document.activeElement;

            // Bridge Supplier -> Qty (Skip Invoice)
            if (activeEl === partyRef.current) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    qtyInputRef.current?.focus();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
                return;
            }

            const currentIdx = fieldRefs.findIndex(ref => ref.current === activeEl);
            if (currentIdx === -1) return;

            if (e.key === 'ArrowRight' && currentIdx < fieldRefs.length - 1) {
                e.preventDefault();
                fieldRefs[currentIdx + 1].current?.focus();
            } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
                e.preventDefault();
                fieldRefs[currentIdx - 1].current?.focus();
            } else if (e.key === 'ArrowLeft' && currentIdx === 0) {
                // Bridge Qty -> Supplier (Skip Invoice)
                e.preventDefault();
                partyRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleArrowNav);
        return () => window.removeEventListener('keydown', handleArrowNav);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Global Shortcuts
    useEffect(() => {
        const handleGlobalShorcuts = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
                toast('Search Focused', { duration: 1000 });
            }
            if (e.key === 'F2' && items.length > 0) {
                e.preventDefault();
                handleSaveInvoice();
            }
        };
        window.addEventListener('keydown', handleGlobalShorcuts);
        return () => window.removeEventListener('keydown', handleGlobalShorcuts);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, selectedParty, invoiceNo]);

    // Search Logic
    useEffect(() => {
        if (searchQuery.length > 0) {
            setIsSearching(true);
            const filtered = medicines.filter(m =>
                m.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.generic_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredMeds(filtered.slice(0, 10));
            setIsSearching(false);
        } else {
            setFilteredMeds([]);
        }
    }, [searchQuery, medicines]);

    const handleSelectMedicine = async (med: Medicine) => {
        setSelectedMed(med);
        setSearchQuery(med.brand_name);

        // 1. First check if medicine exists in current invoice items (Invoice-local memory)
        const existingInInvoice = items.find(item => item.medicine_id === med.id);

        if (existingInInvoice) {
            setBatchInfo({
                quantity: 1,
                subQuantity: 0,
                unitCost: existingInInvoice.unit_cost,
                subUnitCost: existingInInvoice.sub_unit_cost,
                expiryDate: existingInInvoice.expiry_date,
                salePrice: existingInInvoice.sale_price,
                saleSubUnitPrice: existingInInvoice.sale_sub_unit_price
            });
        } else {
            // 2. Otherwise fall back to global price history
            const history = await getMedicinePriceHistory(med.id);
            setMedStats(history);
            setBatchInfo({
                quantity: 1,
                subQuantity: 0,
                unitCost: history?.latest_purchase_price || med.unit_price || 0,
                subUnitCost: history?.latest_purchase_sub_unit_price || med.sub_unit_price || 0,
                expiryDate: history?.nearest_expiry ? history.nearest_expiry.split('T')[0] : '',
                salePrice: history?.latest_sale_price || med.unit_price || 0,
                saleSubUnitPrice: history?.latest_sale_sub_unit_price || med.sub_unit_price || 0
            });
        }

        // Auto-focus supplier dropdown
        setTimeout(() => partyRef.current?.focus(), 100);
    };

    const resetEntryFields = () => {
        setEditingItemIndex(null);
        setSelectedMed(null);
        setSearchQuery('');
        setMedStats(null);
        setBatchInfo({
            quantity: 1,
            subQuantity: 0,
            unitCost: 0,
            subUnitCost: 0,
            expiryDate: '',
            salePrice: 0,
            saleSubUnitPrice: 0
        });
    };

    const handleEditItem = async (index: number) => {
        const item = items[index];
        if (!item) return;

        setEditingItemIndex(index);
        setSearchQuery(item.medicine_name);
        setSupplierBatchNumber(item.batch_number);
        setBatchCodePreview(item.batch_code || batchCodePreview);
        setBatchInfo({
            quantity: item.quantity,
            subQuantity: item.sub_quantity,
            unitCost: item.unit_cost,
            subUnitCost: item.sub_unit_cost,
            expiryDate: item.expiry_date,
            salePrice: item.sale_price,
            saleSubUnitPrice: item.sale_sub_unit_price
        });

        const matchedMedicine = medicines.find((medicine) => medicine.id === item.medicine_id) ?? null;
        setSelectedMed(matchedMedicine);

        if (matchedMedicine) {
            const history = await getMedicinePriceHistory(matchedMedicine.id);
            setMedStats(history);
        } else {
            setMedStats(null);
        }

        setTimeout(() => qtyInputRef.current?.focus(), 100);
    };

    const handleUnitCostChange = (val: number) => {
        let subCost = batchInfo.subUnitCost;
        if (autoCalc && selectedMed?.sub_units_per_unit) {
            subCost = Number((val / selectedMed.sub_units_per_unit).toFixed(2));
        }
        setBatchInfo(prev => ({ ...prev, unitCost: val, subUnitCost: subCost }));
    };

    const handleSubUnitCostChange = (val: number) => {
        let unitCost = batchInfo.unitCost;
        if (autoCalc && selectedMed?.sub_units_per_unit) {
            unitCost = Number((val * selectedMed.sub_units_per_unit).toFixed(2));
        }
        setBatchInfo(prev => ({ ...prev, unitCost: unitCost, subUnitCost: val }));
    };

    const handleSalePriceChange = (val: number) => {
        let subSale = batchInfo.saleSubUnitPrice;
        if (autoCalc && selectedMed?.sub_units_per_unit) {
            subSale = Number((val / selectedMed.sub_units_per_unit).toFixed(2));
        }
        setBatchInfo(prev => ({ ...prev, salePrice: val, saleSubUnitPrice: subSale }));
    };

    const handleSaleSubUnitPriceChange = (val: number) => {
        let unitSale = batchInfo.salePrice;
        if (autoCalc && selectedMed?.sub_units_per_unit) {
            unitSale = Number((val * selectedMed.sub_units_per_unit).toFixed(2));
        }
        setBatchInfo(prev => ({ ...prev, salePrice: unitSale, saleSubUnitPrice: val }));
    };

    const addItemToInvoice = () => {
        if (!selectedMed) return toast.error("Please select a medicine");
        if (!supplierBatchNumber.trim()) return toast.error("Supplier batch / lot number is required");
        if (!batchInfo.expiryDate) return toast.error("Expiry date is required");
        if (batchInfo.unitCost <= 0) return toast.error("Unit cost must be greater than 0");

        if (editingItemIndex !== null) {
            const updatedItems = [...items];
            const existingItem = updatedItems[editingItemIndex];

            if (!existingItem) {
                setEditingItemIndex(null);
                return toast.error("Selected cart line could not be updated");
            }

            updatedItems[editingItemIndex] = {
                ...existingItem,
                medicine_id: selectedMed.id,
                medicine_name: selectedMed.brand_name,
                quantity: batchInfo.quantity,
                sub_quantity: batchInfo.subQuantity,
                unit_cost: batchInfo.unitCost,
                sub_unit_cost: batchInfo.subUnitCost,
                batch_number: supplierBatchNumber.trim(),
                expiry_date: batchInfo.expiryDate,
                sale_price: batchInfo.salePrice,
                sale_sub_unit_price: batchInfo.saleSubUnitPrice
            };
            setItems(updatedItems);
            toast.success(`${selectedMed.brand_name} line updated`);
            resetEntryFields();
            setTimeout(() => searchInputRef.current?.focus(), 100);
            return;
        }

        // Check if exactly same medicine + batch exists for merging
        const existingIndex = items.findIndex(item =>
            item.medicine_id === selectedMed.id &&
            item.batch_number === supplierBatchNumber.trim() &&
            item.expiry_date === batchInfo.expiryDate
        );

        if (existingIndex !== -1) {
            // SMART MERGING: Update existing item
            const updatedItems = [...items];
            const existing = updatedItems[existingIndex];
            updatedItems[existingIndex] = {
                ...existing,
                quantity: existing.quantity + batchInfo.quantity,
                sub_quantity: existing.sub_quantity + batchInfo.subQuantity,
                // We keep the latest prices entered
                unit_cost: batchInfo.unitCost,
                sub_unit_cost: batchInfo.subUnitCost,
                sale_price: batchInfo.salePrice,
                sale_sub_unit_price: batchInfo.saleSubUnitPrice
            };
            setItems(updatedItems);
            toast.success(`Updated ${selectedMed.brand_name} (Lot: ${supplierBatchNumber.trim()}) quantity in cart`);
        } else {
            // NEW RECORD: Add to top
            const newItem: PurchaseItem = {
                medicine_id: selectedMed.id,
                medicine_name: selectedMed.brand_name,
                quantity: batchInfo.quantity,
                sub_quantity: batchInfo.subQuantity,
                unit_cost: batchInfo.unitCost,
                sub_unit_cost: batchInfo.subUnitCost,
                batch_number: supplierBatchNumber.trim(),
                expiry_date: batchInfo.expiryDate,
                sale_price: batchInfo.salePrice,
                sale_sub_unit_price: batchInfo.saleSubUnitPrice
            };
            setItems([newItem, ...items]);
            toast.success(`${newItem.medicine_name} added to invoice`);
        }

        // Reset entry area
        resetEntryFields();

        // Refocus search for next item
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const removeItem = (index: number) => {
        if (editingItemIndex === index) {
            resetEntryFields();
        } else if (editingItemIndex !== null && index < editingItemIndex) {
            setEditingItemIndex(editingItemIndex - 1);
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_cost) + (item.sub_quantity * item.sub_unit_cost);
        }, 0);
    };

    const handleSaveInvoice = async () => {
        if (!selectedParty) return toast.error("Please select a supplier");
        if (isEditing && !invoiceNo) return toast.error("Invoice number is missing");
        if (items.length === 0) return toast.error("Add at least one item to invoice");

        setIsSubmitting(true);
        try {
            const invoice: PurchaseInvoice = {
                party_id: Number(selectedParty),
                // Only send invoice_no if isEditing, otherwise let backend generate it
                ...(isEditing ? { invoice_no: invoiceNo } : {}),
                total_amount: calculateTotal(),
                payment_status: 'Paid',
                items: items
            } as PurchaseInvoice;

            let res;
            if (isEditing && editPurchaseId) {
                res = await updatePurchase(editPurchaseId, invoice);
            } else {
                res = await submitPurchase(invoice);
            }

            if (res.success) {
                if (isEditing) {
                    toast.success("Purchase invoice updated successfully!");
                    // Clear edit mode and redirect back to transactions
                    setIsEditing(false);
                    setEditPurchaseId(null);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('tab', 'transactions');
                    params.delete('mode');
                    params.delete('ref');
                    router.push(`${pathname}?${params.toString()}`);
                } else {
                    toast.success(`Purchase invoice ${res.data.invoice_no} saved successfully!`);
                    setItems([]);
                    setSelectedParty('');
                    setMedStats(null);
                    setSearchQuery('');
                    setSelectedMed(null);
                    setSupplierBatchNumber('');
                    setInvoiceNo('');
                    setBatchCodePreview('');

                    await refreshFormMetadata();
                }
            } else {
                const errorText = (res.error || "").replace(/^BATCH_MISMATCH:\s*/, "");
                if ((res.error || "").startsWith('BATCH_MISMATCH')) {
                    toast.error(errorText || "Batch mismatch detected", { duration: 5000 });
                } else {
                    toast.error(res.error || "Failed to save invoice");
                }
            }
        } catch {
            toast.error("An error occurred during submission");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`flex flex-col gap-6 bg-muted/50 p-6 rounded-lg transition-all ${isFullscreen ? 'fixed inset-0 z-[999] bg-white p-10 overflow-auto h-full' : ''}`}
        >
            {/* Top Header - Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary text-white rounded-md shadow-lg ">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Purchase Intake</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Manage Inventory Stock</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-border shadow-sm text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        <Keyboard size={14} className="text-muted-foreground" />
                        Use F1 for Search • Use Arrows to Navigate
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-3 bg-white hover:bg-muted text-muted-foreground hover:text-primary rounded-xl transition-all border border-border shadow-sm"
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div>
            </div>

            {/* Main Container */}
            <div className="space-y-6">

                {/* 2. Top Bar: Supplier, Invoice, Batch */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-6 bg-white rounded-lg border border-border shadow-sm">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Supplier / Party</Label>
                        <select
                            ref={partyRef}
                            value={selectedParty}
                            onChange={(e) => setSelectedParty(Number(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                            className="w-full h-12 px-4 rounded-xl border-2 border-border bg-white focus:border-ring outline-none transition-all font-bold text-foreground"
                        >
                            <option value="">Choose Supplier...</option>
                            {parties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Supplier Batch / Lot No.</Label>
                            {formMetadata?.next_supplier_batch_number_suggestion && (
                                <button
                                    type="button"
                                    onClick={() => setSupplierBatchNumber(formMetadata.next_supplier_batch_number_suggestion)}
                                    className="text-[10px] font-semibold uppercase tracking-widest text-primary hover:text-primary"
                                >
                                    Use Suggested
                                </button>
                            )}
                        </div>
                        <Input
                            value={supplierBatchNumber}
                            onChange={(e) => setSupplierBatchNumber(e.target.value.toUpperCase())}
                            className="h-12 rounded-xl border-2 border-border font-bold focus:border-ring transition-all font-mono"
                            placeholder="LOT-00001"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Invoice ID</Label>
                        <Input
                            value={invoiceNo}
                            onChange={(e) => isEditing && setInvoiceNo(e.target.value)}
                            readOnly={!isEditing}
                            className={`h-12 rounded-xl border-2 border-border font-bold transition-all ${isEditing ? 'focus:border-ring' : 'bg-muted text-muted-foreground'}`}
                            placeholder="Auto-generated on save"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Internal Batch Code</Label>
                        <Input
                            value={batchCodePreview}
                            readOnly
                            className="h-12 rounded-xl border-2 border-primary/30 bg-primary/10/30 font-bold text-primary transition-all font-mono"
                            placeholder="BATCH-00001"
                        />
                    </div>
                </div>

                {/* 3. Prominent Search Bar */}
                <div className="bg-white border border-border rounded-lg p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground ml-1">Search Medicine</Label>
                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-[10px] font-semibold text-primary uppercase tracking-widest">
                            <span className="animate-pulse">●</span> Active Selection Mode
                        </div>
                    </div>
                    <PurchaseMedicineSearch
                        inputRef={searchInputRef}
                        query={searchQuery}
                        results={filteredMeds}
                        isSearching={isSearching}
                        onSearch={setSearchQuery}
                        onSelect={handleSelectMedicine}
                        placeholder="Type Brand or Generic Name (Press F1)..."
                    />
                    {medStats && (
                        <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-md border border-border animate-in fade-in slide-in-from-top-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Stock Available</span>
                                <span className="text-sm font-semibold text-foreground">{medStats.total_stock || 0} Units</span>
                            </div>
                            <div className="w-px h-8 bg-muted self-center hidden sm:block" />
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Last Cost</span>
                                <span className="text-sm font-semibold text-primary">Rs. {medStats.latest_purchase_price || 0}</span>
                            </div>
                            <div className="w-px h-8 bg-muted self-center hidden sm:block" />
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Nearest Expiry</span>
                                <span className={`text-sm font-semibold ${new Date(medStats.nearest_expiry) < new Date() ? 'text-destructive' : 'text-warning-foreground'}`}>
                                    {medStats.nearest_expiry ? formatDateInTimezone(medStats.nearest_expiry, systemTimezone) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Entry Matrix - Horizontal Row */}
                <div className={`p-5 rounded-lg border-2 transition-all duration-500 flex flex-col gap-4 ${selectedMed ? 'bg-primary/10 border-primary/30 shadow-xl' : 'bg-muted border-border opacity-60'}`}>
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Entry Details</Label>
                        <div className="flex items-center gap-4">
                            {editingItemIndex !== null && (
                                <div className="flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-warning-foreground">
                                    <Pencil size={12} />
                                    Editing cart line
                                    <button
                                        type="button"
                                        onClick={resetEntryFields}
                                        className="text-warning-foreground/80 hover:text-amber-900"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoCalc"
                                    checked={autoCalc}
                                    onChange={(e) => setAutoCalc(e.target.checked)}
                                    className="h-4 w-4 rounded text-primary focus:ring-ring/20 cursor-pointer"
                                />
                                <Label htmlFor="autoCalc" className="text-xs font-bold text-muted-foreground cursor-pointer">Auto-sync Sub-Unit Prices</Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap xl:flex-nowrap items-end gap-3">
                        <div className="shrink-0 w-28 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Qty</Label>
                            <Input
                                ref={qtyInputRef}
                                type="number"
                                value={batchInfo.quantity}
                                onChange={(e) => setBatchInfo({ ...batchInfo, quantity: Number(e.target.value) })}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white"
                            />
                        </div>
                        <div className="shrink-0 w-24 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Sub Qty</Label>
                            <Input
                                type="number"
                                value={batchInfo.subQuantity}
                                onChange={(e) => setBatchInfo({ ...batchInfo, subQuantity: Number(e.target.value) })}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white"
                            />
                        </div>
                        <div className="shrink-0 w-24 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Unit Cost</Label>
                            <Input
                                ref={costInputRef}
                                type="number"
                                value={batchInfo.unitCost}
                                onChange={(e) => handleUnitCostChange(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white"
                            />
                        </div>
                        <div className="shrink-0 w-28 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Sub Cost</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={batchInfo.subUnitCost}
                                onChange={(e) => handleSubUnitCostChange(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white"
                            />
                        </div>
                        {/* Removed local batch ID from line entry */}
                        <div className="shrink-0 w-36 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Expiry</Label>
                            <Input
                                ref={expiryInputRef}
                                type="date"
                                value={batchInfo.expiryDate}
                                onChange={(e) => setBatchInfo({ ...batchInfo, expiryDate: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white"
                            />
                        </div>
                        <div className="shrink-0 w-28 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Sale Price</Label>
                            <Input
                                ref={salePriceInputRef}
                                type="number"
                                value={batchInfo.salePrice}
                                onChange={(e) => handleSalePriceChange(Number(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white text-primary"
                            />
                        </div>
                        <div className="shrink-0 w-28 space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Sub Sale</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={batchInfo.saleSubUnitPrice}
                                onChange={(e) => handleSaleSubUnitPriceChange(Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => e.key === 'Enter' && addItemToInvoice()}
                                className="h-12 border-border rounded-xl font-bold bg-white text-primary"
                            />
                        </div>
                        <div className="flex-1 px-4 py-2 bg-white/50 rounded-xl border border-border/50 flex flex-col justify-center overflow-hidden">
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest leading-none mb-1">Entry Summary</span>
                            <span className="font-bold text-foreground truncate">{selectedMed ? `${selectedMed.brand_name} (Stock: ${selectedMed.stock_quantity ?? 0}${selectedMed.stock_sub_quantity ? ` + ${selectedMed.stock_sub_quantity} ${selectedMed.sub_unit || 'sub-units'}` : ''})` : 'No Product Selected'}</span>
                        </div>
                        <div className="shrink-0">
                            <Button
                                onClick={addItemToInvoice}
                                className="h-12 w-12 bg-primary hover:bg-primary rounded-xl p-0 flex items-center justify-center shadow-lg "
                                title={editingItemIndex !== null ? 'Update cart line' : 'Add to cart'}
                            >
                                {editingItemIndex !== null ? <Pencil size={20} /> : <Plus size={24} />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                {/* 3. Left - Cart List */}
                <div className="flex-1 bg-white border border-border rounded-lg p-8 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 uppercase tracking-tight">
                            <Package className="text-primary" size={18} /> Purchase Cart
                        </h3>
                        <span className="px-3 py-1 bg-muted rounded-lg text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                            {items.length} Medicines in Basket
                        </span>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                                <div className="p-10 bg-muted rounded-full">
                                    <ShoppingCart size={64} className="opacity-10" />
                                </div>
                                <p className="font-semibold uppercase text-[10px] tracking-[0.3em]">No items added yet</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 bg-white z-10 border-b border-border">
                                    <tr className="text-left">
                                        <th className="pb-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Medicine</th>
                                        <th className="pb-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Batch</th>
                                        <th className="pb-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Qty / Sub</th>
                                        <th className="pb-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Unit / Sub Cost</th>
                                        <th className="pb-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Total</th>
                                        <th className="pb-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="group hover:bg-muted/50 transition-colors">
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground leading-none mb-1">{item.medicine_name}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">EXP: {item.expiry_date} • SALE: {item.sale_price}{(item.sale_sub_unit_price > 0) ? ` / ${item.sale_sub_unit_price} SUB` : ''}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 text-center">
                                                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-lg text-[11px] font-semibold ring-1 ring-ring/20">
                                                    {item.batch_number}
                                                </span>
                                            </td>
                                            <td className="py-5 text-center">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-lg text-foreground">{item.quantity}</span>
                                                    {item.sub_quantity > 0 && <span className="text-[10px] font-bold text-muted-foreground">+{item.sub_quantity} sub</span>}
                                                </div>
                                            </td>
                                            <td className="py-5 text-right">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-muted-foreground">{item.unit_cost.toLocaleString()}</span>
                                                    {(item.sub_unit_cost || 0) > 0 && <span className="text-[10px] font-bold text-muted-foreground">{item.sub_unit_cost.toLocaleString()} sub</span>}
                                                </div>
                                            </td>
                                            <td className="py-5 text-right font-semibold text-foreground tracking-tighter">
                                                Rs. {((item.quantity * item.unit_cost) + (item.sub_quantity * (item.sub_unit_cost || 0))).toLocaleString()}
                                            </td>
                                            <td className="py-5 text-right pl-4">
                                                <button
                                                    onClick={() => handleEditItem(idx)}
                                                    className="mr-1 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => removeItem(idx)}
                                                    className="p-2 text-white/85 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* 4. Right - Finalize Panel */}
                <div className="w-full xl:w-[320px] flex flex-col gap-6">
                    <div className="flex-1 bg-foreground rounded-lg p-8 shadow-2xl flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                            Finalize Invoice
                        </h2>

                        <div className="space-y-6 flex-1">
                            <div className="p-6 bg-white/5 rounded-md border border-white/10 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Items Counts</span>
                                    <span className="text-white font-bold">{items.length}</span>
                                </div>
                                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Grand Total</span>
                                    <span className="text-3xl font-semibold text-primary tracking-tighter">Rs. {calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-primary/10 border border-emerald-500/20 rounded-md p-4 flex items-start gap-3">
                                <Save className="text-primary shrink-0 mt-1" size={16} />
                                <p className="text-[11px] text-primary-foreground/85 leading-relaxed font-medium">
                                    {isEditing
                                        ? 'Updating this invoice will adjust stock based on the changes made to items.'
                                        : 'Saving this invoice will immediately increase your stock and record the purchase in audit logs.'
                                    }
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveInvoice}
                            disabled={isSubmitting || items.length === 0}
                            className="w-full h-20 bg-primary hover:bg-primary text-white rounded-[1.5rem] text-xl font-semibold uppercase tracking-widest shadow-xl  transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                            {isEditing ? 'Update Invoice' : 'Post Invoice'}
                            <span className="text-[10px] font-mono opacity-50">F2</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
