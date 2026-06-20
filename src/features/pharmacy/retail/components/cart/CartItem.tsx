import React from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
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
  returnMode?: boolean;
  isIncluded?: boolean;
  onToggleInclude?: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  isSelected,
  onSelect,
  onRemove,
  onEdit,
  prescriptionMode = false,
  onResolveUnavailable,
  returnMode = false,
  isIncluded = true,
  onToggleInclude,
}) => {
  const isPrescriptionItem = prescriptionMode && Boolean(item.prescriptionMedicineId);
  const isUnavailablePrescription =
    isPrescriptionItem &&
    (item.availabilityStatus === "out_of_stock" || item.availabilityStatus === "insufficient_stock") &&
    item.fulfillmentMode !== "override";
  const isOverrideItem = item.fulfillmentMode === "override";
  const isExcludedByReturn = returnMode && !isIncluded;

  return (
    <div
      onClick={onSelect}
      className={`group grid grid-cols-[3.5fr_1.2fr_0.8fr_0.8fr_1fr_1fr_1fr_1.2fr_1.5fr] gap-4 px-6 py-4
                  border-b border-border cursor-pointer transition-colors
                  items-center relative overflow-hidden
                  ${isSelected ? "bg-accent shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-muted/50"}
                  ${isExcludedByReturn ? "opacity-60" : ""}`}
    >
      {/* Product Column */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          {returnMode ? (
            <button
              type="button"
              aria-label={isIncluded ? "Exclude item from return" : "Include item in return"}
              className={`mr-1 inline-flex h-5 w-5 items-center justify-center rounded-md border transition ${isIncluded
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-muted-foreground hover:border-ring"}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleInclude?.();
              }}
            >
              {isIncluded ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            </button>
          ) : null}
          <span className="font-semibold text-foreground text-sm truncate">{item.medicine.brand_name}</span>
          {isPrescriptionItem && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
              Rx
            </span>
          )}
          {isExcludedByReturn && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Excluded
            </span>
          )}
          {isUnavailablePrescription && (
            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
              {item.availabilityStatus === "insufficient_stock" ? "Low Stock" : "Out of Stock"}
            </span>
          )}
          {isOverrideItem && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">
              Override
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground truncate">
            {item.medicine.generic_name}
          </span>
          <span className="w-1 h-1 bg-border rounded-full"></span>
          <span className="text-[11px] font-medium text-primary whitespace-nowrap">
            {item.medicine.form}
          </span>
        </div>
        {(item.availabilityNote || item.overrideReasonNote) && (
          <div className="truncate text-[11px] text-muted-foreground">
            {item.overrideReasonNote || item.availabilityNote}
          </div>
        )}
      </div>

      {/* Batch Column */}
      <div className="flex items-center">
        {item.batchNumber ? (
          <div className="flex flex-col">
            <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
              {item.batchNumber}
            </span>
            {item.batchCode ? (
              <span className="mt-1 text-[10px] font-mono text-muted-foreground">
                Ref: {item.batchCode}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">No lot</span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className={`text-base font-semibold font-mono tabular-nums ${item.quantity === 0 ? 'text-muted-foreground/40' : 'text-foreground'}`}>
          {item.quantity}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className={`text-sm font-semibold font-mono tabular-nums ${item.subQuantity > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>
          {item.subQuantity}
        </span>
      </div>

      <div className="flex items-center justify-end pr-4">
        <span className="text-sm text-muted-foreground font-mono tabular-nums whitespace-nowrap">{formatCurrency(item.price)}</span>
      </div>

      <div className="flex items-center justify-end pr-4">
        <span className="text-sm text-foreground font-semibold font-mono tabular-nums whitespace-nowrap">{formatCurrency(item.discountedPrice)}</span>
      </div>

      <div className="flex items-center justify-center">
        {item.isBillable === false ? (
          <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-[10px] font-semibold">
            Excluded
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-success/10 text-success rounded-md text-[10px] font-semibold flex items-center gap-1 font-mono tabular-nums">
            {item.discountPercent.toFixed(1)}% <span className="text-[8px] opacity-70 font-sans">OFF</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-end pr-10">
        <span className="font-bold text-foreground text-base font-mono tabular-nums whitespace-nowrap">
          {formatCurrency(item.lineTotal)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1">
        {isUnavailablePrescription && onResolveUnavailable ? (
          <button
            title="Include with override"
            className="h-10 rounded-md border border-warning/40 bg-warning/10 px-3 text-[11px] font-semibold uppercase tracking-wide text-warning-foreground transition-all hover:bg-warning/20"
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
          aria-label="Edit item"
          className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-primary rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isUnavailablePrescription}
          onClick={(e) => {
            e.stopPropagation();
            if (isExcludedByReturn) {
              onToggleInclude?.();
            }
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        <button
          title="Remove"
          aria-label="Remove item"
          className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};
