import React from "react";
import { CartItem as CartItemType } from "../../types";
import { CartItem } from "./CartItem";
import { CartHeader } from "./CartHeader";

interface CartTableProps {
  items: CartItemType[];
  selectedItem: CartItemType | null;
  onSelectItem: (itemId: string | null) => void;
  onUpdateItem: (itemId: string, updates: Partial<CartItemType>) => void;
  onRemoveItem: (itemId: string) => void;
  onEditItem: (itemId: string) => void;
  prescriptionMode?: boolean;
  onResolveUnavailable?: (item: CartItemType) => void;
  returnMode?: boolean;
  includedItemIds?: Set<string>;
  onToggleInclude?: (itemId: string) => void;
  onSelectAll?: () => void;
  onUnselectAll?: () => void;
}

export const CartTable: React.FC<CartTableProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onUpdateItem,
  onRemoveItem,
  onEditItem,
  prescriptionMode = false,
  onResolveUnavailable,
  returnMode = false,
  includedItemIds,
  onToggleInclude,
  onSelectAll,
  onUnselectAll,
}) => {
  const selectedCount =
    returnMode && includedItemIds ? items.filter((item) => includedItemIds.has(item.id)).length : items.length;

  return (
    <div className="flex flex-col flex-1 bg-white/50 backdrop-blur-xl border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {returnMode ? (
        <div className="flex items-center justify-between gap-3 px-6 py-3 bg-white/60 border-b border-slate-200/40">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Selected {selectedCount}/{items.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              disabled={!onSelectAll || items.length === 0}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onUnselectAll}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              disabled={!onUnselectAll || items.length === 0}
            >
              Unselect All
            </button>
          </div>
        </div>
      ) : null}
      <CartHeader />
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-16 px-5 text-gray-400 text-base">
            No items in cart
          </div>
        ) : (
          items.map((item) => {
            const isIncluded = returnMode && includedItemIds ? includedItemIds.has(item.id) : true;
            return (
              <CartItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onSelect={() => onSelectItem(item.id)}
                onUpdate={(updates) => onUpdateItem(item.id, updates)}
                onRemove={() => onRemoveItem(item.id)}
                onEdit={() => {
                  if (returnMode && !isIncluded && onToggleInclude) {
                    onToggleInclude(item.id);
                  }
                  onEditItem(item.id);
                }}
                prescriptionMode={prescriptionMode}
                onResolveUnavailable={onResolveUnavailable}
                returnMode={returnMode}
                isIncluded={isIncluded}
                onToggleInclude={onToggleInclude ? () => onToggleInclude(item.id) : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
