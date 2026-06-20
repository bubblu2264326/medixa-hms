# Views

## admin_cash_collected_ledger_v1

```sql
 SELECT txn.created_at AS collected_at,
        CASE
            WHEN (txn.txn_type = 'payment'::text) THEN txn.amount
            WHEN (txn.txn_type = 'reversal'::text) THEN (- abs(txn.amount))
            ELSE (0)::numeric
        END AS amount,
    'cashier'::text AS source,
    concat('cashier_payment_txn:', txn.cashier_payment_txn_id) AS entity_ref
   FROM cashier_payment_txn txn
  WHERE (txn.txn_type = ANY (ARRAY['payment'::text, 'reversal'::text]))
UNION ALL
 SELECT sale.sale_timestamp AS collected_at,
    (sale.total_amount)::numeric AS amount,
    'pharmacy'::text AS source,
    concat('pharmacy_sale:', sale.sale_id) AS entity_ref
   FROM pharmacy_sale sale
  WHERE ((sale.settlement_channel = 'pharmacy'::text) AND (sale.settlement_status = 'settled'::text));
```

## v_daily_sales_summary

```sql
 SELECT date(sale_timestamp) AS sale_date,
    count(sale_id) AS total_transactions,
    sum(total_amount) AS total_sales,
    sum(discount_amount) AS total_discounts,
    sum(
        CASE
            WHEN ((payment_type)::text = 'CASH'::text) THEN total_amount
            ELSE (0)::numeric
        END) AS cash_sales,
    sum(
        CASE
            WHEN ((payment_type)::text = 'CARD'::text) THEN total_amount
            ELSE (0)::numeric
        END) AS card_sales,
    sum(
        CASE
            WHEN is_prescription_sale THEN total_amount
            ELSE (0)::numeric
        END) AS prescription_sales,
    sum(
        CASE
            WHEN (is_prescription_sale = false) THEN total_amount
            ELSE (0)::numeric
        END) AS otc_sales
   FROM pharmacy_sale ps
  WHERE ((status)::text = 'Completed'::text)
  GROUP BY (date(sale_timestamp))
  ORDER BY (date(sale_timestamp)) DESC;
```

## v_ip_running_bill

```sql
 SELECT admission_id,
    admission_no,
    patient_id,
    status,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM ip_charge c
          WHERE (c.admission_id = a.admission_id)), (0)::numeric) AS total_charges,
    COALESCE(( SELECT sum(v.amount) AS sum
           FROM ip_advance v
          WHERE (v.admission_id = a.admission_id)), (0)::numeric) AS total_advances,
    (COALESCE(( SELECT sum(c.amount) AS sum
           FROM ip_charge c
          WHERE (c.admission_id = a.admission_id)), (0)::numeric) - COALESCE(( SELECT sum(v.amount) AS sum
           FROM ip_advance v
          WHERE (v.admission_id = a.admission_id)), (0)::numeric)) AS balance_due
   FROM admission a;
```

## v_low_stock_medicines

```sql
 WITH aggregate_stock AS (
         SELECT mb.medicine_id,
            sum(((mb.stock_quantity * COALESCE(( SELECT m_1.sub_units_per_unit
                   FROM medicine m_1
                  WHERE (m_1.medicine_id = mb.medicine_id)), 1)) + COALESCE(mb.stock_sub_quantity, 0))) AS total_sub_units
           FROM medicine_batch mb
          WHERE ((mb.expiry_date > CURRENT_DATE) OR (mb.expiry_date IS NULL))
          GROUP BY mb.medicine_id
        )
 SELECT m.medicine_id,
    m.brand_name,
    m.generic_name,
    m.category,
    m.min_stock_level,
    get_stock_display(m.medicine_id) AS stock_display
   FROM (medicine m
     LEFT JOIN aggregate_stock ast ON ((m.medicine_id = ast.medicine_id)))
  WHERE ((m.is_active = true) AND (COALESCE(ast.total_sub_units, (0)::bigint) <= ((m.min_stock_level * COALESCE(m.sub_units_per_unit, 1)))::bigint))
  ORDER BY COALESCE(ast.total_sub_units, (0)::bigint);
```

## v_medicine_pos

```sql
 SELECT m.medicine_id AS id,
    m.generic_name,
    m.brand_name,
    m.category,
    (m.dosage_value)::double precision AS dosage_value,
    m.dosage_unit,
    m.form,
    (COALESCE(mb.sale_price, mb.purchase_price))::double precision AS price,
    ((sum(((COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(mb.stock_sub_quantity, 0))) OVER (PARTITION BY m.medicine_id) / COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)))::integer AS total_stock_quantity,
    ((sum(((COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(mb.stock_sub_quantity, 0))) OVER (PARTITION BY m.medicine_id) % (COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))::bigint))::integer AS total_stock_sub_quantity,
    m.barcode,
    m.sku,
    m.manufacturer,
    m.requires_prescription,
    m.search_vector,
    m.sub_unit,
    COALESCE(m.sub_units_per_unit, 1) AS sub_units_per_unit,
    m.allow_sub_unit_sale,
    COALESCE(m.min_stock_level, 0) AS min_stock_level,
    mb.batch_id,
    mb.batch_number,
    mb.expiry_date,
    COALESCE(mb.stock_quantity, 0) AS batch_stock_quantity,
    COALESCE(mb.stock_sub_quantity, 0) AS batch_stock_sub_quantity,
    (mb.sale_price)::double precision AS batch_sale_price,
    (mb.sale_sub_unit_price)::double precision AS batch_sale_sub_unit_price,
    (mb.sale_price)::double precision AS global_price,
    (((COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(mb.stock_sub_quantity, 0)) <= 0) AS is_out_of_stock,
    ((((COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(mb.stock_sub_quantity, 0)) > 0) AND (((COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(mb.stock_sub_quantity, 0)) <= (COALESCE(m.min_stock_level, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)))) AS is_low_stock
   FROM (medicine m
     LEFT JOIN medicine_batch mb ON ((m.medicine_id = mb.medicine_id)))
  WHERE ((m.is_active = true) AND ((mb.expiry_date > CURRENT_DATE) OR (mb.expiry_date IS NULL)));
```
