

export type LabOrder = {
  visit_id: string | number;
  visit_timestamp?: string;
  order_id: number;
  test_name: string;
  category: string;
  price: number;
  status: string;
  ordered_by: string;
  performed_by: string | null;
  order_date: string;
};
