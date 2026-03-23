import {
  Medicine,
  Transaction,
  ApiResponse,
  SearchResponse,
  PrescriptionSaleResponse,
  PatientSearchResult,
  ActiveVisitOption,
  InvoiceSummary,
} from './types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

/**
 * Search medicines by barcode, SKU, or name
 */
export const searchMedicines = async (
  query: string,
  type: 'barcode' | 'sku' | 'name' = 'name'
): Promise<ApiResponse<SearchResponse>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/medicine/search?query=${encodeURIComponent(query)}&type=${type}`
    );
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to search medicines'
    };
  }
};

/**
 * Get medicine by ID
 */
export const getMedicineById = async (
  id: string
): Promise<ApiResponse<Medicine>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/medicine/${id}`);
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to fetch medicine details'
    };
  }
};

/**
 * Check stock availability
 */
export const checkStock = async (
  medicineId: string,
  quantity: number
): Promise<ApiResponse<{ available: boolean; currentStock: number }>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/inventory/check-stock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId, quantity })
      }
    );
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to check stock'
    };
  }
};

/**
 * Submit transaction
 */
export const submitTransaction = async (
  transaction: Omit<Transaction, 'id' | 'timestamp'>
): Promise<ApiResponse<Transaction>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to submit transaction'
    };
  }
};

/**
 * Submit return transaction
 */
export const submitReturn = async (
  transaction: Omit<Transaction, 'id' | 'timestamp'>
): Promise<ApiResponse<Transaction>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to submit return'
    };
  }
};

/**
 * Update transaction
 */
export const updateTransaction = async (
  id: string,
  transaction: any
): Promise<ApiResponse<Transaction>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to update transaction'
    };
  }
};

/**
 * Update sale return
 */
export const updateSaleReturn = async (
  id: string,
  transaction: any
): Promise<ApiResponse<Transaction>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/return/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to update sale return'
    };
  }
};

/**
 * Hold transaction
 */
export const holdTransaction = async (
  transaction: Omit<Transaction, 'id' | 'timestamp'>
): Promise<ApiResponse<{ holdId: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to hold transaction'
    };
  }
};

/**
 * Get held transactions
 */
export const getHeldTransactions = async (): Promise<ApiResponse<Transaction[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/hold`);
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to fetch held transactions'
    };
  }
};

/**
 * Soft-delete a held transaction
 */
export const deleteHeldTransaction = async (holdId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/hold?holdId=${encodeURIComponent(holdId)}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to delete held transaction'
    };
  }
};

/**
 * Get completed transactions (Invoices)
 */
export const getTransactions = async (query?: string): Promise<ApiResponse<Transaction[]>> => {
  try {
    const url = query 
      ? `${API_BASE_URL}/transactions?query=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/transactions`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to fetch transactions'
    };
  }
};

/**
 * Search invoices for return mode (Completed sales only)
 */
export const searchInvoices = async (query: string): Promise<ApiResponse<InvoiceSummary[]>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/transactions?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to search invoices'
    };
  }
};

/**
 * Print receipt
 */
export const printReceipt = async (
  transactionId: string,
  printerName?: string
): Promise<ApiResponse<{ printed: boolean }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/print/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, printerName })
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to print receipt'
    };
  }
};

/**
 * Email receipt
 */
export const emailReceipt = async (
  transactionId: string,
  email: string
): Promise<ApiResponse<{ sent: boolean }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, email })
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to email receipt'
    };
  }
};

/**
 * Open cash drawer
 */
export const openCashDrawer = async (): Promise<ApiResponse<{ opened: boolean }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/hardware/cash-drawer`, {
      method: 'POST'
    });
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to open cash drawer'
    };
  }
};

export const fetchPrescriptionSale = async (
  patientId: string,
  visitId: string
): Promise<ApiResponse<PrescriptionSaleResponse>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/prescription-sale?patientId=${encodeURIComponent(patientId)}&visitId=${encodeURIComponent(visitId)}`
    );
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to load prescription sale'
    };
  }
};

export const searchPrescriptionPatients = async (
  query: string
): Promise<ApiResponse<PatientSearchResult[]>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/patient-search?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to search patients'
    };
  }
};

export const fetchActiveVisits = async (
  patientId: string
): Promise<ApiResponse<ActiveVisitOption[]>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/pharmacy/active-visits?patientId=${encodeURIComponent(patientId)}`
    );
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: 'Failed to load active visits'
    };
  }
};

export const updateVisitWorkflowStatus = async (
  visitId: number | string,
  status: string
): Promise<ApiResponse<{ status: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/visit/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_id: visitId, status })
    });
    const data = await response.json();
    return {
      success: response.ok,
      data: data?.data,
      error: response.ok ? undefined : (data?.error || 'Failed to update visit status'),
    };
  } catch {
    return {
      success: false,
      error: 'Failed to update visit status'
    };
  }
};
