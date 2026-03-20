"use client"
import { useState, useCallback } from 'react';
import { CartItem, Medicine } from '../types';
import { calculateLineTotal, validateStockClientSide as validateStock } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);

  const addItem = useCallback((
    medicine: Medicine,
    quantity: number = 1,
    subQuantity: number = 0,
    discountPercent: number = 0,
    customPrice?: number
  ) => {
    // Validate stock
    const stockValidation = validateStock(medicine, quantity, subQuantity);
    if (!stockValidation.valid) {
      throw new Error(stockValidation.message);
    }

    const price = customPrice ?? medicine.batch_sale_price ?? medicine.price;
    const subUnitPrice = medicine.batch_sale_sub_unit_price ?? medicine.sub_unit_price;
    const subUnitsPerUnit = medicine.sub_units_per_unit || 1;

    const lineTotal = calculateLineTotal(
      quantity,
      subQuantity,
      price,
      discountPercent,
      subUnitPrice,
      subUnitsPerUnit
    );

    const discountedPrice = price - (price * discountPercent / 100);

    setCart(prev => {
      const existingIdx = prev.findIndex(item =>
        item.medicine.id === medicine.id &&
        item.batchId === medicine.batch_id
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity,
          subQuantity,
          discountPercent,
          customPrice,
          price,
          discountedPrice,
          lineTotal
        };
        return updated;
      }

      const newItem: CartItem = {
        id: uuidv4(),
        medicine,
        quantity,
        subQuantity,
        price,
        discountedPrice,
        discountPercent,
        customPrice,
        lineTotal,
        batchId: medicine.batch_id,
        batchNumber: medicine.batch_number,
        batchCode: medicine.batch_code
      };
      return [...prev, newItem];
    });
  }, []);

  const updateItem = useCallback((
    itemId: string,
    updates: Partial<CartItem>
  ) => {
    const currentItem = cart.find((item) => item.id === itemId);
    if (!currentItem) {
      return;
    }

    const updatedItem = { ...currentItem, ...updates };

    if (updatedItem.isInventoryBacked !== false && updatedItem.fulfillmentMode !== 'override') {
      const stockValidation = validateStock(
        updatedItem.medicine,
        updatedItem.quantity,
        updatedItem.subQuantity
      );

      if (!stockValidation.valid) {
        throw new Error(stockValidation.message);
      }
    }

    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      const subUnitsPerUnit = item.medicine.sub_units_per_unit || 1;
      const subUnitPrice = item.medicine.batch_sale_sub_unit_price ?? item.medicine.sub_unit_price;

      updatedItem.lineTotal = updatedItem.isBillable === false
        ? 0
        : calculateLineTotal(
            updatedItem.quantity,
            updatedItem.subQuantity,
            updatedItem.price,
            updatedItem.discountPercent,
            subUnitPrice,
            subUnitsPerUnit
          );

      return updatedItem;
    }));
  }, [cart]);

  const removeItem = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  }, [selectedItem]);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedItem(null);
  }, []);

  const loadCart = useCallback((items: CartItem[]) => {
    setCart(items);
    setSelectedItem(null);
  }, []);

  const selectItem = useCallback((itemId: string | null) => {
    if (!itemId) {
      setSelectedItem(null);
      return;
    }
    const item = cart.find(i => i.id === itemId);
    setSelectedItem(item || null);
  }, [cart]);

  return {
    cart,
    selectedItem,

    addItem,
    updateItem,
    removeItem,
    clearCart,
    loadCart,
    selectItem
  };
};
