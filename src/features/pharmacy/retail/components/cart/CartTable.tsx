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
}) => {
  return (
    <div className="flex flex-col flex-1 bg-white/50 backdrop-blur-xl border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CartHeader />
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-16 px-5 text-gray-400 text-base">
            No items in cart
          </div>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              onSelect={() => onSelectItem(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
              onRemove={() => onRemoveItem(item.id)}
              onEdit={() => onEditItem(item.id)}
              prescriptionMode={prescriptionMode}
              onResolveUnavailable={onResolveUnavailable}
            />
          ))
        )}
      </div>
    </div>
  );
};
