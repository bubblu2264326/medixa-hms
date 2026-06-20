import React from 'react';

interface DiscountSectionProps {
  adjustmentPercent: number;
  adjustment: number;
  onAdjustmentChange: (percent: number) => void;
}

export const DiscountSection: React.FC<DiscountSectionProps> = ({
  adjustmentPercent,
  adjustment,
  onAdjustmentChange,
}) => {
  return (
    <div className="bg-[#333] p-4 rounded-md">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
          Adjustment
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={adjustment.toFixed(2)}
            disabled
            className="flex-1 bg-[#444] text-white px-3 py-2 rounded outline-none"
          />
          <input
            type="number"
            value={adjustmentPercent}
            onChange={(e) => onAdjustmentChange(parseFloat(e.target.value) || 0)}
            min="0"
            max="100"
            step="0.01"
            placeholder="0"
            className="w-20 bg-info text-white px-3 py-2 rounded outline-none"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">% of total</span>
        </div>
      </div>
    </div>
  );
};
