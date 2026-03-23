"use client"
import React, { useState } from 'react';
import { CartItem, PaymentDetails, PaymentType } from '../../types';
import { CreditCard, Banknote, ShieldCheck, Save, Printer, Play, RefreshCw, Trash2, RotateCcw, CheckCircle2, ListFilter } from 'lucide-react';
import { HeldTransactionsModal } from './HeldTransactionsModal';
import { submitTransaction, submitReturn, updateTransaction, updateSaleReturn, holdTransaction, openCashDrawer } from '../../api';
import { generateReference, formatCurrency } from '../../utils';
import { POSMode } from '../../types';
import toast from 'react-hot-toast';
import { fireAndForgetPrint, printReceiptUnified } from '@/src/features/pharmacy/printing/unifiedPrint';
import { usePharmacyPrinterSettings } from '@/src/features/pharmacy/settings/hooks/usePharmacyPrinterSettings';

interface CheckoutCardProps {
    cart: CartItem[];
    payment: PaymentDetails;
    onPaymentTypeChange: (type: PaymentType) => void;
    onPaidAmountChange: (amount: number) => void;
    onAdjustmentChange: (percent: number) => void;
    onComplete: () => void;
    onClear: () => void;
    onBackToSearch?: () => void;
    mode: POSMode;
    isEditing?: boolean;
    editId?: string | null;
    density?: 'comfortable' | 'compact';
    transactionMeta?: {
        visitId?: number | null;
        billId?: number | null;
        prescriptionId?: number | null;
        patientId?: number | null;
        customerId?: number;
        customerName?: string;
        holdId?: string | null;
        refSaleId?: string | number | null;
    };
    onLoadTransaction?: (transaction: any) => void;
}

export interface CheckoutCardHandle {
    focusAmountReceived: () => void;
}

export const CheckoutCard = React.forwardRef<CheckoutCardHandle, CheckoutCardProps>(({
    cart,
    payment,
    onPaymentTypeChange,
    onPaidAmountChange,
    onAdjustmentChange,
    onComplete,
    onClear,
    onBackToSearch,
    mode,
    isEditing,
    editId,
    density = 'comfortable',
    transactionMeta,
    onLoadTransaction
}, ref) => {
    const [settlementMode, setSettlementMode] = useState<'collect_now' | 'append_to_bill'>('collect_now');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
    const [isPaidAmountManual, setIsPaidAmountManual] = useState(false);
    const { settings: printerSettings, setAutoPrint } = usePharmacyPrinterSettings();

    const amountInputRef = React.useRef<HTMLInputElement>(null);
    const lastAutoFilledPaidAmountRef = React.useRef<number | null>(null);
    const isCompact = density === 'compact';

    React.useEffect(() => {
        if (mode !== 'RETURN') {
            lastAutoFilledPaidAmountRef.current = null;
            if (isPaidAmountManual) setIsPaidAmountManual(false);
            return;
        }

        const payable = Number(payment.payableAmount || 0);
        const paid = Number(payment.paidAmount || 0);
        if (payable <= 0) return;

        const lastAuto = lastAutoFilledPaidAmountRef.current;
        const wasAuto = lastAuto !== null && paid === lastAuto;
        const shouldAutoFill = !isPaidAmountManual && (paid === 0 || wasAuto) && paid !== payable;

        if (shouldAutoFill) {
            lastAutoFilledPaidAmountRef.current = payable;
            onPaidAmountChange(payable);
        }
    }, [isPaidAmountManual, mode, onPaidAmountChange, payment.paidAmount, payment.payableAmount]);

    React.useEffect(() => {
        if (mode !== 'SALE') {
            if (settlementMode !== 'collect_now') setSettlementMode('collect_now');
            return;
        }
        if (settlementMode === 'append_to_bill' && payment.paidAmount !== 0) {
            onPaidAmountChange(0);
        }
    }, [mode, onPaidAmountChange, payment.paidAmount, settlementMode]);

    React.useImperativeHandle(ref, () => ({
        focusAmountReceived: () => {
            if (mode === 'RETURN' && payment.paidAmount === 0) {
                onPaidAmountChange(payment.payableAmount);
            }
            amountInputRef.current?.focus();
            amountInputRef.current?.select();
        }
    }));

    const handleProcessSale = async () => {
        if (cart.length === 0) {
            return toast.error(mode === 'RETURN' ? 'Select at least one item to return' : 'Cart is empty');
        }

        if (settlementMode === 'collect_now' && payment.dueAmount > 0) {
            toast.error(`Due amount: ${formatCurrency(payment.dueAmount)}. Please enter full amount.`, {
                duration: 4000,
            });
            return;
        }

        if (mode === 'SALE' && settlementMode === 'append_to_bill') {
            if (!transactionMeta?.visitId || !transactionMeta?.billId) {
                toast.error('Append to bill requires an active patient visit and bill.');
                return;
            }
        }

        setIsProcessing(true);
        try {
            const normalizedCustomerName = transactionMeta?.customerName?.trim();
            const normalizedCustomer = normalizedCustomerName
                ? {
                    id: transactionMeta?.customerId
                        ? String(transactionMeta.customerId)
                        : "walk-in",
                    name: normalizedCustomerName,
                }
                : undefined;
            const effectivePayment = mode === 'SALE' && settlementMode === 'append_to_bill'
                ? {
                    ...payment,
                    paidAmount: 0,
                    dueAmount: payment.payableAmount,
                    changeAmount: 0,
                }
                : payment;
            const transaction = {
                reference: generateReference(),
                items: cart,
                payment: effectivePayment,
                cashier: 'Current User',
                status: 'completed' as const,
                mode,
                visitId: transactionMeta?.visitId ?? null,
                billId: transactionMeta?.billId ?? null,
                prescriptionId: transactionMeta?.prescriptionId ?? null,
                patientId: transactionMeta?.patientId ?? null,
                customerId: transactionMeta?.customerId,
                customer: normalizedCustomer,
                holdId: transactionMeta?.holdId ?? null,
                ref_sale_id: transactionMeta?.refSaleId ? Number(transactionMeta.refSaleId) : undefined,
                settlementMode: mode === 'SALE' ? settlementMode : undefined,
            };

            const response = isEditing && editId
                ? (mode === 'RETURN'
                    ? await updateSaleReturn(editId, transaction)
                    : await updateTransaction(editId, transaction))
                : (mode === 'SALE'
                    ? await submitTransaction(transaction)
                    : await submitReturn(transaction));

            if (response.success && response.data) {
                const newTxId = response.data.id;
                setLastTransactionId(newTxId);

                // Auto-print (SALE only)
                if (mode === 'SALE' && printerSettings.autoPrint) fireAndForgetPrint(newTxId);

                if (payment.type === PaymentType.CASH) await openCashDrawer();
                if (!isEditing && mode === "SALE" && settlementMode === "append_to_bill" && transactionMeta?.billId) {
                    const cashierUrl = `/cashier?billId=${encodeURIComponent(String(transactionMeta.billId))}`;
                    toast.success(
                        `Dispensed and appended to bill. Settle at cashier: ${cashierUrl}`
                    );
                } else {
                    toast.success(isEditing ? 'Transaction updated successfully!' : 'Transaction completed successfully!');
                }
                onComplete();
            } else toast.error(response.error || 'Transaction failed');
        } catch (err) {
            console.error(err);
            toast.error('Error during transaction');
        } finally {
            setIsProcessing(false);
            setIsPrinting(false);
        }
    };

    const handleManualPrint = async () => {
        if (!lastTransactionId) {
            toast.error('No recent transaction to print');
            return;
        }

        if (mode !== 'SALE') {
            toast.error('Printing is disabled for returns');
            return;
        }
        setIsPrinting(true);
        try {
            await printReceiptUnified(lastTransactionId);
        } catch (error) {
            console.error(error);
            toast.error('Printing failed');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleHold = async () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        setIsProcessing(true);
        try {
            const normalizedCustomerName = transactionMeta?.customerName?.trim();
            const normalizedCustomer = normalizedCustomerName
                ? {
                    id: transactionMeta?.customerId
                        ? String(transactionMeta.customerId)
                        : "walk-in",
                    name: normalizedCustomerName,
                }
                : undefined;
            const transaction = {
                reference: generateReference(),
                items: cart,
                payment,
                cashier: 'Current User',
                status: 'held' as const,
                mode,
                visitId: transactionMeta?.visitId ?? null,
                billId: transactionMeta?.billId ?? null,
                prescriptionId: transactionMeta?.prescriptionId ?? null,
                patientId: transactionMeta?.patientId ?? null,
                customerId: transactionMeta?.customerId,
                customer: normalizedCustomer,
            };

            const response = await holdTransaction(transaction);
            if (response.success && response.data) {
                toast.success(`Transaction held successfully!`);
                onComplete();
            } else toast.error(response.error || 'Failed to hold transaction');
        } catch (err) {
            console.error(err);
            toast.error('Error while holding transaction');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAmountKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleProcessSale();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onBackToSearch?.();
        }
    };

    return (
        <div className={`flex flex-col h-full min-h-0 ${isCompact ? 'gap-5' : 'gap-8'}`}>
            {/* 1. Value Summary Area */}
            <div className={isCompact ? 'space-y-4' : 'space-y-6'}>
                <div>
                    <label className={`text-[11px] font-bold uppercase tracking-widest mb-2 block ${mode === 'SALE' ? 'text-slate-400' : 'text-rose-400'}`}>
                        {mode === 'SALE' ? 'Total Payable' : 'Total Refundable'}
                    </label>
                    <div className={`${isCompact ? 'text-4xl' : 'text-5xl'} font-black tracking-tight ${mode === 'SALE' ? 'text-white' : 'text-rose-400'}`}>
                        {formatCurrency(payment.payableAmount)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={`bg-white/5 border border-white/10 rounded-2xl ${isCompact ? 'p-3' : 'p-4'}`}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Items Disc</label>
                        <div className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold text-emerald-400`}>{formatCurrency(payment.itemsDiscount)}</div>
                    </div>
                    <div className={`bg-white/5 border border-white/10 rounded-2xl ${isCompact ? 'p-3' : 'p-4'}`}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Total Savings</label>
                        <div className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold text-emerald-400`}>{formatCurrency(payment.totalDiscount)}</div>
                    </div>
                </div>
            </div>

            {/* 2. Payment Control Center */}
            <div className={`bg-white/5 border border-white/10 rounded-3xl ${isCompact ? 'p-4 space-y-5' : 'p-6 space-y-6'}`}>
                {/* Bill Discount */}
                {mode === 'SALE' ? (
                    <div className={`rounded-2xl border border-white/10 bg-white/5 ${isCompact ? 'p-3' : 'p-4'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill Discount</div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {payment.adjustmentPercent > 0 ? (
                                        <span>
                                            {payment.adjustmentPercent}% • {formatCurrency(payment.adjustment)} off
                                        </span>
                                    ) : (
                                        <span>No bill discount</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={payment.adjustmentPercent || 0}
                                    onChange={(e) => {
                                        const next = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                        onAdjustmentChange(next);
                                    }}
                                    className={`w-20 rounded-xl border border-white/10 bg-transparent px-3 ${isCompact ? 'py-1.5' : 'py-2'} text-right text-sm font-black text-white outline-none focus:border-emerald-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                                />
                                <span className="text-sm font-black text-slate-400">%</span>
                            </div>
                        </div>

                        <div className={`mt-3 flex gap-2 ${isCompact ? 'flex-wrap' : ''}`}>
                            {[0, 5, 10, 15].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => onAdjustmentChange(p)}
                                    className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest border transition ${
                                        payment.adjustmentPercent === p
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                            : 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5'
                                    }`}
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {mode === 'RETURN' ? (
                    <div className={`rounded-2xl border border-white/10 bg-white/5 ${isCompact ? 'p-3' : 'p-4'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill Discount</div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {payment.adjustmentPercent > 0 ? (
                                        <span>
                                            {payment.adjustmentPercent}% • {formatCurrency(payment.adjustment)} off
                                        </span>
                                    ) : (
                                        <span>No bill discount</span>
                                    )}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-600">
                                    Refund total is net of invoice discount.
                                </div>
                            </div>
                            <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-rose-300">
                                {payment.adjustmentPercent || 0}%
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Payment Type Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: PaymentType.CASH, label: 'Cash', icon: Banknote },
                        { id: PaymentType.CARD, label: 'Card', icon: CreditCard },
                        { id: PaymentType.INSURANCE, label: 'Insure', icon: ShieldCheck },
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => onPaymentTypeChange(type.id)}
                            className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all ${payment.type === type.id
                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                : 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                        >
                            <type.icon size={18} />
                            <span className="text-[10px] font-bold uppercase">{type.label}</span>
                        </button>
                    ))}
                </div>

                {mode === 'SALE' ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlement Mode</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setSettlementMode('collect_now')}
                                className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                                    settlementMode === 'collect_now'
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                        : 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                Collect Now
                            </button>
                            <button
                                type="button"
                                onClick={() => setSettlementMode('append_to_bill')}
                                className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                                    settlementMode === 'append_to_bill'
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                        : 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                Append to Bill
                            </button>
                        </div>
                        {settlementMode === 'append_to_bill' ? (
                            <p className="mt-2 text-[11px] text-amber-300/90">
                                Medicines are dispensed now. Payment will be settled at cashier.
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {/* Amount Received / Change Area */}
                <div className="space-y-4">
                    <div className="relative group">
                        <label className="absolute -top-2 left-4 px-1 bg-slate-900 text-[10px] font-bold text-slate-400 uppercase z-10">
                            {mode === 'SALE' ? 'Amount Received' : 'Amount Refunded'}
                        </label>
                        <input
                            ref={amountInputRef}
                            type="number"
                            value={payment.paidAmount || ''}
                            onChange={(e) => {
                                const next = parseFloat(e.target.value) || 0;
                                if (mode === 'RETURN') {
                                    const lastAuto = lastAutoFilledPaidAmountRef.current;
                                    setIsPaidAmountManual(!(lastAuto !== null && next === lastAuto));
                                }
                                onPaidAmountChange(next);
                            }}
                            onKeyDown={handleAmountKeyDown}
                            className={`w-full bg-transparent border-2 border-white/10 group-hover:border-emerald-500/50 focus:border-emerald-500 rounded-2xl ${isCompact ? 'py-3 px-5 text-xl' : 'py-5 px-6 text-2xl'} font-bold text-white outline-none transition-all placeholder:text-white/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold text-slate-400">
                            {mode === 'SALE' ? 'Change Due' : 'Balance Remaining'}
                        </span>
                        <span className={`text-2xl font-black ${payment.changeAmount > 0 || (mode === 'RETURN' && payment.dueAmount === 0) ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {formatCurrency(mode === 'SALE' ? payment.changeAmount : payment.dueAmount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Operational Actions */}
            <div className="flex flex-col gap-4 mt-auto">
                {/* Auto-print Toggle (SALE only) */}
                {mode === 'SALE' ? (
                    <div className="flex items-center justify-between px-2 py-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                            <Printer size={14} className="text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-print receipt</span>
                        </div>
                        <button
                            onClick={() => setAutoPrint(!printerSettings.autoPrint)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${printerSettings.autoPrint ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${printerSettings.autoPrint ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleProcessSale}
                        data-pay-button
                        disabled={isProcessing || cart.length === 0}
                        className={`col-span-2 disabled:opacity-50 disabled:grayscale text-white font-black ${isCompact ? 'py-4 text-base' : 'py-5 text-lg'} rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-wider ${mode === 'SALE'
                            ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                            : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20'
                            }`}
                    >
                        {isProcessing ? (
                            <RefreshCw className="animate-spin" />
                        ) : isEditing ? (
                            <CheckCircle2 size={20} />
                        ) : mode === 'SALE' ? (
                            <Play fill="currentColor" size={20} />
                        ) : (
                            <RotateCcw size={20} />
                        )}
                        {isEditing ? (mode === 'RETURN' ? 'Update Return' : 'Update Sale') : (mode === 'SALE' ? 'Complete Sale' : 'Process Return')}
                    </button>

                    {mode === 'SALE' ? (
                        <button
                            onClick={handleManualPrint}
                            disabled={isPrinting || !lastTransactionId}
                            className={`col-span-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 disabled:opacity-30 text-indigo-400 font-bold ${isCompact ? 'py-3' : 'py-4'} rounded-xl flex items-center justify-center gap-2 text-xs uppercase transition-all`}
                        >
                            {isPrinting ? <RefreshCw className="animate-spin" size={14} /> : <Printer size={14} />}
                            Print Last Receipt
                        </button>
                    ) : null}

                    <button
                        onClick={() => setShowHoldModal(true)}
                        className={`bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 font-bold ${isCompact ? 'py-3' : 'py-4'} rounded-xl flex items-center justify-center gap-2 text-xs uppercase transition-all`}
                    >
                        <ListFilter size={14} />
                        Load
                    </button>

                    <button
                        onClick={handleHold}
                        data-hold-button
                        disabled={isProcessing || cart.length === 0}
                        className={`bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold ${isCompact ? 'py-3' : 'py-4'} rounded-xl flex items-center justify-center gap-2 text-xs uppercase transition-all`}
                    >
                        <Save size={14} />
                        Hold
                    </button>

                    <button
                        onClick={onClear}
                        disabled={isProcessing || (cart.length === 0 && !isEditing)}
                        className={`col-span-2 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-500 font-bold ${isCompact ? 'py-3' : 'py-4'} rounded-xl flex items-center justify-center gap-2 text-xs uppercase transition-all`}
                    >
                        <Trash2 size={14} />
                        Clear Entire Sale
                    </button>
                </div>
            </div>

            {showHoldModal && (
                <HeldTransactionsModal 
                    onClose={() => setShowHoldModal(false)}
                    onLoad={(tx) => {
                        onLoadTransaction?.(tx);
                        setShowHoldModal(false);
                    }}
                />
            )}
        </div>
    );
});

CheckoutCard.displayName = 'CheckoutCard';
