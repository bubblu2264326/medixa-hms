import React from 'react';

interface CloseButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CloseButton: React.FC<CloseButtonProps> = ({ onClick, disabled = false }) => {
  const handleClick = () => {
    if (window.confirm('Are you sure you want to clear the cart?')) onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title="Close/Clear Cart [ESC]"
      className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg font-semibold text-sm shadow-md bg-destructive text-white hover:bg-red-700 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-2xl">✕</span>
      <span className="tracking-wide text-xs">CLOSE</span>
    </button>
  );
};
