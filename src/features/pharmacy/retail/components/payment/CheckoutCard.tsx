"use client"
import React, { useState } from 'react';
import { CartItem, PaymentDetails, PaymentType } from '../../types';
import { CreditCard, Banknote, ShieldCheck, Save, Printer, RefreshCw, Trash2, RotateCcw, CheckCircle2, ListFilter } from 'lucide-react';
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

    const isReturn = mode === 'RETURN';

    return (
        <div className={`flex flex-col h-full min-h-0 ${isCompact ? 'gap-5' : 'gap-7'}`}>
            {/* 1. Value Summary Area */}
            <div className={isCompact ? 'space-y-4' : 'space-y-5'}>
                <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                        {isReturn ? 'Total Refundable' : 'Total Payable'}
                    </label>
                    <div className={`${isCompact ? 'text-4xl' : 'text-5xl'} font-bold tracking-tight font-mono tabular-nums ${isReturn ? 'text-danger' : 'text-foreground'}`}>
                        {formatCurrency(payment.payableAmount)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`bg-muted/50 border border-border rounded-lg ${isCompact ? 'p-3' : 'p-4'}`}>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Items Disc.</label>
                        <div className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold font-mono tabular-nums text-success`}>{formatCurrency(payment.itemsDiscount)}</div>
                    </div>
                    <div className={`bg-muted/50 border border-border rounded-lg ${isCompact ? 'p-3' : 'p-4'}`}>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Total Savings</label>
                        <div className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold font-mono tabular-nums text-success`}>{formatCurrency(payment.totalDiscount)}</div>
                    </div>
                </div>
            </div>

            {/* 2. Payment Control Center */}
            <div className={`bg-muted/30 border border-border rounded-lg ${isCompact ? 'p-4 space-y-4' : 'p-5 space-y-5'}`}>
                {/* Bill Discount */}
                {!isReturn ? (
                    <div className={`rounded-md border border-border bg-background ${isCompact ? 'p-3' : 'p-4'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Bill Discount</div>
                                <div className="mt-1 text-xs text-muted-foreground">
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
                                    className={`w-20 rounded-md border border-input bg-background px-3 ${isCompact ? 'py-1.5' : 'py-2'} text-right text-sm font-semibold font-mono tabular-nums text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                                />
                                <span className="text-sm font-semibold text-muted-foreground">%</span>
                            </div>
                        </div>

                        <div className={`mt-3 flex gap-2 ${isCompact ? 'flex-wrap' : ''}`}>
                            {[0, 5, 10, 15].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => onAdjustmentChange(p)}
                                    className={`rounded-md px-3 py-2 text-xs font-semibold border transition ${
                                        payment.adjustmentPercent === p
                                            ? 'bg-primary/10 border-primary/40 text-primary'
                                            : 'bg-background border-border text-muted-foreground hover:bg-accent'
                                    }`}
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {isReturn ? (
                    <div className={`rounded-md border border-border bg-background ${isCompact ? 'p-3' : 'p-4'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Bill Discount</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {payment.adjustmentPercent > 0 ? (
                                        <span>
                                            {payment.adjustmentPercent}% • {formatCurrency(payment.adjustment)} off
                                        </span>
                                    ) : (
                                        <span>No bill discount</span>
                                    )}
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                    Refund total is net of invoice discount.
                                </div>
                            </div>
                            <div className="shrink-0 rounded-md border border-border bg-muted px-3 py-2 text-xs font-semibold font-mono tabular-nums text-danger">
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
                            className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-md border transition-all ${payment.type === type.id
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                        >
                            <type.icon size={18} />
                            <span className="text-[11px] font-semibold">{type.label}</span>
                        </button>
                    ))}
                </div>

                {!isReturn ? (
                    <div className="rounded-md border border-border bg-background p-3">
                        <div className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Settlement Mode</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setSettlementMode('collect_now')}
                                className={`rounded-md border px-3 py-2.5 text-xs font-semibold transition ${
                                    settlementMode === 'collect_now'
                                        ? 'bg-primary/10 border-primary/40 text-primary'
                                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                                }`}
                            >
                                Collect Now
                            </button>
                            <button
                                type="button"
                                onClick={() => setSettlementMode('append_to_bill')}
                                className={`rounded-md border px-3 py-2.5 text-xs font-semibold transition ${
                                    settlementMode === 'append_to_bill'
                                        ? 'bg-warning/15 border-warning/50 text-warning-foreground'
                                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                                }`}
                            >
                                Append to Bill
                            </button>
                        </div>
                        {settlementMode === 'append_to_bill' ? (
                            <p className="mt-2 text-[11px] text-warning-foreground">
                                Medicines are dispensed now. Payment will be settled at cashier.
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {/* Amount Received / Change Area */}
                <div className="space-y-3">
                    <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                            {isReturn ? 'Amount Refunded' : 'Amount Received'}
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
                            className={`w-full bg-background border-2 border-input hover:border-ring/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-md ${isCompact ? 'h-12 px-4 text-xl' : 'h-14 px-5 text-2xl'} font-semibold font-mono tabular-nums text-foreground outline-none transition-all placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-medium text-muted-foreground">
                            {isReturn ? 'Balance Remaining' : 'Change Due'}
                        </span>
                        <span className={`text-2xl font-bold font-mono tabular-nums ${payment.changeAmount > 0 || (isReturn && payment.dueAmount === 0) ? 'text-success' : 'text-muted-foreground'}`}>
                            {formatCurrency(isReturn ? payment.dueAmount : payment.changeAmount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Operational Actions */}
            <div className="flex flex-col gap-3 mt-auto">
                {/* Auto-print Toggle (SALE only) */}
                {!isReturn ? (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 rounded-md border border-border">
                        <div className="flex items-center gap-2">
                            <Printer size={14} className="text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Auto-print receipt</span>
                        </div>
                        <button
                            onClick={() => setAutoPrint(!printerSettings.autoPrint)}
                            aria-label="Toggle auto-print receipt"
                            className={`relative w-10 h-5 rounded-full transition-colors ${printerSettings.autoPrint ? 'bg-primary' : 'bg-muted-foreground/30'}`}
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
                        className={`col-span-2 disabled:opacity-50 font-semibold ${isCompact ? 'h-12 text-base' : 'h-14 text-lg'} rounded-md shadow-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] ${isReturn
                            ? 'bg-destructive text-white hover:bg-destructive/90'
                            : 'bg-success text-success-foreground hover:bg-success/90'
                            }`}
                    >
                        {isProcessing ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : isEditing ? (
                            <CheckCircle2 size={20} />
                        ) : !isReturn ? (
                            <CheckCircle2 size={20} />
                        ) : (
                            <RotateCcw size={20} />
                        )}
                        {isEditing ? (isReturn ? 'Update Return' : 'Update Sale') : (isReturn ? 'Process Return' : 'Complete Sale')}
                    </button>

                    {!isReturn ? (
                        <button
                            onClick={handleManualPrint}
                            disabled={isPrinting || !lastTransactionId}
                            className={`col-span-2 bg-background border border-border hover:bg-accent disabled:opacity-40 text-foreground font-medium ${isCompact ? 'h-10' : 'h-11'} rounded-md flex items-center justify-center gap-2 text-sm transition-all`}
                        >
                            {isPrinting ? <RefreshCw className="animate-spin" size={14} /> : <Printer size={14} />}
                            Print Last Receipt
                        </button>
                    ) : null}

                    <button
                        onClick={() => setShowHoldModal(true)}
                        className={`bg-background border border-border hover:bg-accent text-foreground font-medium ${isCompact ? 'h-10' : 'h-11'} rounded-md flex items-center justify-center gap-2 text-sm transition-all`}
                    >
                        <ListFilter size={14} />
                        Load
                    </button>

                    <button
                        onClick={handleHold}
                        data-hold-button
                        disabled={isProcessing || cart.length === 0}
                        className={`bg-background border border-border hover:bg-accent disabled:opacity-40 text-foreground font-medium ${isCompact ? 'h-10' : 'h-11'} rounded-md flex items-center justify-center gap-2 text-sm transition-all`}
                    >
                        <Save size={14} />
                        Hold
                    </button>

                    <button
                        onClick={onClear}
                        disabled={isProcessing || (cart.length === 0 && !isEditing)}
                        className={`col-span-2 bg-background border border-destructive/30 hover:bg-destructive/5 disabled:opacity-40 text-destructive font-medium ${isCompact ? 'h-10' : 'h-11'} rounded-md flex items-center justify-center gap-2 text-sm transition-all`}
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
