import React from 'react';
import { PaymentDetails, PaymentType } from '../../types';
import { PaymentTypeSelector } from './PaymentTypeSelector';
import { AmountDisplay } from './AmountDisplay';
import { DiscountSection } from './DiscountSection';

export const PaymentPanel: React.FC<{
  payment: PaymentDetails;
  onPaymentTypeChange: (type: PaymentType) => void;
  onPaidAmountChange: (amount: number) => void;
  onAdjustmentChange: (percent: number) => void;
}> = ({ payment, onPaymentTypeChange, onPaidAmountChange, onAdjustmentChange }) => {
  return (
    <div className="bg-[#2c2c2c] rounded-lg p-5 shadow-[0_4px_12px_rgba(0,0,0,0.2)] text-white">
      <div className="flex flex-col gap-4">
        {/* Reference Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
            Reference
          </label>
          <input
            type="text"
            placeholder="Auto-generated"
            disabled
            className="bg-[#444] text-muted-foreground px-3 py-3 text-base rounded outline-none"
          />
        </div>

        <PaymentTypeSelector selectedType={payment.type} onTypeChange={onPaymentTypeChange} />

        <AmountDisplay label="Payable Amount" amount={payment.payableAmount} className="bg-pink-600" />

        <DiscountSection
          adjustmentPercent={payment.adjustmentPercent}
          adjustment={payment.adjustment}
          onAdjustmentChange={onAdjustmentChange}
        />

        {/* Paid Amount Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
            Paid Amount
          </label>
          <input
            type="number"
            value={payment.paidAmount || ''}
            onChange={(e) => onPaidAmountChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="bg-info text-white font-semibold px-3 py-3 text-base rounded outline-none placeholder:text-white/60"
          />
        </div>

        <AmountDisplay label="Due Amount" amount={payment.dueAmount} className="bg-info" />
        <AmountDisplay label="Change" amount={payment.changeAmount} className="bg-[#333]" />

        {/* Discount Summary */}
        <div className="flex gap-2">
          <AmountDisplay
            label="Items Discount"
            amount={payment.itemsDiscount}
            className="bg-destructive flex-1"
            compact
          />
          <AmountDisplay
            label="Total Discount"
            amount={payment.totalDiscount}
            className="bg-destructive flex-1"
            compact
          />
        </div>
      </div>
    </div>
  );
};
