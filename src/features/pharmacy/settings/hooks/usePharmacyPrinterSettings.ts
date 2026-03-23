"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PrintMode, PrinterSettings } from '@/src/features/pharmacy/printing/types';
import {
  getPrinterSettings,
  setAutoPrint,
  setPrinterMode,
  setQzPrinterName,
} from '@/src/features/pharmacy/printing/settingsStorage';

export function usePharmacyPrinterSettings() {
  const [settings, setSettings] = useState<PrinterSettings>(() => ({
    mode: 'browser',
    autoPrint: true,
    qzPrinterName: '',
  }));

  useEffect(() => {
    setSettings(getPrinterSettings());
  }, []);

  const updateMode = useCallback((mode: PrintMode) => {
    setPrinterMode(mode);
    setSettings((prev) => ({ ...prev, mode }));
  }, []);

  const updateAutoPrint = useCallback((autoPrint: boolean) => {
    setAutoPrint(autoPrint);
    setSettings((prev) => ({ ...prev, autoPrint }));
  }, []);

  const updateQzPrinterName = useCallback((qzPrinterName: string) => {
    setQzPrinterName(qzPrinterName);
    setSettings((prev) => ({ ...prev, qzPrinterName }));
  }, []);

  const api = useMemo(
    () => ({
      settings,
      setMode: updateMode,
      setAutoPrint: updateAutoPrint,
      setQzPrinterName: updateQzPrinterName,
    }),
    [settings, updateMode, updateAutoPrint, updateQzPrinterName]
  );

  return api;
}

