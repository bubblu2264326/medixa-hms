import React from "react";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  available?: number;
  onEnter?: () => void;
  limitFlash?: boolean;
  onLimitHit?: () => void;
  testId?: string;
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(({
  value,
  onChange,
  label = "Qty",
  min = 1,
  max = 9999,
  available,
  onEnter,
  limitFlash = false,
  onLimitHit,
  testId,
}, ref) => {
  const clamp = (nextValue: number) => Math.min(max, Math.max(min, nextValue));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = Number.parseInt(e.target.value, 10);
    const nextValue = Number.isFinite(rawValue) ? rawValue : 0;
    const clampedValue = clamp(nextValue);
    if (clampedValue !== nextValue) {
      onLimitHit?.();
    }
    onChange(clampedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onEnter?.();
    }
  };

  const increment = () => {
    if (value < max) {
      onChange(clamp(value + 1));
      return;
    }
    onLimitHit?.();
  };

  const decrement = () => {
    if (value > min) {
      onChange(clamp(value - 1));
      return;
    }
    onLimitHit?.();
  };

  return (
    <div className="flex flex-col gap-1.5 flex-1 relative group">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em]">
          {label}
        </label>
        {available !== undefined && (
          <span className="text-[10px] font-bold text-slate-400 opacity-80 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
            Avl: <span className="text-primary">{available}</span>
          </span>
        )}
      </div>

      <div
        data-testid={testId ? `${testId}-field` : undefined}
        className={`flex items-stretch bg-white border-2 border-slate-200/60 rounded-md overflow-hidden focus-within:border-ring/50 focus-within: transition-all ${
          limitFlash
            ? 'border-rose-500 focus-within:border-rose-500 shadow-[0_4px_24px_rgba(244,63,94,0.22)]'
            : ''
        }`}
      >
        <button
          type="button"
          onClick={decrement}
          data-testid={testId ? `${testId}-dec` : undefined}
          className="px-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold border-r border-slate-200 transition-colors"
        >
          -
        </button>
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          data-testid={testId ? `${testId}-input` : undefined}
          className="w-full text-center py-3 text-[16px] font-semibold text-slate-700 outline-none 
                   [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-slate-300"
          placeholder="0"
        />
        <button
          type="button"
          onClick={increment}
          data-testid={testId ? `${testId}-inc` : undefined}
          className="px-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold border-l border-slate-200 transition-colors"
        >
          +
        </button>
      </div>

      {/* Decorative focus bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-center rounded-full"></div>
    </div>
  );
});

QuantityInput.displayName = "QuantityInput";
