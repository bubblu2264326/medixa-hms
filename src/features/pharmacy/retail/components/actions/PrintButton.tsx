import React from 'react';

interface PrintButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const PrintButton: React.FC<PrintButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Print Receipt [F1]"
      className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg font-semibold text-sm shadow-md bg-slate-400 text-white hover:bg-slate-500 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-2xl">🖨</span>
      <span className="tracking-wide text-xs">PRINT</span>
    </button>
  );
};
