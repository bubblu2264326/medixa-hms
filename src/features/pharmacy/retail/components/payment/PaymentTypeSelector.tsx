import React from 'react';
import { PaymentType } from '../../types';

interface PaymentTypeSelectorProps {
  selectedType: PaymentType;
  onTypeChange: (type: PaymentType) => void;
}

export const PaymentTypeSelector: React.FC<PaymentTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
        Payment Type
      </label>
      <select
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value as PaymentType)}
        className="bg-success text-white font-semibold py-3 px-3 rounded cursor-pointer outline-none"
      >
        <option value={PaymentType.CASH}>CASH</option>
        <option value={PaymentType.CARD}>CARD</option>
        <option value={PaymentType.INSURANCE}>INSURANCE</option>
        <option value={PaymentType.MOBILE}>MOBILE PAYMENT</option>
        <option value={PaymentType.SPLIT}>SPLIT PAYMENT</option>
      </select>
    </div>
  );
};
