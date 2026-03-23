"use client"
import React, { useState } from 'react';
import { CartItem, PaymentDetails } from '../../types';
import { submitTransaction, holdTransaction, openCashDrawer } from '../../api';
import { generateReference, formatCurrency } from '../../utils';
import toast from 'react-hot-toast';
import { CloseButton } from './CloseButton';
import { PrintButton } from './PrintButton';
import { PayDueButton } from './PayDueButton';
import { fireAndForgetPrint, printReceiptUnified } from '@/src/features/pharmacy/printing/unifiedPrint';
import { usePharmacyPrinterSettings } from '@/src/features/pharmacy/settings/hooks/usePharmacyPrinterSettings';

interface ActionButtonsProps {
  cart: CartItem[];
  payment: PaymentDetails;
  onComplete: () => void;
  onClear: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  cart,
  payment,
  onComplete,
  onClear,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const { settings: printerSettings } = usePharmacyPrinterSettings();

  const handlePayNow = async () => {


    if (cart.length === 0) return toast.error('Cart is empty');

    if (payment.dueAmount > 0 && !window.confirm(`Due amount ${formatCurrency(payment.dueAmount)}. Continue?`)) return;

    setIsProcessing(true);
    try {
      const transaction = {
        reference: generateReference(),
        items: cart,
        payment,
        cashier: 'Current User',
        status: 'completed' as const,
        mode: 'SALE' as const,
      };
      console.log(transaction);

      const response = await submitTransaction(transaction);
      if (response.success && response.data) {
        setLastTransactionId(response.data.id);
        if (printerSettings.autoPrint) fireAndForgetPrint(response.data.id);
        if (payment.type === 'CASH') await openCashDrawer();
        toast.success('Transaction completed successfully!');
        onComplete();
      } else toast.error(response.error || 'Transaction failed');
    } catch (err) {
      console.error(err);
      toast.error('Error during transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHold = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    setIsProcessing(true);
    try {
      const transaction = {
        reference: generateReference(),
        items: cart,
        payment,
        cashier: 'Current User',
        status: 'held' as const,
        mode: 'SALE' as const,
      };

      const response = await holdTransaction(transaction);
      if (response.success && response.data) {
        toast.success(`Transaction held successfully! Hold ID: ${response.data.holdId}`);
        onComplete();
      } else toast.error(response.error || 'Failed to hold transaction');
    } catch (err) {
      console.error(err);
      toast.error('Error while holding transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = async () => {
    if (!lastTransactionId) return toast.error('No recent transaction to print');
    try {
      await printReceiptUnified(lastTransactionId);
    } catch (err) {
      console.error(err);
      toast.error('Error while printing');
    }
  };

  const handleOpenDrawer = async () => {
    try {
      const res = await openCashDrawer();
      if (!res.success) toast.error(res.error || 'Failed to open cash drawer');
    } catch (err) {
      console.error(err);
      toast.error('Error while opening drawer');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Row */}
      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <CloseButton onClick={onClear} disabled={isProcessing} />
        <PrintButton onClick={handlePrint} disabled={isProcessing || !lastTransactionId} />
        <PayDueButton onClick={handlePayNow} disabled={isProcessing || cart.length === 0} />
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <button
          className="flex flex-col items-center justify-center gap-2 p-5 font-semibold text-sm rounded-lg shadow-md bg-amber-500 text-white hover:bg-amber-600 transition-all duration-300 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          onClick={handleHold}
          disabled={isProcessing || cart.length === 0}
        >
          <span className="text-[10px] text-white/80">[HLD]</span>
          Hold
        </button>

        <button
          className="flex flex-col items-center justify-center gap-2 p-5 font-semibold text-sm rounded-lg shadow-md bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          onClick={() => toast.success('Email receipt feature coming soon')}
          disabled={isProcessing || !lastTransactionId}
        >
          <span className="text-[10px] text-white/80">[EM]</span>
          Email
        </button>

        <button
          className="flex flex-col items-center justify-center gap-2 p-5 font-semibold text-sm rounded-lg shadow-md bg-purple-600 text-white hover:bg-purple-700 transition-all duration-300 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          onClick={handleOpenDrawer}
          disabled={isProcessing}
        >
          <span className="text-[10px] text-white/80">[CKT Ope]</span>
          Open Drawer
        </button>
      </div>
    </div>
  );
};
