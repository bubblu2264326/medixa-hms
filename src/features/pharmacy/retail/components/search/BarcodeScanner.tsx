import React, { useRef, useEffect } from "react";

interface BarcodeScannerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  value,
  onChange,
  placeholder = "Barcode scanner",
  autoFocus = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) {
        onChange(value);
      }
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className="
          w-full 
          px-[15px] py-[12px] 
          text-[16px] 
          border-2 border-gray-300 
          rounded-md 
          outline-none 
          transition-colors 
          duration-300 
          placeholder:text-gray-400 
          placeholder:italic
          focus:border-green-500 
          focus:shadow-[0_0_0_3px_rgba(76,175,80,0.1)]
        "
      />
    </div>
  );
};
