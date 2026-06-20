"use client"
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePatient } from '@/contexts/PatientIdContext';
import { MedicineSearch } from './search';
import { QuantityInput, SubQuantityInput, DiscountInput, CustomPriceInput } from './product-entry';
import { CartTable } from './cart';
import { CheckoutCard, CheckoutCardHandle } from './payment/CheckoutCard';
import { useCart, usePayment, useMedicineSearch } from '../hooks';
import { fetchPrescriptionSale, searchPrescriptionPatients, fetchActiveVisits, updateVisitWorkflowStatus, searchInvoices } from '../api';
import { Medicine, POSMode, ApiResponse, Transaction, PrescriptionSaleResponse, PatientSearchResult, ActiveVisitOption, CartItem, OverrideReasonCode, InvoiceSummary } from '../types';
import { usePharmacyPosSettings } from '@/src/features/pharmacy/settings/hooks/usePharmacyPosSettings';
import AddProductButton from './product-entry/AddProductButton';
import { Maximize, Minimize, Layout, ShoppingCart, RotateCcw, Link2Off, Search, UserRound, TriangleAlert } from 'lucide-react';
import toast, { ToastBar, Toaster } from 'react-hot-toast';
import { getMedicineAvailability, validateRequestedStock } from '../stock';
import { formatCurrency } from '../utils';
import { formatDateInTimezone, formatDateTimeInTimezone } from '@/src/lib/timezone/client';
import { useSystemTimezone } from '@/src/lib/timezone/useSystemTimezone';

const OVERRIDE_REASON_OPTIONS: Array<{ value: OverrideReasonCode; label: string }> = [
  { value: 'purchased_from_other_store', label: 'Purchased from other store' },
  { value: 'later_came_in_stock', label: 'Later came in stock' },
  { value: 'manual_local_arrangement', label: 'Manual local arrangement' },
  { value: 'other', label: 'Other' },
];

const PharmacyPOS: React.FC = () => {
  const systemTimezone = useSystemTimezone();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { patientId, selectedVisitId, setPatientVisit, clearSelection } = usePatient();
  const { settings: posSettings } = usePharmacyPosSettings();
  const modeParam = searchParams.get('mode');
  const initialMode: POSMode = modeParam === 'return' ? 'RETURN' : modeParam === 'edit_return' ? 'RETURN' : 'SALE';

  // Product entry state
  const [quantity, setQuantity] = useState<number>(1);
  const [subQuantity, setSubQuantity] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customPrice, setCustomPrice] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemSearched, setItemSearched] = useState<Medicine>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [posMode, setPosMode] = useState<POSMode>(initialMode);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [resumedHoldId, setResumedHoldId] = useState<string | null>(null);
  const [resumedHoldMeta, setResumedHoldMeta] = useState<{
    visitId?: number | null;
    billId?: number | null;
    prescriptionId?: number | null;
    patientId?: number | null;
    customerId?: number;
    customerName?: string;
  } | null>(null);
  const [activePrescription, setActivePrescription] = useState<PrescriptionSaleResponse | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceSearchResults, setInvoiceSearchResults] = useState<InvoiceSummary[]>([]);
  const [isInvoiceSearching, setIsInvoiceSearching] = useState(false);
  const [highlightedInvoiceIndex, setHighlightedInvoiceIndex] = useState(-1);
  const [showInvoiceResults, setShowInvoiceResults] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
  const [loadedInvoicePayment, setLoadedInvoicePayment] = useState<any | null>(null);
  const [returnSelectedIds, setReturnSelectedIds] = useState<Set<string>>(new Set());
  const [refSaleId, setRefSaleId] = useState<string | number | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [highlightedPatientIndex, setHighlightedPatientIndex] = useState(-1);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [visitOptions, setVisitOptions] = useState<ActiveVisitOption[]>([]);
  const [visitPickerPatient, setVisitPickerPatient] = useState<PatientSearchResult | null>(null);
  const [visitPickerError, setVisitPickerError] = useState<string | null>(null);
  const [loadingVisitId, setLoadingVisitId] = useState<string | number | null>(null);
  const [overrideTargetItem, setOverrideTargetItem] = useState<CartItem | null>(null);
  const [overrideReasonCode, setOverrideReasonCode] = useState<OverrideReasonCode>('purchased_from_other_store');
  const [overrideReasonNote, setOverrideReasonNote] = useState('');
  const [overrideQuantity, setOverrideQuantity] = useState(1);
  const [overridePrice, setOverridePrice] = useState<number>(0);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isPortalReady, setIsPortalReady] = useState(false);

  const { cart, selectedItem, addItem, updateItem, removeItem, clearCart, loadCart, selectItem } = useCart();
  const selectedReturnCart = useMemo(
    () => (posMode === 'RETURN' ? cart.filter((item) => returnSelectedIds.has(item.id)) : cart),
    [cart, posMode, returnSelectedIds]
  );
  const { payment, setPaymentType, setPaidAmount, setAdjustment, resetPayment, loadPayment } = usePayment(selectedReturnCart);
  const { results, isSearching, search, clearResults, invalidateCache } = useMedicineSearch();
  const invoiceChipBaseClass =
    'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]';

  const [qtyLimitFlash, setQtyLimitFlash] = useState(false);
  const [subQtyLimitFlash, setSubQtyLimitFlash] = useState(false);
  const qtyFlashTimeoutRef = useRef<number | null>(null);
  const subQtyFlashTimeoutRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const parsePatientSearchLabel = useCallback((value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('Patient #')) return undefined;
    if (trimmed.startsWith('Invoice:')) return undefined;
    return trimmed;
  }, []);

  const resetPosSession = React.useCallback(() => {
    clearCart();
    resetPayment();
    clearResults();
    invalidateCache();
    setItemSearched(undefined);
    setSearchQuery('');
    setQuantity(1);
    setSubQuantity(0);
    setDiscountPercent(0);
    setCustomPrice(undefined);
    setEditingItemId(null);
    setIsEditing(false);
    setEditId(null);
    setResumedHoldId(null);
    setResumedHoldMeta(null);
    setActivePrescription(null);
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setHighlightedPatientIndex(-1);
    setShowPatientResults(false);
    setVisitOptions([]);
    setVisitPickerPatient(null);
    setVisitPickerError(null);
    setLoadingVisitId(null);
    setOverrideTargetItem(null);
    setOverrideReasonCode('purchased_from_other_store');
    setOverrideReasonNote('');
    setOverrideQuantity(1);
    setOverridePrice(0);
    setOverrideError(null);
    setInvoiceSearchQuery('');
    setInvoiceSearchResults([]);
    setIsInvoiceSearching(false);
    setHighlightedInvoiceIndex(-1);
    setShowInvoiceResults(false);
    setSelectedInvoice(null);
    setLoadedInvoicePayment(null);
    setReturnSelectedIds(new Set());
    setRefSaleId(null);
    setPosMode('SALE');
    clearSelection();

    const params = new URLSearchParams(searchParams.toString());
    params.delete('mode');
    params.delete('ref');

    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [clearCart, resetPayment, clearResults, invalidateCache, searchParams, router, pathname, clearSelection]);

  const clearPosSessionForModeSwitch = useCallback(
    (nextMode: POSMode) => {
      clearCart();
      resetPayment();
      clearResults();
      invalidateCache();
      setItemSearched(undefined);
      setSearchQuery('');
      setQuantity(1);
      setSubQuantity(0);
      setDiscountPercent(0);
      setCustomPrice(undefined);
      setEditingItemId(null);
      setIsEditing(false);
      setEditId(null);
      setResumedHoldId(null);
      setResumedHoldMeta(null);
      setActivePrescription(null);
      setPatientSearchQuery('');
      setPatientSearchResults([]);
      setHighlightedPatientIndex(-1);
      setShowPatientResults(false);
      setVisitOptions([]);
      setVisitPickerPatient(null);
      setVisitPickerError(null);
      setLoadingVisitId(null);
      setOverrideTargetItem(null);
      setOverrideReasonCode('purchased_from_other_store');
      setOverrideReasonNote('');
      setOverrideQuantity(1);
      setOverridePrice(0);
      setOverrideError(null);
      setInvoiceSearchQuery('');
      setInvoiceSearchResults([]);
      setIsInvoiceSearching(false);
      setHighlightedInvoiceIndex(-1);
      setShowInvoiceResults(false);
      setSelectedInvoice(null);
      setLoadedInvoicePayment(null);
      setReturnSelectedIds(new Set());
      setRefSaleId(null);
      clearSelection();
      setPosMode(nextMode);
    },
    [
      clearCart,
      clearResults,
      clearSelection,
      invalidateCache,
      resetPayment,
      setEditId,
      setIsEditing,
    ]
  );

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    if (activePrescription) {
      setPatientSearchQuery(`Patient #${activePrescription.patientId} • Visit #${activePrescription.visitId}`);
    } else if (!patientId && !selectedVisitId) {
      setPatientSearchQuery('');
    }
  }, [activePrescription, patientId, selectedVisitId]);

  // Load transaction for editing if ref is provided
  useEffect(() => {
    const mode = searchParams.get('mode');
    const ref = searchParams.get('ref');

    if (mode === 'edit' && ref) {
      setIsEditing(true);
      setEditId(ref);
      setPosMode('EDIT');

      const fetchTransaction = async () => {
        try {
          const response = await fetch(`/api/transactions/${ref}`);
          const res: ApiResponse<Transaction> = await response.json();
          if (res.success && res.data) {
            loadCart(res.data.items);
            loadPayment(res.data.payment);
            toast.success(`Loaded sale ${res.data.reference || ref} for editing`);
          } else {
            toast.error(res.error || 'Failed to load transaction');
          }
        } catch (error) {
          console.error('Fetch error:', error);
          toast.error('Local network error while loading transaction');
        }
      };

      fetchTransaction();
    }

    if (mode === 'edit_return' && ref) {
      setIsEditing(true);
      setEditId(ref);
      setPosMode('RETURN');

      const fetchReturn = async () => {
        try {
          const response = await fetch(`/api/transactions/return/${ref}`);
          const res: ApiResponse<Transaction> = await response.json();
          if (res.success && res.data) {
            loadCart(res.data.items);
            loadPayment(res.data.payment);
            toast.success(`Loaded return #${ref} for editing`);
          } else {
            toast.error(res.error || 'Failed to load return');
          }
        } catch (error) {
          console.error('Fetch error:', error);
          toast.error('Local network error while loading return');
        }
      };

      fetchReturn();
    }

    if (!mode || !ref) {
      setIsEditing(false);
      setEditId(null);
      setPosMode('SALE');
    }
  }, [searchParams, loadCart, loadPayment]);

  const enterPosFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      await container.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to enter fullscreen mode.';
      toast.error(`Error attempting to enable full-screen mode: ${message}`);
      setIsFullscreen(false);
    }
  }, []);

  const exitPosFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore; we'll still force local state to non-fullscreen.
    } finally {
      setIsFullscreen(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const fullscreenElement = document.fullscreenElement;
    const container = containerRef.current;
    const isPosFullscreen = !!fullscreenElement && !!container && fullscreenElement === container;

    if (isPosFullscreen || isFullscreen) {
      void exitPosFullscreen();
      return;
    }

    void enterPosFullscreen();
  }, [enterPosFullscreen, exitPosFullscreen, isFullscreen]);

  // Listen for fullscreen changes (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      const container = containerRef.current;
      setIsFullscreen(!!fullscreenElement && !!container && fullscreenElement === container);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // If the Fullscreen API fails (permissions, user gesture requirements, etc.), reset local state.
  useEffect(() => {
    const handleFullscreenError = () => {
      setIsFullscreen(false);
      toast.error('Fullscreen failed. Your browser may block fullscreen for this action.');
    };
    document.addEventListener('fullscreenerror', handleFullscreenError);
    return () => document.removeEventListener('fullscreenerror', handleFullscreenError);
  }, []);

  // ESC should always exit POS fullscreen (capture phase so it wins over dropdown/modal ESC handlers).
  useEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      const fullscreenElement = document.fullscreenElement;
      const container = containerRef.current;
      const isPosFullscreen = !!fullscreenElement && !!container && fullscreenElement === container;
      if (!isPosFullscreen && !isFullscreen) return;

      e.preventDefault();
      e.stopPropagation();
      void exitPosFullscreen();
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    return () => window.removeEventListener('keydown', handleKeyDownCapture, true);
  }, [exitPosFullscreen, isFullscreen]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const patientSearchInputRef = useRef<HTMLInputElement>(null);
  const patientResultsRef = useRef<HTMLDivElement>(null);
  const invoiceSearchInputRef = useRef<HTMLInputElement>(null);
  const invoiceResultsRef = useRef<HTMLDivElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const subQtyInputRef = useRef<HTMLInputElement>(null);
  const discInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const checkoutRef = useRef<CheckoutCardHandle>(null);

  // Ordered refs for arrow-key navigation between entry fields
  const fieldRefs = useMemo(
    () => [qtyInputRef, subQtyInputRef, discInputRef, priceInputRef],
    []
  );

  useEffect(() => {
    if (activePrescription) {
      setPatientSearchResults([]);
      setShowPatientResults(false);
      setHighlightedPatientIndex(-1);
      return;
    }

    const query = patientSearchQuery.trim();
    if (query.length < 2) {
      setPatientSearchResults([]);
      setShowPatientResults(false);
      setHighlightedPatientIndex(-1);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsPatientSearching(true);
      try {
        const response = await searchPrescriptionPatients(query);
        if (response.success && response.data) {
          setPatientSearchResults(response.data);
          setShowPatientResults(response.data.length > 0);
          setHighlightedPatientIndex(response.data.length > 0 ? 0 : -1);
        } else {
          setPatientSearchResults([]);
          setShowPatientResults(false);
        }
      } catch (error) {
        console.error(error);
        setPatientSearchResults([]);
        setShowPatientResults(false);
      } finally {
        setIsPatientSearching(false);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [activePrescription, patientSearchQuery]);

  useEffect(() => {
    if (highlightedPatientIndex >= 0 && patientResultsRef.current) {
      const node = patientResultsRef.current.children[highlightedPatientIndex] as HTMLElement | undefined;
      node?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedPatientIndex]);

  useEffect(() => {
    if (posMode !== 'RETURN') {
      setInvoiceSearchResults([]);
      setShowInvoiceResults(false);
      setHighlightedInvoiceIndex(-1);
      setIsInvoiceSearching(false);
      return;
    }

    if (selectedInvoice) {
      setInvoiceSearchResults([]);
      setShowInvoiceResults(false);
      setHighlightedInvoiceIndex(-1);
      setIsInvoiceSearching(false);
      return;
    }

    const query = invoiceSearchQuery.trim();
    if (query.length < 2) {
      setInvoiceSearchResults([]);
      setShowInvoiceResults(false);
      setHighlightedInvoiceIndex(-1);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsInvoiceSearching(true);
      try {
        const response = await searchInvoices(query);
        if (response.success && response.data) {
          setInvoiceSearchResults(response.data);
          setShowInvoiceResults(response.data.length > 0);
          setHighlightedInvoiceIndex(response.data.length > 0 ? 0 : -1);
        } else {
          setInvoiceSearchResults([]);
          setShowInvoiceResults(false);
        }
      } catch (error) {
        console.error(error);
        setInvoiceSearchResults([]);
        setShowInvoiceResults(false);
      } finally {
        setIsInvoiceSearching(false);
      }
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [invoiceSearchQuery, posMode, selectedInvoice]);

  useEffect(() => {
    if (highlightedInvoiceIndex >= 0 && invoiceResultsRef.current) {
      const node = invoiceResultsRef.current.children[highlightedInvoiceIndex] as HTMLElement | undefined;
      node?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedInvoiceIndex]);

  // Navigate between entry fields with Left/Right arrows
  useEffect(() => {
    const handleArrowNav = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const activeEl = document.activeElement;
      const currentIdx = fieldRefs.findIndex(ref => ref.current === activeEl);
      if (currentIdx === -1) return; // Not in an entry field

      e.preventDefault();
      if (e.key === 'ArrowRight' && currentIdx < fieldRefs.length - 1) {
        fieldRefs[currentIdx + 1].current?.focus();
      } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
        fieldRefs[currentIdx - 1].current?.focus();
      } else if (e.key === 'ArrowLeft' && currentIdx === 0) {
        // Jump back to search
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleArrowNav);
    return () => window.removeEventListener('keydown', handleArrowNav);
  }, [fieldRefs]);

  // Handle add item to cart
  const handleAddItem = (medicine: Medicine) => {
    if (activePrescription) {
      toast.error('Prescription cart is locked to prescribed medicines');
      return;
    }

    const { isOutOfStock } = getMedicineAvailability(medicine);
    if (isOutOfStock) {
      toast.error('Medicine out of stock');
      return;
    }

    try {
      // Check if medicine with this batch is already in cart
      const existingInCart = cart.find(item =>
        item.medicine.id === medicine.id &&
        item.batchId === medicine.batch_id
      );

      if (existingInCart) {
        setQuantity(existingInCart.quantity);
        setSubQuantity(existingInCart.subQuantity);
        setDiscountPercent(existingInCart.discountPercent);
        setCustomPrice(existingInCart.customPrice);
        toast(`Editing existing item in cart`);
      } else {
        setQuantity(1);
        setSubQuantity(0);
        setDiscountPercent(0);
        const priceToUse = medicine.batch_sale_price ?? medicine.price;
        setCustomPrice(priceToUse);
      }

      setItemSearched(medicine);
      const expiryDate = medicine.expiry_date
        ? formatDateInTimezone(medicine.expiry_date, systemTimezone, { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';

      const batchInfo = medicine.batch_number ? ` [Lot: ${medicine.batch_number}]` : '';
      setSearchQuery(`${medicine.brand_name} ${medicine.dosage_value}${medicine.dosage_unit}${batchInfo} (Exp: ${expiryDate})`);

      // Focus quantity input for fast entry
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to select item');
    }
  };

  const handleSearch = (query: string) => {
    if (activePrescription) {
      return;
    }
    setSearchQuery(query);
    search(query);
  };

  const loadPrescriptionCart = async (
    nextPatientId: string | number,
    nextVisitId: string | number,
    patientLabel?: string,
    options?: { suppressErrorToast?: boolean }
  ) => {
    try {
      const response = await fetchPrescriptionSale(String(nextPatientId), String(nextVisitId));

      if (!response.success || !response.data) {
        const message = response.error || 'Failed to load prescription';
        if (!options?.suppressErrorToast) {
          toast.error(message);
        }
        return { success: false, error: message };
      }

      const availableCartItems: CartItem[] = response.data.availableItems.map((item) => ({
        id: `rx-${item.prescriptionMedicineId}-${item.medicine.id}`,
        medicine: item.medicine,
        quantity: item.prescribedQuantity,
        subQuantity: 0,
        price: item.medicine.batch_sale_price ?? item.medicine.price,
        discountedPrice: item.medicine.batch_sale_price ?? item.medicine.price,
        discountPercent: 0,
        lineTotal: item.prescribedQuantity * (item.medicine.batch_sale_price ?? item.medicine.price ?? 0),
        prescriptionMedicineId: item.prescriptionMedicineId,
        prescribedQuantity: item.prescribedQuantity,
        alreadyDispensedQuantity: item.alreadyDispensedQuantity,
        fulfillmentMode: 'stock',
        availabilityStatus: item.availabilityStatus,
        availabilityNote: item.availabilityNote,
        availableQuantity: item.availableQuantity,
        isBillable: true,
        isInventoryBacked: true,
      }));

      const unavailableCartItems: CartItem[] = response.data.unavailableItems.map((item) => ({
        id: `unavailable-${item.prescriptionMedicineId}-${item.medicine.id}`,
        medicine: item.medicine,
        quantity: item.prescribedQuantity,
        subQuantity: 0,
        price: 0,
        discountedPrice: 0,
        discountPercent: 0,
        lineTotal: 0,
        prescriptionMedicineId: item.prescriptionMedicineId,
        prescribedQuantity: item.prescribedQuantity,
        alreadyDispensedQuantity: item.alreadyDispensedQuantity,
        fulfillmentMode: 'stock',
        availabilityStatus: item.availabilityStatus,
        availabilityNote: item.availabilityNote,
        availableQuantity: item.availableQuantity,
        isBillable: false,
        isInventoryBacked: false,
      }));

      const nextCart = [...availableCartItems, ...unavailableCartItems];

      loadCart(nextCart);
      resetPayment();
      setActivePrescription(response.data);
      setPatientVisit(String(response.data.patientId), String(response.data.visitId));
      setPatientSearchQuery(patientLabel || `Patient #${response.data.patientId} • Visit #${response.data.visitId}`);
      setPatientSearchResults([]);
      setShowPatientResults(false);
      setHighlightedPatientIndex(-1);
      setVisitOptions([]);
      setVisitPickerPatient(null);
      setVisitPickerError(null);
      setPosMode('SALE');
      setSearchQuery('');
      clearResults();
      setItemSearched(undefined);
      setQuantity(1);
      setSubQuantity(0);
      setDiscountPercent(0);
      setCustomPrice(undefined);
      toast.success(`Loaded ${nextCart.length} prescribed item${nextCart.length === 1 ? '' : 's'} for visit #${response.data.visitId}`);

      const statusResponse = await updateVisitWorkflowStatus(response.data.visitId, 'dispensing');
      if (!statusResponse.success) {
        toast.error(statusResponse.error || 'Failed to move visit into dispensing');
      }

      if (response.data.unavailableItems.length > 0) {
        toast(
          `${response.data.unavailableItems.length} prescription item${response.data.unavailableItems.length === 1 ? '' : 's'} need pharmacist review before billing.`,
          { icon: <TriangleAlert size={16} className="text-warning-foreground" />, duration: 5000 }
        );
      }
      return { success: true };
    } catch (error) {
      console.error(error);
      const message = 'Failed to load prescription';
      if (!options?.suppressErrorToast) {
        toast.error(message);
      }
      return { success: false, error: message };
    }
  };

  const clearPrescriptionLink = React.useCallback(async () => {
    if (activePrescription) {
      const statusResponse = await updateVisitWorkflowStatus(activePrescription.visitId, 'seen_by_doctor');
      if (!statusResponse.success) {
        toast.error(statusResponse.error || 'Failed to restore visit status');
      }
    }

    resetPosSession();
  }, [activePrescription, resetPosSession]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        toast('Search Focused', { duration: 1000 });
      }
      // F2: Complete / Pay
      if (e.key === 'F2') {
        e.preventDefault();
        const payBtn = document.querySelector('[data-pay-button]') as HTMLButtonElement;
        payBtn?.click();
      }
      // F3: Hold
      if (e.key === 'F3') {
        e.preventDefault();
        const holdBtn = document.querySelector('[data-hold-button]') as HTMLButtonElement;
        holdBtn?.click();
      }
      // F4: New Sale / Clear
      if (e.key === 'F4') {
        e.preventDefault();
        if (activePrescription) {
          void clearPrescriptionLink();
        } else {
          resetPosSession();
        }
        toast.success('New Sale Started');
      }
      // F10: Toggle Mode
      if (e.key === 'F10') {
        e.preventDefault();
        if (activePrescription) {
          toast.error('Unload the prescription cart before switching POS mode');
          return;
        }
        setPosMode(prev => prev === 'SALE' ? 'RETURN' : (prev === 'RETURN' ? 'SALE' : 'SALE'));
        toast(`Switched to Mode`);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activePrescription, clearPrescriptionLink, resetPosSession]);

  const handlePatientSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPatientResults || patientSearchResults.length === 0) {
      if (e.key === 'Escape') {
        setShowPatientResults(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedPatientIndex((prev) => (prev < patientSearchResults.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedPatientIndex((prev) => (prev > 0 ? prev - 1 : patientSearchResults.length - 1));
      return;
    }

    if (e.key === 'Enter' && highlightedPatientIndex >= 0) {
      e.preventDefault();
      const patient = patientSearchResults[highlightedPatientIndex];
      if (patient) {
        await handlePatientSelected(patient);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setShowPatientResults(false);
    }
  };

  const clearSelectedInvoice = () => {
    setSelectedInvoice(null);
    setLoadedInvoicePayment(null);
    setRefSaleId(null);
    setInvoiceSearchQuery('');
    setInvoiceSearchResults([]);
    setShowInvoiceResults(false);
    setHighlightedInvoiceIndex(-1);
    setReturnSelectedIds(new Set());
    resetPayment();
    clearCart();
    window.setTimeout(() => invoiceSearchInputRef.current?.focus(), 0);
  };

  const handleInvoiceSelected = async (invoice: InvoiceSummary) => {
    try {
      clearCart();
      resetPayment();
      setPosMode('RETURN');
      setRefSaleId(invoice.id);
      setSelectedInvoice(invoice);
      setInvoiceSearchResults([]);
      setShowInvoiceResults(false);
      setHighlightedInvoiceIndex(-1);

      const label = `Invoice: ${invoice.reference} • ${invoice.patientName ?? 'Walk-in'}`;
      setInvoiceSearchQuery(label);

      const response = await fetch(`/api/transactions/${invoice.id}`);
      const body = await response.json();
      if (!body?.success || !body?.data) {
        toast.error(body?.error || 'Failed to load invoice details');
        setSelectedInvoice(null);
        return;
      }

      setLoadedInvoicePayment(body.data.payment ?? null);
      const invoiceDiscountPercent = Number(body.data.payment?.adjustmentPercent ?? 0);
      if (invoiceDiscountPercent > 0) {
        setAdjustment(invoiceDiscountPercent);
      } else {
        setAdjustment(0);
      }

      const itemsFromApi = (body.data.items || []) as any[];
      const hydratedItems: CartItem[] = itemsFromApi.map((item: any, index: number) => {
        const medicine = item.medicine || {};
        const hydratedMedicine: Medicine = {
          id: Number(medicine.id ?? item.medicine_id ?? 0),
          medicine_id: Number(medicine.medicine_id ?? medicine.id ?? item.medicine_id ?? 0),
          brand_name: String(medicine.brand_name ?? ''),
          generic_name: String(medicine.generic_name ?? ''),
          barcode: String(medicine.barcode ?? ''),
          sku: String(medicine.sku ?? ''),
          price: Number(medicine.price ?? item.price ?? 0),
          stock_quantity: Number(medicine.stock_quantity ?? medicine.total_stock_quantity ?? 0),
          stock_sub_quantity: Number(medicine.stock_sub_quantity ?? medicine.total_stock_sub_quantity ?? 0),
          sub_unit: String(medicine.sub_unit ?? ''),
          sub_units_per_unit: Number(medicine.sub_units_per_unit ?? 1),
          sub_unit_price: Number(medicine.sub_unit_price ?? medicine.batch_sale_sub_unit_price ?? 0),
          allow_sub_unit_sale: Boolean(medicine.allow_sub_unit_sale ?? false),
          category: (medicine.category ?? 'otc') as any,
          requires_prescription: Boolean(medicine.requires_prescription ?? false),
          dosage_value: Number(medicine.dosage_value ?? 0),
          dosage_unit: String(medicine.dosage_unit ?? ''),
          form: String(medicine.form ?? ''),
          batch_id: medicine.batch_id ?? (item.batchId ?? undefined),
          batch_number: medicine.batch_number ?? item.batchNumber ?? undefined,
          batch_code: medicine.batch_code ?? item.batchCode ?? undefined,
          batch_sale_price: medicine.batch_sale_price ?? undefined,
          batch_sale_sub_unit_price: medicine.batch_sale_sub_unit_price ?? undefined,
          expiry_date: medicine.expiry_date ?? undefined,
        };

        return {
          ...item,
          id: String(item.id ?? `${hydratedMedicine.id}-${Date.now()}-${index}`),
          medicine: hydratedMedicine,
          quantity: Number(item.quantity ?? 0),
          subQuantity: Number(item.subQuantity ?? 0),
          price: Number(item.price ?? 0),
          discountedPrice: Number(item.discountedPrice ?? item.price ?? 0),
          discountPercent: Number(item.discountPercent ?? 0),
          lineTotal: Number(item.lineTotal ?? 0),
          batchId: item.batchId ?? hydratedMedicine.batch_id ?? undefined,
          batchNumber: item.batchNumber ?? hydratedMedicine.batch_number ?? undefined,
          batchCode: item.batchCode ?? hydratedMedicine.batch_code ?? undefined,
        };
      });

      if (hydratedItems.length > 0) {
        loadCart(hydratedItems);
        setReturnSelectedIds(new Set(hydratedItems.map((i) => i.id)));
        toast.success(`Loaded ${hydratedItems.length} item(s) from ${invoice.reference}`);
      } else {
        toast.error('Selected invoice has no items');
        setSelectedInvoice(null);
      }
    } catch (error) {
      console.error(error);
      toast.error(`Failed to load invoice items: ${String(error)}`);
      setSelectedInvoice(null);
    }
  };

  const handleInvoiceSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (selectedInvoice) {
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelectedInvoice();
      }
      return;
    }

    if (!showInvoiceResults || invoiceSearchResults.length === 0) {
      if (e.key === 'Escape') {
        setShowInvoiceResults(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedInvoiceIndex((prev) => (prev < invoiceSearchResults.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedInvoiceIndex((prev) => (prev > 0 ? prev - 1 : invoiceSearchResults.length - 1));
      return;
    }

    if (e.key === 'Enter' && highlightedInvoiceIndex >= 0) {
      e.preventDefault();
      const invoice = invoiceSearchResults[highlightedInvoiceIndex];
      if (invoice) {
        await handleInvoiceSelected(invoice);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setShowInvoiceResults(false);
    }
  };

  const isReturnSelectionActive = posMode === 'RETURN' && !!selectedInvoice;

  const toggleReturnInclude = useCallback((itemId: string) => {
    setReturnSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const selectAllReturnItems = useCallback(() => {
    setReturnSelectedIds(new Set(cart.map((i) => i.id)));
  }, [cart]);

  const unselectAllReturnItems = useCallback(() => {
    setReturnSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (!isReturnSelectionActive) return;
    const liveIds = new Set(cart.map((i) => i.id));
    setReturnSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (liveIds.has(id)) next.add(id);
      }
      // If no selection exists yet (e.g., invoice loaded before state), default to all.
      if (next.size === 0 && cart.length > 0) {
        return new Set(cart.map((i) => i.id));
      }
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [cart, isReturnSelectionActive]);

  const handlePatientSelected = async (patient: PatientSearchResult) => {
    const visitsResponse = await fetchActiveVisits(String(patient.patient_id));

    if (!visitsResponse.success || !visitsResponse.data) {
      toast.error(visitsResponse.error || 'Failed to load active visits');
      return;
    }

    if (visitsResponse.data.length === 0) {
      toast.error('No active visit found for the selected patient');
      return;
    }

    const prescriptionReadyVisits = visitsResponse.data.filter((visit) => Boolean(visit.has_pending_prescription));
    const candidateVisits = prescriptionReadyVisits.length > 0 ? prescriptionReadyVisits : visitsResponse.data;

    if (candidateVisits.length === 1) {
      await loadPrescriptionCart(patient.patient_id, candidateVisits[0].visit_id, patient.patient_name);
      return;
    }

    setVisitPickerPatient(patient);
    setVisitOptions(candidateVisits);
    setVisitPickerError(null);
    setShowPatientResults(false);
  };

  const handleVisitOptionSelected = async (visit: ActiveVisitOption) => {
    const label = visitPickerPatient?.patient_name || `Patient #${visit.patient_id}`;
    setVisitPickerError(null);
    setLoadingVisitId(visit.visit_id);
    const result = await loadPrescriptionCart(visit.patient_id, visit.visit_id, label, {
      suppressErrorToast: true,
    });
    setLoadingVisitId(null);

    if (!result?.success) {
      setVisitPickerError(result?.error || 'Prescription is not available for this visit.');
    }
  };

  const openOverrideModal = (item: CartItem) => {
    setOverrideTargetItem(item);
    setOverrideReasonCode('purchased_from_other_store');
    setOverrideReasonNote(item.overrideReasonNote || '');
    setOverrideQuantity(item.quantity || item.prescribedQuantity || 1);
    setOverridePrice(item.price || item.medicine.price || 0);
    setOverrideError(null);
  };

  const applyOverrideSelection = () => {
    if (!overrideTargetItem) {
      return;
    }

    if (!overrideQuantity || overrideQuantity <= 0) {
      setOverrideError('Override quantity must be greater than 0.');
      return;
    }

    const availableQuantity = Number(overrideTargetItem.availableQuantity ?? 0);
    const canFulfillFromStock = availableQuantity > 0 && overrideQuantity <= availableQuantity;

    if (canFulfillFromStock) {
      const stockUnitPrice = Number(
        overrideTargetItem.medicine.batch_sale_price
          ?? overrideTargetItem.medicine.price
          ?? overridePrice
          ?? 0
      );

      if (!stockUnitPrice || stockUnitPrice <= 0) {
        setOverrideError('Valid sale price is required to include this line from stock.');
        return;
      }

      updateItem(overrideTargetItem.id, {
        quantity: overrideQuantity,
        subQuantity: 0,
        price: stockUnitPrice,
        discountedPrice: stockUnitPrice,
        discountPercent: 0,
        lineTotal: overrideQuantity * stockUnitPrice,
        fulfillmentMode: 'stock',
        availabilityStatus: availableQuantity - overrideQuantity > 0 ? 'low_stock' : 'fulfilled',
        overrideReasonCode: null,
        overrideReasonNote: null,
        isBillable: true,
        isInventoryBacked: true,
      });

      setOverrideTargetItem(null);
      setOverrideReasonNote('');
      setOverrideError(null);
      toast.success('Included from stock. Inventory will be deducted on process sale.');
      return;
    }

    if (!overrideReasonNote.trim()) {
      setOverrideError('Reason note is required.');
      return;
    }

    if (!overridePrice || overridePrice <= 0) {
      setOverrideError('Override sale price must be greater than 0.');
      return;
    }

    updateItem(overrideTargetItem.id, {
      quantity: overrideQuantity,
      subQuantity: 0,
      price: overridePrice,
      discountedPrice: overridePrice,
      discountPercent: 0,
      lineTotal: overrideQuantity * overridePrice,
      fulfillmentMode: 'override',
      availabilityStatus: 'override_selected',
      overrideReasonCode,
      overrideReasonNote: overrideReasonNote.trim(),
      isBillable: true,
      isInventoryBacked: false,
    });

    setOverrideTargetItem(null);
    setOverrideReasonNote('');
    setOverrideError(null);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      checkoutRef.current?.focusAmountReceived();
      toast('Payment Panel Focused', { duration: 1000 });
    }
  };

  const handleEditItem = useCallback((itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    setItemSearched(item.medicine);
    setQuantity(item.quantity);
    setSubQuantity(item.subQuantity);
    setDiscountPercent(item.discountPercent);
    setCustomPrice(item.customPrice);
    setEditingItemId(item.id);
    setIsEditing(true);

    // Focus first input
    qtyInputRef.current?.focus();

    toast.success(`Editing ${item.medicine.brand_name}`);
  }, [cart]);

  const handleSearchSelected = () => {
    if (activePrescription) {
      toast.error('Prescription cart is locked to prescribed medicines');
      return;
    }

    if (!itemSearched) return;
    const validation = validateRequestedStock(itemSearched, quantity, subQuantity);
    if (!validation.valid) {
      toast.error(validation.message || 'Invalid quantity');
      return;
    }

    try {
      if (editingItemId) {
        updateItem(editingItemId, {
          quantity,
          subQuantity,
          discountPercent,
          customPrice
        });
        toast.success('Item updated');
      } else {
        addItem(itemSearched, quantity, subQuantity, discountPercent, customPrice);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item');
      return;
    }

    // Reset all fields for the next entry
    setSearchQuery('');
    setItemSearched(undefined);
    clearResults();
    setQuantity(1);
    setSubQuantity(0);
    setDiscountPercent(0);
    setCustomPrice(undefined);
    setEditingItemId(null);
    if (posMode !== 'EDIT' && posMode !== 'RETURN') {
      setIsEditing(false);
    }

    // Refocus search for next item
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleLoadTransaction = (tx: Transaction) => {
    loadCart(tx.items);
    loadPayment(tx.payment);
    setResumedHoldId(tx.status === 'held' ? tx.id : null);
    setResumedHoldMeta(tx.status === 'held'
      ? {
          visitId: tx.visitId ?? null,
          billId: tx.billId ?? null,
          prescriptionId: tx.prescriptionId ?? null,
          patientId: tx.patientId ?? null,
          customerId: tx.customerId,
          customerName: tx.customer?.name,
        }
      : null);

    if (tx.customerId) {
      setPatientVisit(String(tx.customerId), tx.visitId ? String(tx.visitId) : null);
      setPatientSearchQuery(
        tx.customer?.name
          || (tx.visitId ? `Patient #${tx.customerId} • Visit #${tx.visitId}` : `Patient #${tx.customerId}`)
      );
    }

    if (tx.prescriptionId) {
      // If it's a prescription sale, we might want to reload the prescription state
      // but for now, loading the items is enough to resume the UI
    }

    setPosMode(tx.mode || 'SALE');
    toast.success(`Resumed transaction ${tx.reference}`);
  };

  const selectedMedicineStock = itemSearched ? getMedicineAvailability(itemSearched).available : null;

  const fallbackPatientId = activePrescription?.patientId
    ?? selectedInvoice?.patientId
    ?? resumedHoldMeta?.patientId
    ?? (patientId ? Number(patientId) : null);
  const fallbackVisitId = activePrescription?.visitId
    ?? selectedInvoice?.visitId
    ?? resumedHoldMeta?.visitId
    ?? (selectedVisitId ? Number(selectedVisitId) : null);
  const fallbackCustomerName = resumedHoldMeta?.customerName
    ?? selectedInvoice?.patientName
    ?? parsePatientSearchLabel(patientSearchQuery);

  const flashQtyLimit = useCallback(() => {
    setQtyLimitFlash(true);
    if (qtyFlashTimeoutRef.current) {
      window.clearTimeout(qtyFlashTimeoutRef.current);
    }
    qtyFlashTimeoutRef.current = window.setTimeout(() => setQtyLimitFlash(false), 650);
  }, []);

  const flashSubQtyLimit = useCallback(() => {
    setSubQtyLimitFlash(true);
    if (subQtyFlashTimeoutRef.current) {
      window.clearTimeout(subQtyFlashTimeoutRef.current);
    }
    subQtyFlashTimeoutRef.current = window.setTimeout(() => setSubQtyLimitFlash(false), 650);
  }, []);

  useEffect(() => {
    return () => {
      if (qtyFlashTimeoutRef.current) window.clearTimeout(qtyFlashTimeoutRef.current);
      if (subQtyFlashTimeoutRef.current) window.clearTimeout(subQtyFlashTimeoutRef.current);
    };
  }, []);

  const { maxQtyByStock, maxSubQtyByStock, perUnit } = useMemo(() => {
    if (!itemSearched || !selectedMedicineStock) {
      return { maxQtyByStock: 9999, maxSubQtyByStock: 99, perUnit: 1 };
    }

    const normalizedPerUnit = Math.max(1, Number(itemSearched.sub_units_per_unit || 1));
    const availableTotal = Math.max(0, Number(selectedMedicineStock.totalSubUnits || 0));
    const cappedSub = normalizedPerUnit > 1
      ? Math.max(0, Math.min(Number(subQuantity || 0), normalizedPerUnit - 1))
      : 0;

    const maxQty = Math.max(0, Math.floor((availableTotal - cappedSub) / normalizedPerUnit));
    const remainingAfterQty = Math.max(0, availableTotal - (Math.max(0, Number(quantity || 0)) * normalizedPerUnit));
    const maxSubByStock = normalizedPerUnit > 1
      ? Math.min(normalizedPerUnit - 1, remainingAfterQty)
      : 0;

    return { maxQtyByStock: Math.min(9999, maxQty), maxSubQtyByStock: Math.min(99, maxSubByStock), perUnit: normalizedPerUnit };
  }, [itemSearched, selectedMedicineStock, quantity, subQuantity]);

  const handleQuantityChange = useCallback((nextValue: number) => {
    if (!itemSearched || !selectedMedicineStock) {
      setQuantity(nextValue);
      return;
    }

    const availableTotal = Math.max(0, Number(selectedMedicineStock.totalSubUnits || 0));
    const cappedSub = perUnit > 1 ? Math.max(0, Math.min(Number(subQuantity || 0), perUnit - 1)) : 0;
    const computedMaxQty = Math.max(0, Math.floor((availableTotal - cappedSub) / perUnit));
    const clampedQty = Math.max(0, Math.min(Number(nextValue || 0), computedMaxQty));
    if (clampedQty !== nextValue) {
      flashQtyLimit();
    }
    setQuantity(clampedQty);

    const remainingAfterQty = Math.max(0, availableTotal - (clampedQty * perUnit));
    const computedMaxSub = perUnit > 1 ? Math.min(perUnit - 1, remainingAfterQty) : 0;
    if (subQuantity > computedMaxSub) {
      setSubQuantity(computedMaxSub);
      flashSubQtyLimit();
    }
  }, [flashQtyLimit, flashSubQtyLimit, itemSearched, perUnit, selectedMedicineStock, subQuantity]);

  const handleSubQuantityChange = useCallback((nextValue: number) => {
    if (!itemSearched || !selectedMedicineStock) {
      setSubQuantity(nextValue);
      return;
    }

    const availableTotal = Math.max(0, Number(selectedMedicineStock.totalSubUnits || 0));
    const computedMaxSub = perUnit > 1
      ? Math.min(perUnit - 1, Math.max(0, availableTotal - (Math.max(0, Number(quantity || 0)) * perUnit)))
      : 0;
    const clampedSub = Math.max(0, Math.min(Number(nextValue || 0), computedMaxSub));
    if (clampedSub !== nextValue) {
      flashSubQtyLimit();
    }
    setSubQuantity(clampedSub);

    const computedMaxQty = Math.max(0, Math.floor((availableTotal - clampedSub) / perUnit));
    if (quantity > computedMaxQty) {
      setQuantity(computedMaxQty);
      flashQtyLimit();
    }
  }, [flashQtyLimit, flashSubQtyLimit, itemSearched, perUnit, quantity, selectedMedicineStock]);

  useEffect(() => {
    if (!itemSearched || !selectedMedicineStock) return;

    const availableTotal = Math.max(0, Number(selectedMedicineStock.totalSubUnits || 0));
    const cappedSub = perUnit > 1 ? Math.max(0, Math.min(Number(subQuantity || 0), perUnit - 1)) : 0;
    const maxQty = Math.max(0, Math.floor((availableTotal - cappedSub) / perUnit));
    const clampedQty = Math.max(0, Math.min(Number(quantity || 0), maxQty));
    const remainingAfterQty = Math.max(0, availableTotal - (clampedQty * perUnit));
    const maxSub = perUnit > 1 ? Math.min(perUnit - 1, remainingAfterQty) : 0;
    const clampedSub = Math.max(0, Math.min(cappedSub, maxSub));

    if (clampedQty !== quantity) setQuantity(clampedQty);
    if (clampedSub !== subQuantity) setSubQuantity(clampedSub);
  }, [itemSearched, perUnit, quantity, selectedMedicineStock, subQuantity]);

  return (
    <div
      ref={containerRef}
      className={`flex min-h-screen bg-slate-50 font-sans gap-6 p-6 flex-col xl:flex-row backdrop-blur-sm ${isFullscreen ? 'bg-white p-6 gap-4 overflow-hidden h-[100dvh] w-[100dvw] fixed inset-0 z-[9999]' : ''}`}
    >
      {/* When using the browser Fullscreen API, only the fullscreen element subtree is visible.
          Render a Toaster inside this component so toast messages are visible in fullscreen. */}
      {isFullscreen ? (
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 2147483647 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(255, 255, 255, 0.95)",
              color: "#0f172a",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              boxShadow: "0 18px 45px rgba(2, 6, 23, 0.14)",
              borderRadius: "16px",
              padding: "12px 12px",
              backdropFilter: "blur(14px)",
              maxWidth: "420px",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#ecfdf5",
              },
            },
            error: {
              duration: 6000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fef2f2",
              },
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div className="flex items-center gap-3">
                  <div className="shrink-0">{icon}</div>
                  <div className="min-w-0 flex-1 text-sm font-semibold">
                    {message}
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => toast.dismiss(t.id)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
      ) : null}
      {/* Main Content Area: Entry and Cart stacked vertically */}
      <div className="flex flex-col gap-6 flex-1 min-w-0">
        {/* 1. Medicine Entry (Top) - Higher z-index for search dropdown */}
        <div className={`flex flex-col gap-4 bg-white/80 backdrop-blur-2xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border transition-all duration-500 relative z-20 ${posMode === 'SALE' ? 'border-white/60' : 'border-rose-200/60 shadow-rose-500/5'
          }`}>
          <div className={`flex flex-col gap-4 xl:flex-row xl:justify-between ${posMode === 'RETURN' && selectedInvoice ? 'xl:items-start' : 'xl:items-center'}`}>
            <div className="flex items-center gap-3 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                  <Layout size={18} />
                </div>
                                {posMode === 'SALE' ? 'Medicine Entry' : 'Return Entry'}
              </h2>
            </div>

            {posMode === 'SALE' ? (
              <div className="relative w-full xl:ml-auto xl:w-[520px] xl:flex-none">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search size={18} />
                </span>
                <input
                  ref={patientSearchInputRef}
                  type="text"
                  value={patientSearchQuery}
                  onChange={(event) => {
                    if (activePrescription) {
                      return;
                    }
                    setPatientSearchQuery(event.target.value);
                  }}
                  onKeyDown={handlePatientSearchKeyDown}
                  onFocus={() => {
                    if (!activePrescription && patientSearchResults.length > 0) {
                      setShowPatientResults(true);
                    }
                  }}
                  onBlur={() => window.setTimeout(() => setShowPatientResults(false), 150)}
                  placeholder={
                    activePrescription
                      ? `Loaded Patient #${activePrescription.patientId} • Visit #${activePrescription.visitId}`
                      : 'Search patient by name, CNIC, patient ID, or visit ID'
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-14 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10"
                />
                {isPatientSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                )}

                {showPatientResults && patientSearchResults.length > 0 && (
                  <div
                    ref={patientResultsRef}
                    className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl"
                  >
                    {patientSearchResults.map((patient, index) => (
                      <button
                        key={patient.patient_id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void handlePatientSelected(patient);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${highlightedPatientIndex === index ? 'bg-emerald-50' : 'hover:bg-slate-50'
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">{patient.patient_name}</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            CNIC: {patient.cnic || 'N/A'} • ID: {patient.patient_id} • {patient.active_visit_count} active visit{patient.active_visit_count === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                          Select
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : posMode === 'RETURN' ? (
              <div className="flex flex-col gap-2 w-full xl:ml-auto xl:w-[520px] xl:flex-none">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    ref={invoiceSearchInputRef}
                    type="text"
                    value={invoiceSearchQuery}
                    readOnly={!!selectedInvoice}
                    onChange={(event) => {
                      if (selectedInvoice) return;
                      setInvoiceSearchQuery(event.target.value);
                    }}
                    onKeyDown={handleInvoiceSearchKeyDown}
                    onFocus={() => {
                      if (!selectedInvoice && invoiceSearchResults.length > 0) {
                        setShowInvoiceResults(true);
                      }
                    }}
                    onBlur={() => window.setTimeout(() => setShowInvoiceResults(false), 150)}
                    placeholder={selectedInvoice ? 'Invoice loaded' : 'Search invoice # or patient name'}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                  />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isInvoiceSearching && !selectedInvoice ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    ) : null}

                    {selectedInvoice ? (
                      <button
                        type="button"
                        onClick={clearSelectedInvoice}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                        title="Clear invoice"
                        aria-label="Clear invoice"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>

                  {showInvoiceResults && invoiceSearchResults.length > 0 && (
                    <div
                      ref={invoiceResultsRef}
                      className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl"
                    >
                      {invoiceSearchResults.map((invoice, index) => (
                        <button
                          key={invoice.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            void handleInvoiceSelected(invoice);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${highlightedInvoiceIndex === index ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900">{invoice.reference}</div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {invoice.patientName ?? 'Walk-in'} • {formatDateTimeInTimezone(invoice.timestamp, systemTimezone)} • {invoice.itemsCount} item{invoice.itemsCount === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Total</div>
                            <div className="mt-0.5 text-sm font-black text-indigo-700">{formatCurrency(invoice.totalAmount)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedInvoice && loadedInvoicePayment ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${invoiceChipBaseClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>
                      Items Disc: {formatCurrency(Number(loadedInvoicePayment.itemsDiscount ?? 0))}
                    </span>
                    <span className={`${invoiceChipBaseClass} border-indigo-200 bg-indigo-50 text-indigo-700`}>
                      Bill Disc: {Number(loadedInvoicePayment.adjustmentPercent ?? 0)}% ({formatCurrency(Number(loadedInvoicePayment.adjustment ?? 0))})
                    </span>
                    <span className={`${invoiceChipBaseClass} border-slate-200 bg-white text-slate-700`}>
                      Net Paid: {formatCurrency(Number(loadedInvoicePayment.payableAmount ?? 0))}
                    </span>
                    <span className={`${invoiceChipBaseClass} border-slate-200 bg-white text-slate-600`}>
                      Selected: {selectedReturnCart.length}/{cart.length}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3 shrink-0">
              {activePrescription && (
                <button
                  type="button"
                  onClick={() => {
                    void clearPrescriptionLink();
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <Link2Off size={15} />
                  Unload Rx
                </button>
              )}

              {/* Return mode invoice search is inline (no modal). */}
              <div
                onClick={() => {
                  if (activePrescription) {
                    toast.error('Unload the prescription cart before switching POS mode');
                    return;
                  }
                  const nextMode = posMode === 'SALE' ? 'RETURN' : 'SALE';
                  if (posSettings.clearSessionOnModeSwitch) {
                    clearPosSessionForModeSwitch(nextMode);
                    return;
                  }
                  setPosMode(nextMode);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all duration-300 ${posMode === 'SALE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
              >
                {posMode === 'SALE' ? <ShoppingCart size={16} /> : <RotateCcw size={16} />}
                <span className="text-xs font-black uppercase tracking-widest">
                  {posMode === 'SALE' ? 'Sale Mode' : 'Return Mode'}
                </span>
                <span className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded font-mono">F10</span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 bg-slate-100/80 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all border border-slate-200/50"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>

          {activePrescription && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-bold text-emerald-700">
                Rx #{activePrescription.prescriptionId}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold">
                Visit #{activePrescription.visitId}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold">
                {activePrescription.availableItems.length + activePrescription.unavailableItems.length} pending item{activePrescription.availableItems.length + activePrescription.unavailableItems.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Search Bar - Full Width */}
          <MedicineSearch
            inputRef={searchInputRef}
            query={searchQuery}
            results={results}
            isSearching={isSearching}
            onSearch={handleSearch}
            onSelect={handleAddItem}
            onKeyDown={handleSearchKeyDown}
            placeholder={activePrescription ? "Prescription cart loaded. Search disabled." : "Search Medicine (F1)"}
          />

          {/* Fields Row - All in one horizontal line */}
          <div className={`flex flex-wrap lg:flex-nowrap items-end gap-3 p-4 rounded-2xl border transition-all duration-500 ${itemSearched
            ? (posMode === 'SALE' ? 'bg-indigo-50/30 border-indigo-100' : 'bg-rose-50/30 border-rose-100')
            : 'bg-slate-50/50 border-slate-100 border-dashed opacity-60'
            }`}>
            <div className="w-28 shrink-0">
              <QuantityInput
                ref={qtyInputRef}
                value={quantity}
                onChange={handleQuantityChange}
                label="Qty"
                min={0}
                max={maxQtyByStock}
                available={selectedMedicineStock?.units}
                onEnter={handleSearchSelected}
                limitFlash={qtyLimitFlash}
                onLimitHit={flashQtyLimit}
                testId="qty"
              />
            </div>
            <div className="w-40 shrink-0">
              <SubQuantityInput
                ref={subQtyInputRef}
                value={subQuantity}
                onChange={handleSubQuantityChange}
                label="Sub-Qty"
                perUnit={itemSearched?.sub_units_per_unit}
                max={maxSubQtyByStock}
                available={selectedMedicineStock?.totalSubUnits}
                onEnter={handleSearchSelected}
                limitFlash={subQtyLimitFlash}
                onLimitHit={flashSubQtyLimit}
                testId="subqty"
              />
            </div>
            <div className="w-36 shrink-0">
              <DiscountInput ref={discInputRef} value={discountPercent} onChange={setDiscountPercent} label="Disc %" onEnter={handleSearchSelected} />
            </div>
            <div className="w-28 shrink-0">
              <CustomPriceInput
                ref={priceInputRef}
                value={customPrice}
                onChange={setCustomPrice}
                label="Price"
                readOnly
                onEnter={handleSearchSelected}
              />
            </div>

            {/* Matched Medicine Info */}
            {itemSearched && (
              <div className="flex-1 min-w-[160px] p-2 bg-white rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Match</p>
                  <p className="text-sm font-bold text-indigo-600 truncate">{itemSearched.brand_name}</p>
                </div>
                {itemSearched.batch_number && (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                      LOT: {itemSearched.batch_number}
                    </span>
                    {itemSearched.batch_code ? (
                      <span className="mt-1 text-[9px] font-mono text-slate-400">
                        Ref: {itemSearched.batch_code}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Add Button */}
            <div className="shrink-0">
              <AddProductButton
                handleSearchSelected={handleSearchSelected}
                isEditing={Boolean(editingItemId)}
              />
            </div>
          </div>
        </div>

        {/* 2. Active Billing Cart (Bottom) */}
        <div className="flex flex-col flex-1 bg-card rounded-lg px-6 py-5 shadow-sm border border-border overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary text-primary-foreground rounded-md">
                <ShoppingCart size={18} />
              </div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Active Billing Cart</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-[11px] font-semibold uppercase tracking-wide">
                {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <CartTable
              items={cart}
              selectedItem={selectedItem}
              onSelectItem={selectItem}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onEditItem={handleEditItem}
              prescriptionMode={Boolean(activePrescription)}
              onResolveUnavailable={openOverrideModal}
              returnMode={isReturnSelectionActive}
              includedItemIds={returnSelectedIds}
              onToggleInclude={toggleReturnInclude}
              onSelectAll={selectAllReturnItems}
              onUnselectAll={unselectAllReturnItems}
            />
          </div>
        </div>
      </div>

      {/* 3. Right Column: Checkout Panel */}
      <div className={`flex flex-col w-full xl:w-[420px] min-h-0 ${isFullscreen ? 'gap-4' : 'gap-6'}`}>
        <div className={`bg-card text-card-foreground rounded-lg shadow-sm border border-border flex flex-col h-full relative overflow-hidden ${isFullscreen ? 'p-5' : 'p-6'}`}>
          <h2 className={`text-lg font-semibold text-foreground flex items-center gap-2.5 ${isFullscreen ? 'mb-4' : 'mb-6'}`}>
            <span className="w-1 h-6 bg-primary rounded-full" aria-hidden></span>
            {posMode === 'RETURN' ? 'Finalize Return' : 'Finalize Sale'}
          </h2>

          <div className="flex-1">
            <CheckoutCard
              ref={checkoutRef}
              cart={selectedReturnCart}
              payment={payment}
              onClear={activePrescription ? clearPrescriptionLink : resetPosSession}
              mode={posMode}
              isEditing={isEditing}
              editId={editId}
              onLoadTransaction={handleLoadTransaction}
              density={isFullscreen ? 'compact' : 'comfortable'}
              transactionMeta={{
                visitId: fallbackVisitId,
                billId: activePrescription?.billId ?? resumedHoldMeta?.billId ?? null,
                prescriptionId: activePrescription?.prescriptionId ?? resumedHoldMeta?.prescriptionId ?? null,
                patientId: fallbackPatientId,
                customerId: resumedHoldMeta?.customerId ?? (fallbackPatientId ?? undefined) ?? undefined,
                customerName: fallbackCustomerName,
                holdId: resumedHoldId,
                refSaleId: refSaleId,
              }}
              onComplete={resetPosSession}
              onPaymentTypeChange={setPaymentType}
              onPaidAmountChange={setPaidAmount}
              onAdjustmentChange={setAdjustment}
              onBackToSearch={() => searchInputRef.current?.focus()}
            />
          </div>
        </div>
      </div>

      {isPortalReady && overrideTargetItem && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  <TriangleAlert size={14} />
                  Override Unavailable Medicine
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {overrideTargetItem.medicine.brand_name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  This medicine is not currently available from store stock. Add a reason before including it in the billed transaction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOverrideTargetItem(null);
                  setOverrideError(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-bold text-slate-900">Prescribed Qty</div>
                <div className="mt-1">{overrideTargetItem.prescribedQuantity ?? overrideTargetItem.quantity}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-bold text-slate-900">Available In Store</div>
                <div className="mt-1">{overrideTargetItem.availableQuantity ?? 0}</div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Reason
                </label>
                <select
                  value={overrideReasonCode}
                  onChange={(event) => setOverrideReasonCode(event.target.value as OverrideReasonCode)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10"
                >
                  {OVERRIDE_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Billable Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={overrideQuantity}
                    onChange={(event) => setOverrideQuantity(Number(event.target.value || 0))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={overridePrice}
                    onChange={(event) => setOverridePrice(Number(event.target.value || 0))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Pharmacist Note
                </label>
                <textarea
                  value={overrideReasonNote}
                  onChange={(event) => setOverrideReasonNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10"
                  placeholder="Explain why this unavailable medicine is still being billed."
                />
              </div>

              {overrideError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {overrideError}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOverrideTargetItem(null);
                  setOverrideError(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyOverrideSelection}
                className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(217,119,6,0.22)] transition hover:bg-amber-700"
              >
                Include In Transaction
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isPortalReady && visitPickerPatient && visitOptions.length > 1 && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  <UserRound size={14} />
                  Choose Active Visit
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {visitPickerPatient.patient_name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Multiple prescription-ready visits were found. Select the visit whose prescription should be dispensed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVisitPickerPatient(null);
                  setVisitOptions([]);
                  setVisitPickerError(null);
                  setLoadingVisitId(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {visitPickerError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {visitPickerError}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {visitOptions.map((visit) => (
                <button
                  key={visit.visit_id}
                  type="button"
                  onClick={() => {
                    void handleVisitOptionSelected(visit);
                  }}
                  disabled={loadingVisitId === visit.visit_id}
                  className="flex w-full items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Visit #{visit.visit_id}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        {visit.visit_type}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {visit.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-slate-900">
                      Dr. {visit.doctor_name} • Clinic #{visit.clinic_number ?? '-'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTimeInTimezone(visit.visit_timestamp, systemTimezone)}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                    {loadingVisitId === visit.visit_id ? 'Loading...' : 'Load Rx'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PharmacyPOS;
