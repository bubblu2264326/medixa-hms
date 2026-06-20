import React from 'react';
import { CreditCard } from 'lucide-react';

interface PayDueButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const PayDueButton: React.FC<PayDueButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Complete Payment [F12]"
      className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg font-semibold text-sm shadow-md bg-success text-white hover:bg-green-700 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <CreditCard className="h-6 w-6" aria-hidden />
      <span className="tracking-wide text-xs">PAY DUE</span>
    </button>
  );
};
