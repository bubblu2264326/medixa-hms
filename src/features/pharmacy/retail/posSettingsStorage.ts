export type PosSettings = {
  clearSessionOnModeSwitch: boolean;
  deadStockDays: number;
};

const CLEAR_ON_SWITCH_KEY = 'pharmacy.retail.pos.clearSessionOnModeSwitch';
const DEAD_STOCK_DAYS_KEY = 'pharmacy.retail.pos.deadStockDays';

const DEFAULTS: PosSettings = {
  clearSessionOnModeSwitch: true,
  deadStockDays: 30,
};

function safeGetItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getPosSettings(): PosSettings {
  if (typeof window === 'undefined') return DEFAULTS;

  const clearRaw = safeGetItem(CLEAR_ON_SWITCH_KEY);
  const deadStockRaw = safeGetItem(DEAD_STOCK_DAYS_KEY);
  const clearSessionOnModeSwitch =
    clearRaw === null ? DEFAULTS.clearSessionOnModeSwitch : clearRaw === 'true';
  const parsedDeadStock = Number(deadStockRaw);
  const deadStockDays = Number.isFinite(parsedDeadStock) && parsedDeadStock >= 1 && parsedDeadStock <= 365
    ? Math.round(parsedDeadStock)
    : DEFAULTS.deadStockDays;

  return { clearSessionOnModeSwitch, deadStockDays };
}

export function setClearSessionOnModeSwitch(clear: boolean) {
  safeSetItem(CLEAR_ON_SWITCH_KEY, String(clear));
}

export function setDeadStockDays(days: number) {
  const normalized = Number.isFinite(days) ? Math.min(365, Math.max(1, Math.round(days))) : DEFAULTS.deadStockDays;
  safeSetItem(DEAD_STOCK_DAYS_KEY, String(normalized));
}
