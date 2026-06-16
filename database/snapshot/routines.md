# Functions & Procedures

## check_stock_available(required_medicine_id integer, required_quantity integer, required_sub_quantity integer)  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.check_stock_available(required_medicine_id integer, required_quantity integer, required_sub_quantity integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
   available_quantity integer := 0;
   available_sub_quantity integer :=0;
   f_sub_units_per_unit integer :=0;
   total_available_sub_unit integer :=0;
   total_requested_sub_unit integer :=0;
   r record;
begin
   select COALESCE(sub_units_per_unit,1) into  f_sub_units_per_unit from medicine where medicine_id=required_medicine_id;
  --i want to fetch all entries from medicine_batch which is not expired and check the stock avlaibility 
   --step 1 convert input into only subunits
   total_requested_sub_unit:=(required_quantity * f_sub_units_per_unit)+required_sub_quantity;
   --step 2 convert and summ alll avlaaible subunits 
   --step 3 then compare them
   
   for r in 
        select quantity,sub_quantity from medicine_batch where medicine_id=required_medicine_id and expiry_date > NOW()
   loop 
       available_quantity:=available_quantity+coalesce(r.quantity,0);
	   available_sub_quantity:=available_sub_quantity+coalesce(r.sub_quantity,0);
   end loop;
    total_available_sub_unit:=(available_quantity * f_sub_units_per_unit)+(available_sub_quantity );


    return total_available_sub_unit >= total_requested_sub_unit;
end;
$function$

```

## cleanup_old_audit_logs(p_days integer)  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days integer DEFAULT 365)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (CURRENT_TIMESTAMP - make_interval(days => p_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$

```

## fn_tg_purchase_detail_to_txn()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.fn_tg_purchase_detail_to_txn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_purchase_id, batch_id)
    VALUES (NEW.medicine_id, 'purchase', NEW.quantity, COALESCE(NEW.sub_quantity, 0), NEW.unit_cost, NEW.purchase_id, NEW.batch_id);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE medicine_transaction
    SET quantity = NEW.quantity, sub_quantity = COALESCE(NEW.sub_quantity, 0), amount_per_unit = NEW.unit_cost, batch_id = NEW.batch_id
    WHERE ref_purchase_id = NEW.purchase_id AND medicine_id = NEW.medicine_id AND txn_type = 'purchase';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM medicine_transaction
    WHERE ref_purchase_id = OLD.purchase_id AND medicine_id = OLD.medicine_id AND txn_type = 'purchase';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$

```

## fn_tg_purchase_return_detail_to_txn()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.fn_tg_purchase_return_detail_to_txn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_purchase_return, batch_id)
    VALUES (NEW.medicine_id, 'purchase_return', NEW.quantity, COALESCE(NEW.sub_quantity, 0), NEW.returned_unit_price, NEW.return_id, NEW.batch_id);

    -- 🔴 FIX: Removed the manual UPDATE medicine_batch from here.
    -- The generic stock trigger (fn_tg_stockquantity_generic) will handle it.

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE medicine_transaction
    SET
      medicine_id = NEW.medicine_id,
      quantity = NEW.quantity,
      sub_quantity = COALESCE(NEW.sub_quantity, 0),
      amount_per_unit = NEW.returned_unit_price,
      batch_id = NEW.batch_id
    WHERE ref_purchase_return = OLD.return_id
      AND medicine_id = OLD.medicine_id
      AND txn_type = 'purchase_return';

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM medicine_transaction
    WHERE ref_purchase_return = OLD.return_id
      AND medicine_id = OLD.medicine_id
      AND txn_type = 'purchase_return';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$

```

## fn_tg_sale_detail_to_txn()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.fn_tg_sale_detail_to_txn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_sale_id, batch_id)
    VALUES (NEW.medicine_id, 'sale', NEW.quantity, COALESCE(NEW.sub_quantity, 0), NEW.unit_sale_price, NEW.sale_id, NEW.batch_id);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE medicine_transaction
    SET quantity = NEW.quantity, sub_quantity = COALESCE(NEW.sub_quantity, 0), amount_per_unit = NEW.unit_sale_price, batch_id = NEW.batch_id
    WHERE ref_sale_id = NEW.sale_id AND medicine_id = NEW.medicine_id AND txn_type = 'sale';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM medicine_transaction
    WHERE ref_sale_id = OLD.sale_id AND medicine_id = OLD.medicine_id AND txn_type = 'sale';
  END IF;
  RETURN NULL;
END;
$function$

```

## fn_tg_sale_return_detail_to_txn()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.fn_tg_sale_return_detail_to_txn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_sale_return, batch_id)
    VALUES (NEW.medicine_id, 'sale_return', NEW.returned_quantity, COALESCE(NEW.returned_sub_quantity, 0), NEW.returned_unit_price, NEW.return_id, NEW.batch_id);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE medicine_transaction
    SET quantity = NEW.returned_quantity, sub_quantity = COALESCE(NEW.returned_sub_quantity, 0), amount_per_unit = NEW.returned_unit_price, batch_id = NEW.batch_id
    WHERE ref_sale_return = NEW.return_id AND medicine_id = NEW.medicine_id AND txn_type = 'sale_return';
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM medicine_transaction
    WHERE ref_sale_return = OLD.return_id AND medicine_id = OLD.medicine_id AND txn_type = 'sale_return';
  END IF;
  RETURN NEW;
END;
$function$

```

## fn_tg_stockquantity_generic()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.fn_tg_stockquantity_generic()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sign INTEGER;
    v_sub_units_per_unit INTEGER;
    v_total_sub_units_change INTEGER;
    v_medicine_id INTEGER;
BEGIN
    v_medicine_id := COALESCE(NEW.medicine_id, OLD.medicine_id);
    
    SELECT COALESCE(sub_units_per_unit, 1) INTO v_sub_units_per_unit FROM medicine WHERE medicine_id = v_medicine_id;
    IF v_sub_units_per_unit <= 0 THEN v_sub_units_per_unit := 1; END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.txn_type IN ('purchase', 'sale_return') THEN v_sign := 1;
        ELSIF NEW.txn_type IN ('sale', 'purchase_return') THEN v_sign := -1;
        ELSIF NEW.txn_type = 'adjustment' THEN v_sign := 1;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.txn_type IN ('purchase', 'sale_return') THEN v_sign := -1;
        ELSE v_sign := 1;
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.batch_id IS NOT NULL THEN
            v_total_sub_units_change := (NEW.quantity * v_sub_units_per_unit) + COALESCE(NEW.sub_quantity, 0);
            UPDATE medicine_batch 
            SET stock_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity + (v_sign * v_total_sub_units_change) ) / v_sub_units_per_unit, 
                stock_sub_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity + (v_sign * v_total_sub_units_change) ) % v_sub_units_per_unit 
            WHERE batch_id = NEW.batch_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.batch_id IS NOT NULL THEN
            v_total_sub_units_change := (OLD.quantity * v_sub_units_per_unit) + COALESCE(OLD.sub_quantity, 0);
            UPDATE medicine_batch 
            SET stock_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity + (v_sign * v_total_sub_units_change) ) / v_sub_units_per_unit, 
                stock_sub_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity + (v_sign * v_total_sub_units_change) ) % v_sub_units_per_unit 
            WHERE batch_id = OLD.batch_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.batch_id IS NOT NULL THEN
            v_total_sub_units_change := (OLD.quantity * v_sub_units_per_unit) + COALESCE(OLD.sub_quantity, 0);
            UPDATE medicine_batch 
            SET stock_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity - (v_sign * v_total_sub_units_change) ) / v_sub_units_per_unit, 
                stock_sub_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity - (v_sign * v_total_sub_units_change) ) % v_sub_units_per_unit 
            WHERE batch_id = OLD.batch_id;
        END IF;
        IF NEW.batch_id IS NOT NULL THEN
            v_total_sub_units_change := (NEW.quantity * v_sub_units_per_unit) + COALESCE(NEW.sub_quantity, 0);
            UPDATE medicine_batch 
            SET stock_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity + (v_sign * v_total_sub_units_change) ) / v_sub_units_per_unit, 
                stock_sub_quantity = ( (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity + (v_sign * v_total_sub_units_change) ) % v_sub_units_per_unit 
            WHERE batch_id = NEW.batch_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$

```

## generate_batch_code()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.generate_batch_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN 'BATCH-' || LPAD(nextval('batch_seq')::text, 8, '0');
END;
$function$

```

## generate_invoice_no()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.generate_invoice_no()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN 'INV-' || LPAD(nextval('invoice_seq')::text, 6, '0');
END;
$function$

```

## get_clinic_number()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.get_clinic_number()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
	v_max_clinic_number int;
	v_next_number int;
begin 
   select max(clinic_number)
   into v_max_clinic_number
   from visit
   where
   visit_timestamp >= current_date
   and 
   visit_timestamp < current_date + interval '1 day';

   if v_max_clinic_number is null then
   		v_next_number :=1;
	else
		v_next_number := v_max_clinic_number +1;
	end if;

	return v_next_number;
	
end;
$function$

```

## get_clinic_number(p_patient_id integer)  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.get_clinic_number(p_patient_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
	v_max_clinic_number int;
	v_next_number int;
begin 
   select max(clinic_number)
   into v_max_clinic_number
   from visit
   where
   visit_timestamp >= current_date
   and 
   visit_timestamp < current_date + interval '1 day';

   if v_max_clinic_number is null then
   		v_next_number :=1;
	else
		v_next_number := v_max_clinic_number +1;
	end if;

	return v_next_number;
	
end;
$function$

```

## get_clinic_number(p_visit_type text)  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.get_clinic_number(p_visit_type text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
    v_max_clinic_number int;
    v_next_number int;
begin 
    select max(clinic_number)
    into v_max_clinic_number
    from visit
    where
    visit_timestamp >= current_date
    and visit_timestamp < current_date + interval '1 day'
    and visit_type = p_visit_type;

    if v_max_clinic_number is null then
        v_next_number := 1;
    else
        v_next_number := v_max_clinic_number + 1;
    end if;

    return v_next_number;
end;
$function$

```

## get_stock_display(p_medicine_id integer)  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.get_stock_display(p_medicine_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 DECLARE
     v_stock_qty INT;
     v_sub_qty INT;
     v_form VARCHAR;
     v_sub_unit VARCHAR;
     v_sub_units_per_unit INT;
     v_total_sub_units BIGINT;
     v_result TEXT;
 BEGIN
     SELECT form, sub_unit, COALESCE(sub_units_per_unit, 1)
     INTO v_form, v_sub_unit, v_sub_units_per_unit
     FROM medicine
     WHERE medicine_id = p_medicine_id;

     SELECT 
        SUM((stock_quantity * v_sub_units_per_unit) + COALESCE(stock_sub_quantity, 0))
     INTO v_total_sub_units
     FROM medicine_batch
     WHERE medicine_id = p_medicine_id AND (expiry_date > CURRENT_DATE OR expiry_date IS NULL);

     v_total_sub_units := COALESCE(v_total_sub_units, 0);
     v_stock_qty := (v_total_sub_units / v_sub_units_per_unit)::integer;
     v_sub_qty := (v_total_sub_units % v_sub_units_per_unit)::integer;

     IF v_sub_units_per_unit <= 1 OR v_sub_qty = 0 THEN
         v_result := v_stock_qty || ' ' || COALESCE(v_form, 'units');
     ELSE
         v_result := v_stock_qty || ' ' || COALESCE(v_form, 'units') || 
                     ' + ' || v_sub_qty || ' ' || COALESCE(v_sub_unit, 'sub-units');
     END IF;

     RETURN v_result;
 END;
 $function$

```

## medicine_search_vector_update()  — function [plpgsql]

```sql
CREATE OR REPLACE FUNCTION public.medicine_search_vector_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.generic_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B');
    RETURN NEW;
END;
$function$

```

## update_and_log_visit_status(IN p_visit_id integer, IN p_status character varying, IN p_updated_by_doctor integer, IN p_updated_by_staff integer)  — procedure [plpgsql]

```sql
CREATE OR REPLACE PROCEDURE public.update_and_log_visit_status(IN p_visit_id integer, IN p_status character varying, IN p_updated_by_doctor integer, IN p_updated_by_staff integer)
 LANGUAGE plpgsql
AS $procedure$
begin
	update visit
	set status =p_status
	where visit_id =p_visit_id;

	insert into visit_status_history(visit_id,status,updated_by_staff,updated_by_doctor)
	values(
		p_visit_id,
		p_status,
		p_updated_by_staff,
		p_updated_by_doctor
	);
end;
$procedure$

```
