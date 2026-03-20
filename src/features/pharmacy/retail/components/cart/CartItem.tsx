import React from "react";
import { CartItem as CartItemType } from "../../types";
import { formatCurrency } from "../../utils";

interface CartItemProps {
  item: CartItemType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CartItemType>) => void;
  onRemove: () => void;
  onEdit: () => void;
  prescriptionMode?: boolean;
  onResolveUnavailable?: (item: CartItemType) => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  isSelected,
  onSelect,
  onRemove,
  onEdit,
  prescriptionMode = false,
  onResolveUnavailable,
}) => {
  const isPrescriptionItem = prescriptionMode && Boolean(item.prescriptionMedicineId);
  const isUnavailablePrescription =
    isPrescriptionItem &&
    (item.availabilityStatus === "out_of_stock" || item.availabilityStatus === "insufficient_stock") &&
    item.fulfillmentMode !== "override";
  const isOverrideItem = item.fulfillmentMode === "override";

  return (
    <div
      onClick={onSelect}
      className={`group grid grid-cols-[3.5fr_1.2fr_0.8fr_0.8fr_1fr_1fr_1fr_1.2fr_1.5fr] gap-4 px-6 py-5 
                  border-b border-slate-100/50 cursor-pointer transition-all duration-300
                  items-center relative overflow-hidden
                  ${isSelected ? "bg-indigo-50/50 shadow-[inset_4px_0_0_#6366f1]" : "hover:bg-slate-50/50"}`}
    >
      {/* Product Column */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-800 text-[14px] tracking-tight truncate">{item.medicine.brand_name}</span>
          {isPrescriptionItem && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Rx
            </span>
          )}
          {isUnavailablePrescription && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-rose-700">
              {item.availabilityStatus === "insufficient_stock" ? "Low Stock" : "Out of Stock"}
            </span>
          )}
          {isOverrideItem && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">
              Override
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
            {item.medicine.generic_name}
          </span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest whitespace-nowrap">
            {item.medicine.form}
          </span>
        </div>
        {(item.availabilityNote || item.overrideReasonNote) && (
          <div className="truncate text-[10px] text-slate-500">
            {item.overrideReasonNote || item.availabilityNote}
          </div>
        )}
      </div>

      {/* Batch Column */}
      <div className="flex items-center">
        {item.batchNumber ? (
          <div className="flex flex-col">
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100/50 shadow-sm">
              {item.batchNumber}
            </span>
            {item.batchCode ? (
              <span className="mt-1 text-[9px] font-mono text-slate-400">
                Ref: {item.batchCode}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No lot</span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className={`text-[18px] font-black tracking-tighter italic ${item.quantity === 0 ? 'text-slate-200' : 'text-slate-900'}`}>
          {item.quantity}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className={`text-[14px] font-black ${item.subQuantity > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
          {item.subQuantity}
        </span>
      </div>

      <div className="flex items-center justify-end pr-4">
        <span className="text-[14px] text-slate-500 font-medium tracking-tight whitespace-nowrap">{formatCurrency(item.price)}</span>
      </div>

      <div className="flex items-center justify-end pr-4">
        <span className="text-[14px] text-indigo-600 font-bold tracking-tight whitespace-nowrap">{formatCurrency(item.discountedPrice)}</span>
      </div>

      <div className="flex items-center justify-center">
        {item.isBillable === false ? (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black tracking-tighter">
            Excluded
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black tracking-tighter flex items-center gap-1">
            {item.discountPercent.toFixed(1)}% <span className="text-[8px] opacity-60">OFF</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-end pr-10">
        <span className="font-black text-slate-900 text-[18px] tracking-tighter whitespace-nowrap">
          {formatCurrency(item.lineTotal)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1">
        {isUnavailablePrescription && onResolveUnavailable ? (
          <button
            title="Include with override"
            className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 transition-all hover:bg-amber-100"
            onClick={(e) => {
              e.stopPropagation();
              onResolveUnavailable(item);
            }}
          >
            Include
          </button>
        ) : null}
        <button
          title="Edit"
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isUnavailablePrescription}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <span className="text-lg">✎</span>
        </button>
        <button
          title="Remove"
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <span className="text-lg text-rose-400">🗑</span>
        </button>
      </div>
    </div>
  );
};
