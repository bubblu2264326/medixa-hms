export type PartyDetail = {
  party_id: number;
  name: string;
  contact_number: string | null;
  address: string | null;
  email: string | null;
  gst_number: string | null;
  status: boolean;
  created_at: string;
};

export type PartyWithStats = PartyDetail & {
  total_purchases: number;
  purchase_count: number;
};

export type AddPartyInput = {
  name: string;
  contact_number?: string;
  address?: string;
  email?: string;
  gst_number?: string;
};

export type LedgerEntry = {
  id: number;
  type: 'Purchase' | 'Return' | 'Payment';
  reference: string | null;
  date: string;
  debit: number;
  credit: number;
};

export type UserRole = 'Pharmacist' | 'Admin' | 'Super Admin' | 'Owner' | string;

export type PartyPermissions = {
  canViewFinancials: boolean;
};

export type PartySupplyBatch = {
  batch_id: number | null;
  batch_number: string | null;
  batch_code: string | null;
  expiry_date: string | null;
  total_units: number;
  total_sub_units: number;
  purchase_count: number;
  first_purchase_date: string | null;
  last_purchase_date: string | null;
};

export type PartySupply = {
  medicine_id: number;
  brand_name: string | null;
  generic_name: string | null;
  category: string | null;
  total_units: number;
  total_sub_units: number;
  supply_events: number;
  batches: PartySupplyBatch[];
};

export type PartySupplyFilters = {
  from?: string;
  to?: string;
  medicine?: string;
  page?: number;
  pageSize?: number;
};

export type PartySupplyGroupBy = 'batch' | 'invoice';

export type PartySupplyGroupChild = {
  medicine_id: number | null;
  brand_name: string | null;
  generic_name: string | null;
  category: string | null;
  quantity: number;
  sub_quantity: number;
  purchase_count: number;
  batch_id: number | null;
  batch_number: string | null;
  batch_code: string | null;
  expiry_date: string | null;
};

export type PartySupplyGroup = {
  group_id: string;
  group_type: PartySupplyGroupBy;
  purchase_id: number | null;
  invoice_no: string | null;
  invoice_timestamp: string | null;
  batch_id: number | null;
  batch_number: string | null;
  batch_code: string | null;
  expiry_date: string | null;
  total_units: number;
  total_sub_units: number;
  supply_events: number;
  children_count: number;
  children: PartySupplyGroupChild[];
};

export type PartySupplyResponse = {
  groupBy: PartySupplyGroupBy;
  groups: PartySupplyGroup[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PartyInventoryHealthMetrics = {
  expiredBatchesCount: number;
  expiredStockUnits: number;
  deadStockBatches: number;
  deadStockUnits: number;
  deadStockDays: number;
};

export type PartyMovementProduct = {
  medicine_id: number;
  brand_name: string | null;
  generic_name: string | null;
  sold_units: number;
  sold_sub_units: number;
};

export type PartyPerformanceMetrics = {
  activeProducts: number;
  purchasedStockUnits: number;
  soldStockUnits: number;
  sellThroughPercent: number;
  fastMovingProducts: PartyMovementProduct[];
  slowMovingProducts: PartyMovementProduct[];
};

export type PartyInsightsFilters = {
  from?: string;
  to?: string;
  deadStockDays?: number;
};

export type PartyInsights = {
  canViewFinancials: boolean;
  operational: {
    purchaseCount: number;
    uniqueProducts: number;
    totalUnits: number;
    totalSubUnits: number;
    lastPurchaseDate: string | null;
  };
  inventoryHealth: PartyInventoryHealthMetrics;
  performance: PartyPerformanceMetrics;
  financial: {
    totalPurchasesAmount: number;
    totalPaidAmount: number;
    outstandingAmount: number;
    totalReturnAmount: number;
    returnRate: number;
    averagePurchaseTicket: number;
  } | null;
};
