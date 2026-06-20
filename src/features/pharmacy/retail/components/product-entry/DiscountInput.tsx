import React from "react";

interface DiscountInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  onEnter?: () => void;
}

export const DiscountInput = React.forwardRef<HTMLInputElement, DiscountInputProps>(({
  value,
  onChange,
  label = "Disc %",
  min = 0,
  max = 100,
  onEnter,
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "0") {
      onChange(0);
      return;
    }
    const newValue = parseFloat(raw);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.();
    }
  };

  const increment = () => {
    if (value < max) onChange(Math.min(value + 1, max));
  };

  const decrement = () => {
    if (value > min) onChange(Math.max(value - 1, min));
  };

  return (
    <div className="flex flex-col gap-1.5 flex-1 relative group">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-0.5">
        {label}
      </label>

      <div className="flex items-stretch bg-white border-2 border-slate-200/60 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 focus-within:shadow-[0_4px_20px_rgba(16,185,129,0.1)] transition-all">
        <button
          type="button"
          onClick={decrement}
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
          step="1"
          placeholder="0"
          className="w-full text-center py-3 text-[16px] font-black text-emerald-600 outline-none
                   [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-slate-300"
        />
        <span className="flex items-center px-2 bg-slate-50 text-emerald-400 font-bold text-sm select-none border-l border-slate-200">
          %
        </span>
        <button
          type="button"
          onClick={increment}
          className="px-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold border-l border-slate-200 transition-colors"
        >
          +
        </button>
      </div>

      {/* Decorative focus bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-center rounded-full"></div>
    </div>
  );
});

DiscountInput.displayName = "DiscountInput";
