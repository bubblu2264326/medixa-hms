import React from "react";

interface CustomPriceInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label?: string;
  onEnter?: () => void;
  readOnly?: boolean;
}

export const CustomPriceInput = React.forwardRef<HTMLInputElement, CustomPriceInputProps>(({
  value,
  onChange,
  label = "Rate/Px",
  onEnter,
  readOnly = false,
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      return;
    }
    const newValue = e.target.value;
    if (newValue === "") {
      onChange(undefined);
    } else {
      const parsed = parseFloat(newValue);
      if (!isNaN(parsed) && parsed >= 0) {
        onChange(parsed);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.();
    }
  };

  return (
    <div className="flex flex-col gap-1.5 flex-1 relative group">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-0.5">
        {label}
      </label>
      <div
        className={[
          'relative border-2 rounded-md overflow-hidden transition-all',
          readOnly
            ? 'border-border/60 bg-muted'
            : 'border-border/60 bg-white focus-within:border-ring/50 focus-within:',
        ].join(' ')}
      >
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[12px] select-none">
          PKR
        </span>
        <input
          ref={ref}
          type="number"
          value={value ?? ""}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          min="0"
          step="0.01"
          placeholder="0.00"
          readOnly={readOnly}
          className="w-full pl-12 pr-4 py-3 text-[16px] font-semibold text-foreground outline-none 
                   [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Decorative focus bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-center rounded-full"></div>
    </div>
  );
});

CustomPriceInput.displayName = "CustomPriceInput";
