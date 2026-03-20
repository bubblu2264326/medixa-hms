export const CartHeader: React.FC = () => {
  return (
    <div
      className="
        grid grid-cols-[3.5fr_1.2fr_0.8fr_0.8fr_1fr_1fr_1fr_1.2fr_1.5fr]
        gap-4 px-6 py-4
        bg-slate-50 border-b border-slate-200/60
        text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]
        sticky top-0 z-10
      "
    >
      <div>Product Detail</div>
      <div>Lot / Batch</div>
      <div className="text-center">Qty</div>
      <div className="text-center">Sub</div>
      <div className="text-right pr-4">Base</div>
      <div className="text-right pr-4">Net</div>
      <div className="text-center">Disc</div>
      {/* Line Total + Actions header */}
      <div className="flex justify-end pr-10">
        Line Total
      </div>
      <div className="text-center">Actions</div>
    </div>
  );
};
