"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPosSettings,
  setClearSessionOnModeSwitch,
  setDeadStockDays,
  type PosSettings,
} from '@/src/features/pharmacy/retail/posSettingsStorage';

export function usePharmacyPosSettings() {
  const [settings, setSettings] = useState<PosSettings>(() => ({
    clearSessionOnModeSwitch: true,
    deadStockDays: 30,
  }));

  useEffect(() => {
    setSettings(getPosSettings());
  }, []);

  const updateClearOnSwitch = useCallback((clearSessionOnModeSwitch: boolean) => {
    setClearSessionOnModeSwitch(clearSessionOnModeSwitch);
    setSettings((prev) => ({ ...prev, clearSessionOnModeSwitch }));
  }, []);

  const updateDeadStockDays = useCallback((deadStockDays: number) => {
    const normalized = Number.isFinite(deadStockDays)
      ? Math.min(365, Math.max(1, Math.round(deadStockDays)))
      : 30;
    setDeadStockDays(normalized);
    setSettings((prev) => ({ ...prev, deadStockDays: normalized }));
  }, []);

  return useMemo(
    () => ({
      settings,
      setClearSessionOnModeSwitch: updateClearOnSwitch,
      setDeadStockDays: updateDeadStockDays,
    }),
    [settings, updateClearOnSwitch, updateDeadStockDays]
  );
}
