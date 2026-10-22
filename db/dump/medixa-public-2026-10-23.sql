--
-- PostgreSQL database dump
--

\restrict FeKSMj6DNWQU9mcuSImzNQfO0Ea3JBXXGbJTzij4qpCLX8o5USOo8dyqVoI0hL7

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: check_stock_available(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_stock_available(required_medicine_id integer, required_quantity integer, required_sub_quantity integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: cleanup_old_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_audit_logs(p_days integer DEFAULT 365) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (CURRENT_TIMESTAMP - make_interval(days => p_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: fn_tg_purchase_detail_to_txn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tg_purchase_detail_to_txn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_tg_purchase_return_detail_to_txn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tg_purchase_return_detail_to_txn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_tg_sale_detail_to_txn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tg_sale_detail_to_txn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_tg_sale_return_detail_to_txn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tg_sale_return_detail_to_txn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_tg_stockquantity_generic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tg_stockquantity_generic() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: generate_batch_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_batch_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'BATCH-' || LPAD(nextval('batch_seq')::text, 8, '0');
END;
$$;


--
-- Name: generate_invoice_no(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_no() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'INV-' || LPAD(nextval('invoice_seq')::text, 6, '0');
END;
$$;


--
-- Name: get_clinic_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_clinic_number() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_clinic_number(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_clinic_number(p_patient_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_clinic_number(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_clinic_number(p_visit_type text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_stock_display(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stock_display(p_medicine_id integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
 $$;


--
-- Name: medicine_search_vector_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.medicine_search_vector_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.generic_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B');
    RETURN NEW;
END;
$$;


--
-- Name: update_and_log_visit_status(integer, character varying, integer, integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.update_and_log_visit_status(IN p_visit_id integer, IN p_status character varying, IN p_updated_by_doctor integer, IN p_updated_by_staff integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cashier_payment_txn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashier_payment_txn (
    cashier_payment_txn_id bigint NOT NULL,
    bill_id integer NOT NULL,
    visit_id integer,
    amount numeric(12,2) NOT NULL,
    payment_type character varying(50) NOT NULL,
    payment_reference character varying(150),
    notes text,
    received_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    txn_type text DEFAULT 'payment'::text NOT NULL,
    reversed_from_txn_id bigint,
    reversal_reason_code text,
    reversal_reason_note text,
    receipt_no character varying(80),
    CONSTRAINT cashier_payment_txn_amount_check CHECK ((amount <> (0)::numeric)),
    CONSTRAINT cashier_payment_txn_type_check CHECK ((txn_type = ANY (ARRAY['payment'::text, 'reversal'::text])))
);


--
-- Name: pharmacy_sale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_sale (
    sale_id integer NOT NULL,
    visit_id integer,
    bill_id integer,
    sale_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    handled_by integer NOT NULL,
    total_amount numeric(10,2),
    status character varying(100),
    payment_type character varying(50) DEFAULT 'CASH'::character varying,
    payment_reference character varying(100),
    paid_amount numeric(10,2) DEFAULT 0,
    due_amount numeric(10,2) DEFAULT 0,
    change_amount numeric(10,2) DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    is_prescription_sale boolean DEFAULT false,
    prescription_id integer,
    notes text,
    customer_id integer,
    settlement_channel text DEFAULT 'pharmacy'::text,
    settlement_status text DEFAULT 'settled'::text,
    settled_at timestamp without time zone,
    settled_by integer,
    CONSTRAINT pharmacy_sale_payment_type_check CHECK (((payment_type)::text = ANY (ARRAY[('CASH'::character varying)::text, ('CARD'::character varying)::text, ('INSURANCE'::character varying)::text, ('MOBILE'::character varying)::text, ('SPLIT'::character varying)::text]))),
    CONSTRAINT pharmacy_sale_settlement_channel_check CHECK ((settlement_channel = ANY (ARRAY['pharmacy'::text, 'cashier'::text]))),
    CONSTRAINT pharmacy_sale_settlement_status_check CHECK ((settlement_status = ANY (ARRAY['pending'::text, 'settled'::text]))),
    CONSTRAINT pharmacy_sale_status_check CHECK (((status)::text = ANY (ARRAY[('Completed'::character varying)::text, ('Returned'::character varying)::text, ('Cancelled'::character varying)::text])))
);


--
-- Name: admin_cash_collected_ledger_v1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.admin_cash_collected_ledger_v1 AS
 SELECT txn.created_at AS collected_at,
        CASE
            WHEN (txn.txn_type = 'payment'::text) THEN txn.amount
            WHEN (txn.txn_type = 'reversal'::text) THEN (- abs(txn.amount))
            ELSE (0)::numeric
        END AS amount,
    'cashier'::text AS source,
    concat('cashier_payment_txn:', txn.cashier_payment_txn_id) AS entity_ref
   FROM public.cashier_payment_txn txn
  WHERE (txn.txn_type = ANY (ARRAY['payment'::text, 'reversal'::text]))
UNION ALL
 SELECT sale.sale_timestamp AS collected_at,
    (sale.total_amount)::numeric AS amount,
    'pharmacy'::text AS source,
    concat('pharmacy_sale:', sale.sale_id) AS entity_ref
   FROM public.pharmacy_sale sale
  WHERE ((sale.settlement_channel = 'pharmacy'::text) AND (sale.settlement_status = 'settled'::text));


--
-- Name: VIEW admin_cash_collected_ledger_v1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.admin_cash_collected_ledger_v1 IS 'Normalized cash collected ledger for admin dashboard trends and totals (cashier net + pharmacy counter settled; anti-double-count by channel).';


--
-- Name: admission_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admission_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission (
    admission_id integer NOT NULL,
    admission_no character varying(40) DEFAULT ('IPD'::text || lpad((nextval('public.admission_no_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    patient_id integer NOT NULL,
    visit_id integer,
    attending_doctor_id integer,
    admission_datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    admission_type character varying(20) DEFAULT 'direct'::character varying NOT NULL,
    provisional_diagnosis text,
    final_diagnosis text,
    current_bed_id integer,
    status character varying(20) DEFAULT 'admitted'::character varying NOT NULL,
    discharge_datetime timestamp without time zone,
    discharge_type character varying(20),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_admission_discharge_complete CHECK ((((status)::text <> 'discharged'::text) OR ((discharge_datetime IS NOT NULL) AND (discharge_type IS NOT NULL)))),
    CONSTRAINT ck_admission_discharge_type CHECK (((discharge_type IS NULL) OR ((discharge_type)::text = ANY (ARRAY[('normal'::character varying)::text, ('lama'::character varying)::text, ('referred'::character varying)::text, ('transferred'::character varying)::text, ('death'::character varying)::text, ('absconded'::character varying)::text])))),
    CONSTRAINT ck_admission_status CHECK (((status)::text = ANY (ARRAY[('admitted'::character varying)::text, ('discharged'::character varying)::text]))),
    CONSTRAINT ck_admission_type CHECK (((admission_type)::text = ANY (ARRAY[('opd_referred'::character varying)::text, ('emergency'::character varying)::text, ('direct'::character varying)::text, ('planned'::character varying)::text])))
);


--
-- Name: admission_admission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admission_admission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admission_admission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admission_admission_id_seq OWNED BY public.admission.admission_id;


--
-- Name: allowance_type_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowance_type_master (
    code text NOT NULL,
    label text NOT NULL,
    description text,
    taxable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: appointment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment (
    appointment_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    duration_min integer DEFAULT 15 NOT NULL,
    status character varying(15) DEFAULT 'booked'::character varying NOT NULL,
    reason text,
    visit_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_appointment_duration CHECK ((duration_min > 0)),
    CONSTRAINT ck_appointment_status CHECK (((status)::text = ANY (ARRAY[('booked'::character varying)::text, ('confirmed'::character varying)::text, ('arrived'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('no_show'::character varying)::text])))
);


--
-- Name: appointment_appointment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_appointment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_appointment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_appointment_id_seq OWNED BY public.appointment.appointment_id;


--
-- Name: attendance_regularization_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_regularization_requests (
    regularization_id bigint NOT NULL,
    staff_id integer NOT NULL,
    attendance_id uuid,
    requested_check_in timestamp without time zone,
    requested_check_out timestamp without time zone,
    requested_status character varying(20),
    reason text NOT NULL,
    request_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    decision_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: attendance_regularization_requests_regularization_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_regularization_requests_regularization_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_regularization_requests_regularization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_regularization_requests_regularization_id_seq OWNED BY public.attendance_regularization_requests.regularization_id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id integer,
    action character varying(255) NOT NULL,
    entity_type character varying(100),
    entity_id character varying(100),
    details jsonb,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: batch_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bed (
    bed_id integer NOT NULL,
    room_id integer NOT NULL,
    bed_number character varying(40) NOT NULL,
    daily_rate numeric DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'vacant'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_bed_rate_nonneg CHECK ((daily_rate >= (0)::numeric)),
    CONSTRAINT ck_bed_status CHECK (((status)::text = ANY (ARRAY[('vacant'::character varying)::text, ('occupied'::character varying)::text, ('reserved'::character varying)::text, ('cleaning'::character varying)::text, ('blocked'::character varying)::text])))
);


--
-- Name: bed_bed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bed_bed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bed_bed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bed_bed_id_seq OWNED BY public.bed.bed_id;


--
-- Name: bed_transfer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bed_transfer (
    transfer_id integer NOT NULL,
    admission_id integer NOT NULL,
    from_bed_id integer,
    to_bed_id integer NOT NULL,
    transfer_datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason text,
    by_staff_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bed_transfer_transfer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bed_transfer_transfer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bed_transfer_transfer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bed_transfer_transfer_id_seq OWNED BY public.bed_transfer.transfer_id;


--
-- Name: bill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill (
    bill_id integer NOT NULL,
    patient_id integer NOT NULL,
    visit_id integer NOT NULL,
    total_amount numeric(10,2),
    payment_status character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bill_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('Paid'::character varying)::text, ('Unpaid'::character varying)::text, ('Partial'::character varying)::text]))),
    CONSTRAINT ck_bill_total_nonneg CHECK ((total_amount >= (0)::numeric))
);


--
-- Name: bill_bill_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bill_bill_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bill_bill_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bill_bill_id_seq OWNED BY public.bill.bill_id;


--
-- Name: bill_charge_source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_charge_source (
    bill_charge_source_id bigint NOT NULL,
    bill_id integer NOT NULL,
    bill_item_id integer,
    source_type text NOT NULL,
    source_id bigint,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    meta_json jsonb,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_charge_source_type_check CHECK ((source_type = ANY (ARRAY['consultation'::text, 'pharmacy'::text, 'lab'::text, 'other'::text])))
);


--
-- Name: bill_charge_source_bill_charge_source_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bill_charge_source ALTER COLUMN bill_charge_source_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.bill_charge_source_bill_charge_source_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bill_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_item (
    item_id integer NOT NULL,
    bill_id integer NOT NULL,
    description character varying(255),
    amount numeric(10,2) NOT NULL,
    quantity integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_bill_item_qty_nonneg CHECK ((quantity >= 0))
);


--
-- Name: bill_item_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bill_item_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bill_item_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bill_item_item_id_seq OWNED BY public.bill_item.item_id;


--
-- Name: bill_pharmacy_sale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_pharmacy_sale (
    bill_pharmacy_sale_id bigint NOT NULL,
    bill_id integer NOT NULL,
    sale_id integer NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    settled_amount numeric(12,2) DEFAULT 0 NOT NULL,
    settlement_status text DEFAULT 'pending'::text NOT NULL,
    created_by integer,
    settled_by integer,
    settled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT bill_pharmacy_sale_settlement_status_check CHECK ((settlement_status = ANY (ARRAY['pending'::text, 'settled'::text])))
);


--
-- Name: bill_pharmacy_sale_bill_pharmacy_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bill_pharmacy_sale ALTER COLUMN bill_pharmacy_sale_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.bill_pharmacy_sale_bill_pharmacy_sale_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cashier_audit_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashier_audit_event (
    cashier_audit_event_id bigint NOT NULL,
    event_type text NOT NULL,
    bill_id integer,
    visit_id integer,
    cashier_payment_txn_id bigint,
    actor_staff_id integer,
    before_json jsonb,
    after_json jsonb,
    reason_code text,
    reason_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cashier_audit_event_cashier_audit_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cashier_audit_event ALTER COLUMN cashier_audit_event_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cashier_audit_event_cashier_audit_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cashier_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashier_idempotency (
    cashier_idempotency_id bigint NOT NULL,
    idempotency_key character varying(120) NOT NULL,
    endpoint text NOT NULL,
    bill_id integer,
    request_hash text,
    response_json jsonb NOT NULL,
    status_code integer DEFAULT 200 NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cashier_idempotency_cashier_idempotency_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cashier_idempotency ALTER COLUMN cashier_idempotency_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cashier_idempotency_cashier_idempotency_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cashier_payment_allocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashier_payment_allocation (
    cashier_payment_allocation_id bigint NOT NULL,
    cashier_payment_txn_id bigint NOT NULL,
    sale_id integer NOT NULL,
    bill_id integer NOT NULL,
    allocated_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cashier_payment_allocation_amount_check CHECK ((allocated_amount > (0)::numeric))
);


--
-- Name: cashier_payment_allocation_cashier_payment_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cashier_payment_allocation ALTER COLUMN cashier_payment_allocation_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cashier_payment_allocation_cashier_payment_allocation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cashier_payment_txn_cashier_payment_txn_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cashier_payment_txn ALTER COLUMN cashier_payment_txn_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cashier_payment_txn_cashier_payment_txn_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cashier_settlement_draft; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashier_settlement_draft (
    cashier_settlement_draft_id bigint NOT NULL,
    bill_id integer NOT NULL,
    visit_id integer,
    amount numeric(12,2) NOT NULL,
    payment_type character varying(50) NOT NULL,
    payment_reference character varying(150),
    notes text,
    draft_status text DEFAULT 'open'::text NOT NULL,
    created_by integer,
    applied_cashier_payment_txn_id bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cashier_settlement_draft_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT cashier_settlement_draft_status_check CHECK ((draft_status = ANY (ARRAY['open'::text, 'applied'::text, 'cancelled'::text])))
);


--
-- Name: cashier_settlement_draft_cashier_settlement_draft_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cashier_settlement_draft ALTER COLUMN cashier_settlement_draft_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cashier_settlement_draft_cashier_settlement_draft_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cashier_shift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashier_shift (
    cashier_shift_id bigint NOT NULL,
    staff_id integer NOT NULL,
    opened_at timestamp without time zone DEFAULT now() NOT NULL,
    closed_at timestamp without time zone,
    opening_cash numeric(12,2) DEFAULT 0 NOT NULL,
    closing_cash_counted numeric(12,2),
    expected_cash numeric(12,2),
    variance numeric(12,2),
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    closed_by integer,
    CONSTRAINT cashier_shift_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


--
-- Name: cashier_shift_cashier_shift_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cashier_shift ALTER COLUMN cashier_shift_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cashier_shift_cashier_shift_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: current_pregnancy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.current_pregnancy (
    pregnancy_id integer NOT NULL,
    patient_id integer NOT NULL,
    visit_id integer NOT NULL,
    multiple_pregnancy boolean,
    complications text,
    ultrasound_findings text,
    fetal_heart_rate_bpm integer,
    placenta_position character varying(50),
    presentation character varying(50),
    gestational_age_weeks integer,
    notes text
);


--
-- Name: current_pregnancy_pregnancy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.current_pregnancy_pregnancy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: current_pregnancy_pregnancy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.current_pregnancy_pregnancy_id_seq OWNED BY public.current_pregnancy.pregnancy_id;


--
-- Name: doctor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor (
    doctor_id integer NOT NULL,
    user_code character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    doctor_name character varying(50) NOT NULL,
    specialization character varying(100) NOT NULL,
    education character varying(255),
    consultation_fee numeric(10,2) NOT NULL,
    emergency_fee numeric(10,2) NOT NULL,
    contact_number character varying(20),
    email character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    employment_status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    last_failed_login_at timestamp without time zone,
    account_locked_until timestamp without time zone,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password_reset_token character varying(128),
    password_reset_expires_at timestamp without time zone,
    mfa_enabled boolean DEFAULT false NOT NULL,
    session_version integer DEFAULT 1 NOT NULL,
    CONSTRAINT doctor_employment_status_check CHECK (((employment_status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'resigned'::text])))
);


--
-- Name: doctor_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_attendance (
    attendance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id integer NOT NULL,
    date date NOT NULL,
    check_in_time timestamp without time zone,
    check_out_time timestamp without time zone,
    status character varying(20) DEFAULT 'Present'::character varying NOT NULL,
    marked_by character varying(50),
    admin_id integer,
    roster_id bigint,
    shift_code character varying(50),
    check_in_source character varying(40),
    check_out_source character varying(40),
    late_minutes integer DEFAULT 0 NOT NULL,
    early_leave_minutes integer DEFAULT 0 NOT NULL,
    overtime_minutes integer DEFAULT 0 NOT NULL,
    break_minutes integer DEFAULT 0 NOT NULL,
    attendance_notes text,
    derived_status character varying(30) DEFAULT 'unscheduled'::character varying NOT NULL,
    is_unscheduled boolean DEFAULT true NOT NULL,
    is_on_time boolean DEFAULT false NOT NULL,
    policy_snapshot jsonb,
    CONSTRAINT doctor_attendance_derived_status_check CHECK (((derived_status)::text = ANY (ARRAY['on_time'::text, 'late'::text, 'half_day'::text, 'early_leave'::text, 'overtime'::text, 'unscheduled'::text, 'absent'::text, 'leave'::text])))
);


--
-- Name: doctor_doctor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctor_doctor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctor_doctor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctor_doctor_id_seq OWNED BY public.doctor.doctor_id;


--
-- Name: doctor_encounter_note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_encounter_note (
    doctor_encounter_note_id bigint NOT NULL,
    visit_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    reception_complaint text,
    doctor_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: doctor_encounter_note_doctor_encounter_note_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.doctor_encounter_note ALTER COLUMN doctor_encounter_note_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.doctor_encounter_note_doctor_encounter_note_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: doctor_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_order (
    order_id integer NOT NULL,
    admission_id integer NOT NULL,
    ordered_by_doctor_id integer,
    order_type character varying(20) NOT NULL,
    details text,
    priority character varying(10) DEFAULT 'routine'::character varying NOT NULL,
    status character varying(15) DEFAULT 'active'::character varying NOT NULL,
    start_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    stop_dt timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_order_priority CHECK (((priority)::text = ANY (ARRAY[('stat'::character varying)::text, ('routine'::character varying)::text, ('prn'::character varying)::text]))),
    CONSTRAINT ck_order_status CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('held'::character varying)::text, ('discontinued'::character varying)::text, ('completed'::character varying)::text]))),
    CONSTRAINT ck_order_type CHECK (((order_type)::text = ANY (ARRAY[('medication'::character varying)::text, ('lab'::character varying)::text, ('radiology'::character varying)::text, ('diet'::character varying)::text, ('iv'::character varying)::text, ('procedure'::character varying)::text, ('nursing'::character varying)::text])))
);


--
-- Name: doctor_order_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctor_order_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctor_order_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctor_order_order_id_seq OWNED BY public.doctor_order.order_id;


--
-- Name: doctor_security_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_security_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id integer NOT NULL,
    user_code character varying(50) NOT NULL,
    role character varying(50) DEFAULT 'Doctor'::character varying NOT NULL,
    login_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address character varying(45),
    user_agent text,
    revoked_at timestamp without time zone,
    revoked_reason character varying(120)
);


--
-- Name: employee_allowance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_allowance (
    allowance_id bigint NOT NULL,
    account_type character varying(20) NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    allowance_code character varying(40) NOT NULL,
    allowance_name character varying(120) NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    allowance_mode character varying(20) DEFAULT 'recurring'::character varying NOT NULL,
    taxable boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_allowance_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text]))),
    CONSTRAINT employee_allowance_mode_check CHECK (((allowance_mode)::text = ANY (ARRAY[('recurring'::character varying)::text, ('one_time'::character varying)::text]))),
    CONSTRAINT employee_allowance_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))))
);


--
-- Name: employee_allowance_allowance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_allowance_allowance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_allowance_allowance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_allowance_allowance_id_seq OWNED BY public.employee_allowance.allowance_id;


--
-- Name: employee_compensation_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_compensation_profile (
    compensation_id bigint NOT NULL,
    account_type character varying(20) NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    salary_model character varying(30) DEFAULT 'fixed_monthly'::character varying NOT NULL,
    payroll_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    base_monthly_salary numeric(12,2) DEFAULT 0 NOT NULL,
    per_patient_fee numeric(12,2) DEFAULT 0 NOT NULL,
    active_from date DEFAULT CURRENT_DATE NOT NULL,
    active_to date,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_compensation_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text]))),
    CONSTRAINT employee_compensation_payroll_cycle_check CHECK (((payroll_cycle)::text = 'monthly'::text)),
    CONSTRAINT employee_compensation_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id)))),
    CONSTRAINT employee_compensation_salary_model_check CHECK (((salary_model)::text = ANY (ARRAY[('fixed_monthly'::character varying)::text, ('per_patient_seen'::character varying)::text])))
);


--
-- Name: employee_compensation_profile_compensation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_compensation_profile_compensation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_compensation_profile_compensation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_compensation_profile_compensation_id_seq OWNED BY public.employee_compensation_profile.compensation_id;


--
-- Name: employee_credential_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_credential_events (
    credential_event_id bigint NOT NULL,
    credential_id bigint NOT NULL,
    actor_staff_id integer,
    event_type character varying(40) NOT NULL,
    from_status character varying(30),
    to_status character varying(30),
    event_note text,
    payload jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_credential_events_credential_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_credential_events_credential_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_credential_events_credential_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_credential_events_credential_event_id_seq OWNED BY public.employee_credential_events.credential_event_id;


--
-- Name: employee_credential_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_credential_types (
    credential_type_id integer NOT NULL,
    credential_code character varying(60) NOT NULL,
    credential_name character varying(140) NOT NULL,
    credential_category character varying(80),
    issuing_authority_default character varying(160),
    validity_months integer,
    renewal_window_days integer DEFAULT 60 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_credential_types_credential_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_credential_types_credential_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_credential_types_credential_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_credential_types_credential_type_id_seq OWNED BY public.employee_credential_types.credential_type_id;


--
-- Name: employee_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_credentials (
    credential_id bigint NOT NULL,
    account_type character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    credential_type_id integer NOT NULL,
    credential_number character varying(120) NOT NULL,
    credential_title character varying(160),
    issued_on date,
    expires_on date,
    issuing_authority character varying(160),
    issuing_country character varying(80),
    verification_status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    renewal_status character varying(30) DEFAULT 'not_due'::character varying NOT NULL,
    reminder_status character varying(30) DEFAULT 'none'::character varying NOT NULL,
    submitted_at timestamp without time zone,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_note text,
    verified_at timestamp without time zone,
    revoked_by integer,
    revoked_at timestamp without time zone,
    revoke_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_credentials_account_type_check CHECK (((account_type)::text = ANY (ARRAY['staff'::text, 'doctor'::text]))),
    CONSTRAINT employee_credentials_employee_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id)))),
    CONSTRAINT employee_credentials_renewal_status_check CHECK (((renewal_status)::text = ANY (ARRAY['not_due'::text, 'due'::text, 'in_progress'::text, 'renewed'::text, 'overdue'::text, 'blocked'::text]))),
    CONSTRAINT employee_credentials_status_check CHECK (((verification_status)::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'verified'::text, 'rejected'::text, 'revoked'::text, 'expired'::text])))
);


--
-- Name: employee_credentials_credential_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_credentials_credential_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_credentials_credential_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_credentials_credential_id_seq OWNED BY public.employee_credentials.credential_id;


--
-- Name: employee_document_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_document_requirements (
    requirement_id bigint NOT NULL,
    document_type_id integer NOT NULL,
    target_type character varying(30) NOT NULL,
    target_value character varying(120),
    mandatory boolean DEFAULT true NOT NULL,
    due_days_from_joining integer,
    recurrence_days integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_document_requirements_target_type_check CHECK (((target_type)::text = ANY (ARRAY['global'::text, 'role'::text, 'department'::text, 'facility'::text, 'account_type'::text])))
);


--
-- Name: employee_document_requirements_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_document_requirements_requirement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_document_requirements_requirement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_document_requirements_requirement_id_seq OWNED BY public.employee_document_requirements.requirement_id;


--
-- Name: employee_document_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_document_reviews (
    document_review_id bigint NOT NULL,
    document_id bigint NOT NULL,
    version_id bigint,
    reviewer_staff_id integer,
    review_action character varying(30) NOT NULL,
    review_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_document_reviews_action_check CHECK (((review_action)::text = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'requested_changes'::text, 'archived'::text])))
);


--
-- Name: employee_document_reviews_document_review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_document_reviews_document_review_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_document_reviews_document_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_document_reviews_document_review_id_seq OWNED BY public.employee_document_reviews.document_review_id;


--
-- Name: employee_document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_document_types (
    document_type_id integer NOT NULL,
    document_code character varying(60) NOT NULL,
    document_name character varying(140) NOT NULL,
    document_category character varying(80),
    required_default boolean DEFAULT false NOT NULL,
    requires_expiry boolean DEFAULT false NOT NULL,
    retention_days integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_document_types_document_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_document_types_document_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_document_types_document_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_document_types_document_type_id_seq OWNED BY public.employee_document_types.document_type_id;


--
-- Name: employee_document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_document_versions (
    version_id bigint NOT NULL,
    document_id bigint NOT NULL,
    version_no integer NOT NULL,
    storage_path text,
    file_url text,
    file_name character varying(255),
    mime_type character varying(120),
    file_size_bytes bigint,
    checksum_sha256 character varying(128),
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT employee_document_versions_version_no_check CHECK ((version_no > 0))
);


--
-- Name: employee_document_versions_version_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_document_versions_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_document_versions_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_document_versions_version_id_seq OWNED BY public.employee_document_versions.version_id;


--
-- Name: employee_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_documents (
    document_id bigint NOT NULL,
    account_type character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    document_type_id integer NOT NULL,
    document_title character varying(180) NOT NULL,
    document_description text,
    review_status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    visibility character varying(20) DEFAULT 'internal'::character varying NOT NULL,
    current_version_no integer DEFAULT 0 NOT NULL,
    effective_from date,
    effective_to date,
    expires_on date,
    required_by date,
    submitted_by integer,
    submitted_at timestamp without time zone,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_documents_account_type_check CHECK (((account_type)::text = ANY (ARRAY['staff'::text, 'doctor'::text]))),
    CONSTRAINT employee_documents_employee_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id)))),
    CONSTRAINT employee_documents_review_status_check CHECK (((review_status)::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'archived'::text]))),
    CONSTRAINT employee_documents_visibility_check CHECK (((visibility)::text = ANY (ARRAY['internal'::text, 'restricted'::text, 'confidential'::text])))
);


--
-- Name: employee_documents_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_documents_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_documents_document_id_seq OWNED BY public.employee_documents.document_id;


--
-- Name: employee_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_lifecycle_events (
    lifecycle_event_id bigint NOT NULL,
    lifecycle_run_id bigint,
    lifecycle_task_id bigint,
    actor_staff_id integer,
    event_type character varying(40) NOT NULL,
    from_status character varying(30),
    to_status character varying(30),
    event_note text,
    payload jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_lifecycle_events_lifecycle_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_lifecycle_events_lifecycle_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_lifecycle_events_lifecycle_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_lifecycle_events_lifecycle_event_id_seq OWNED BY public.employee_lifecycle_events.lifecycle_event_id;


--
-- Name: employee_lifecycle_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_lifecycle_runs (
    lifecycle_run_id bigint NOT NULL,
    account_type character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    lifecycle_template_id bigint,
    lifecycle_type character varying(30) NOT NULL,
    run_status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp without time zone,
    initiated_by integer,
    summary_note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_lifecycle_runs_account_type_check CHECK (((account_type)::text = ANY (ARRAY['staff'::text, 'doctor'::text]))),
    CONSTRAINT employee_lifecycle_runs_employee_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id)))),
    CONSTRAINT employee_lifecycle_runs_status_check CHECK (((run_status)::text = ANY (ARRAY['draft'::text, 'in_progress'::text, 'blocked'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT employee_lifecycle_runs_type_check CHECK (((lifecycle_type)::text = ANY (ARRAY['onboarding'::text, 'offboarding'::text, 'probation'::text, 'transfer'::text])))
);


--
-- Name: employee_lifecycle_runs_lifecycle_run_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_lifecycle_runs_lifecycle_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_lifecycle_runs_lifecycle_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_lifecycle_runs_lifecycle_run_id_seq OWNED BY public.employee_lifecycle_runs.lifecycle_run_id;


--
-- Name: employee_lifecycle_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_lifecycle_tasks (
    lifecycle_task_id bigint NOT NULL,
    lifecycle_run_id bigint NOT NULL,
    lifecycle_template_task_id bigint,
    task_code character varying(80) NOT NULL,
    task_name character varying(180) NOT NULL,
    task_group character varying(80),
    owner_staff_id integer,
    task_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    due_at timestamp without time zone,
    completed_at timestamp without time zone,
    completed_by integer,
    completion_note text,
    evidence_document_id bigint,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_lifecycle_tasks_status_check CHECK (((task_status)::text = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text, 'blocked'::text, 'cancelled'::text, 'overdue'::text])))
);


--
-- Name: employee_lifecycle_tasks_lifecycle_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_lifecycle_tasks_lifecycle_task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_lifecycle_tasks_lifecycle_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_lifecycle_tasks_lifecycle_task_id_seq OWNED BY public.employee_lifecycle_tasks.lifecycle_task_id;


--
-- Name: employee_lifecycle_template_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_lifecycle_template_tasks (
    lifecycle_template_task_id bigint NOT NULL,
    lifecycle_template_id bigint NOT NULL,
    task_code character varying(80) NOT NULL,
    task_name character varying(180) NOT NULL,
    task_group character varying(80),
    sequence_no integer DEFAULT 1 NOT NULL,
    default_owner_role character varying(80),
    mandatory boolean DEFAULT true NOT NULL,
    due_offset_days integer,
    requires_document_type_id integer,
    blocks_transition boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_lifecycle_template_task_lifecycle_template_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_lifecycle_template_task_lifecycle_template_task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_lifecycle_template_task_lifecycle_template_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_lifecycle_template_task_lifecycle_template_task_id_seq OWNED BY public.employee_lifecycle_template_tasks.lifecycle_template_task_id;


--
-- Name: employee_lifecycle_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_lifecycle_templates (
    lifecycle_template_id bigint NOT NULL,
    template_code character varying(60) NOT NULL,
    template_name character varying(140) NOT NULL,
    lifecycle_type character varying(30) NOT NULL,
    applies_to character varying(20) DEFAULT 'both'::character varying NOT NULL,
    role_code character varying(80),
    department character varying(120),
    facility_code character varying(80),
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_lifecycle_templates_applies_to_check CHECK (((applies_to)::text = ANY (ARRAY['staff'::text, 'doctor'::text, 'both'::text]))),
    CONSTRAINT employee_lifecycle_templates_type_check CHECK (((lifecycle_type)::text = ANY (ARRAY['onboarding'::text, 'offboarding'::text, 'probation'::text, 'transfer'::text])))
);


--
-- Name: employee_lifecycle_templates_lifecycle_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_lifecycle_templates_lifecycle_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_lifecycle_templates_lifecycle_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_lifecycle_templates_lifecycle_template_id_seq OWNED BY public.employee_lifecycle_templates.lifecycle_template_id;


--
-- Name: fbr_invoice_submission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fbr_invoice_submission (
    submission_id integer NOT NULL,
    bill_id integer NOT NULL,
    status character varying(12) DEFAULT 'queued'::character varying NOT NULL,
    fbr_invoice_number character varying(40),
    qr_payload text,
    error text,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    submitted_at timestamp without time zone,
    CONSTRAINT ck_fbr_status CHECK (((status)::text = ANY (ARRAY[('queued'::character varying)::text, ('submitted'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: fbr_invoice_submission_submission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fbr_invoice_submission_submission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fbr_invoice_submission_submission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fbr_invoice_submission_submission_id_seq OWNED BY public.fbr_invoice_submission.submission_id;


--
-- Name: finance_asset_purchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_asset_purchase (
    asset_purchase_id bigint NOT NULL,
    purchase_date date NOT NULL,
    asset_name character varying(180) NOT NULL,
    asset_category character varying(80) NOT NULL,
    amount numeric(12,2) NOT NULL,
    vendor_name character varying(120),
    reference_no character varying(120),
    useful_life_months integer,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: finance_asset_purchase_asset_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.finance_asset_purchase_asset_purchase_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: finance_asset_purchase_asset_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.finance_asset_purchase_asset_purchase_id_seq OWNED BY public.finance_asset_purchase.asset_purchase_id;


--
-- Name: finance_expense_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_expense_category (
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: finance_expense_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_expense_entry (
    expense_id bigint NOT NULL,
    expense_date date NOT NULL,
    category character varying(60) NOT NULL,
    subcategory character varying(60),
    amount numeric(12,2) NOT NULL,
    vendor_name character varying(120),
    reference_no character varying(120),
    payment_mode character varying(40),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: finance_expense_entry_expense_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.finance_expense_entry_expense_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: finance_expense_entry_expense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.finance_expense_entry_expense_id_seq OWNED BY public.finance_expense_entry.expense_id;


--
-- Name: intake_output; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_output (
    io_id integer NOT NULL,
    admission_id integer NOT NULL,
    recorded_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    io_type character varying(10) NOT NULL,
    category character varying(40),
    volume_ml numeric DEFAULT 0 NOT NULL,
    recorded_by_staff_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_io_type CHECK (((io_type)::text = ANY (ARRAY[('intake'::character varying)::text, ('output'::character varying)::text]))),
    CONSTRAINT ck_io_volume_nonneg CHECK ((volume_ml >= (0)::numeric))
);


--
-- Name: intake_output_io_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.intake_output_io_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: intake_output_io_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.intake_output_io_id_seq OWNED BY public.intake_output.io_id;


--
-- Name: invoice_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_advance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_advance (
    advance_id integer NOT NULL,
    admission_id integer NOT NULL,
    amount numeric NOT NULL,
    payment_type character varying(20) DEFAULT 'CASH'::character varying NOT NULL,
    receipt_no character varying(60),
    received_by integer,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ip_advance_amount_pos CHECK ((amount > (0)::numeric)),
    CONSTRAINT ck_ip_advance_payment_type CHECK (((payment_type)::text = ANY (ARRAY[('CASH'::character varying)::text, ('CARD'::character varying)::text, ('INSURANCE'::character varying)::text, ('MOBILE'::character varying)::text, ('SPLIT'::character varying)::text])))
);


--
-- Name: ip_advance_advance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ip_advance_advance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_advance_advance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ip_advance_advance_id_seq OWNED BY public.ip_advance.advance_id;


--
-- Name: ip_charge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_charge (
    charge_id integer NOT NULL,
    admission_id integer NOT NULL,
    charge_type character varying(20) NOT NULL,
    description text,
    qty numeric DEFAULT 1 NOT NULL,
    unit_rate numeric DEFAULT 0 NOT NULL,
    amount numeric NOT NULL,
    source_ref character varying(80),
    posted_by integer,
    posted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ip_charge_qty_nonneg CHECK ((qty >= (0)::numeric)),
    CONSTRAINT ck_ip_charge_rate_nonneg CHECK ((unit_rate >= (0)::numeric)),
    CONSTRAINT ck_ip_charge_type CHECK (((charge_type)::text = ANY (ARRAY[('room_rent'::character varying)::text, ('nursing'::character varying)::text, ('doctor_visit'::character varying)::text, ('service'::character varying)::text, ('pharmacy'::character varying)::text, ('procedure'::character varying)::text, ('consumable'::character varying)::text, ('lab'::character varying)::text, ('adjustment'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: ip_charge_charge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ip_charge_charge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_charge_charge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ip_charge_charge_id_seq OWNED BY public.ip_charge.charge_id;


--
-- Name: ip_final_bill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_final_bill (
    admission_id integer NOT NULL,
    gross_amount numeric DEFAULT 0 NOT NULL,
    discount_amount numeric DEFAULT 0 NOT NULL,
    advance_adjusted numeric DEFAULT 0 NOT NULL,
    net_due numeric DEFAULT 0 NOT NULL,
    settled boolean DEFAULT false NOT NULL,
    settled_at timestamp without time zone,
    settled_by integer,
    gate_pass_no character varying(60),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ip_final_nonneg CHECK (((gross_amount >= (0)::numeric) AND (discount_amount >= (0)::numeric) AND (advance_adjusted >= (0)::numeric)))
);


--
-- Name: lab_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_order (
    order_id integer NOT NULL,
    visit_id integer NOT NULL,
    test_id integer NOT NULL,
    ordered_by integer NOT NULL,
    performed_by integer,
    status character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    urgency character varying(50) DEFAULT 'Routine'::character varying NOT NULL,
    results_entered_at timestamp without time zone,
    results_entered_by integer,
    finalized_at timestamp without time zone,
    finalized_by integer,
    sample_collected_at timestamp without time zone,
    sample_collected_by integer,
    specimen_type character varying(100),
    CONSTRAINT lab_order_status_check CHECK (((status)::text = ANY (ARRAY['Pending'::text, 'Collected'::text, 'Performed'::text, 'Completed'::text]))),
    CONSTRAINT lab_order_urgency_check CHECK (((urgency)::text = ANY (ARRAY[('STAT'::character varying)::text, ('Urgent'::character varying)::text, ('Routine'::character varying)::text, ('Timed'::character varying)::text])))
);


--
-- Name: lab_order_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_order_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_order_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_order_order_id_seq OWNED BY public.lab_order.order_id;


--
-- Name: lab_result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_result (
    order_id integer NOT NULL,
    lab_result text,
    reported_by integer NOT NULL,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    result_id integer NOT NULL
);


--
-- Name: lab_result_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_result_approvals (
    approval_id integer NOT NULL,
    order_id integer NOT NULL,
    approved_by integer NOT NULL,
    approval_status character varying(20) DEFAULT 'pending'::character varying,
    approval_notes text,
    approved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    signature_data text
);


--
-- Name: lab_result_approvals_approval_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_result_approvals_approval_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_result_approvals_approval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_result_approvals_approval_id_seq OWNED BY public.lab_result_approvals.approval_id;


--
-- Name: lab_result_result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_result_result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_result_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_result_result_id_seq OWNED BY public.lab_result.result_id;


--
-- Name: lab_test; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test (
    test_id integer NOT NULL,
    test_name character varying(100) NOT NULL,
    category character varying(50),
    price numeric(10,2),
    description text
);


--
-- Name: lab_test_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_parameters (
    parameter_id integer NOT NULL,
    test_id integer NOT NULL,
    parameter_name character varying(100) NOT NULL,
    parameter_code character varying(50),
    unit character varying(50),
    input_type character varying(20) DEFAULT 'number'::character varying,
    reference_range_min numeric(10,2),
    reference_range_max numeric(10,2),
    reference_value_text text,
    display_order integer DEFAULT 0,
    is_critical boolean DEFAULT false,
    is_required boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lab_test_parameters_parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_test_parameters_parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_test_parameters_parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_test_parameters_parameter_id_seq OWNED BY public.lab_test_parameters.parameter_id;


--
-- Name: lab_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_results (
    result_id integer NOT NULL,
    order_id integer NOT NULL,
    parameter_id integer NOT NULL,
    result_value character varying(255),
    is_abnormal boolean DEFAULT false,
    technician_notes text,
    entered_by integer,
    entered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verified_by integer,
    verified_at timestamp without time zone
);


--
-- Name: lab_test_results_result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_test_results_result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_test_results_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_test_results_result_id_seq OWNED BY public.lab_test_results.result_id;


--
-- Name: leave_employee_quota_override; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_employee_quota_override (
    override_id bigint NOT NULL,
    account_type character varying(20) NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    leave_type_id integer NOT NULL,
    annual_quota numeric(8,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT leave_employee_override_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text]))),
    CONSTRAINT leave_employee_override_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))))
);


--
-- Name: leave_employee_quota_override_override_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_employee_quota_override_override_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_employee_quota_override_override_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_employee_quota_override_override_id_seq OWNED BY public.leave_employee_quota_override.override_id;


--
-- Name: leave_role_quota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_role_quota (
    role_quota_id bigint NOT NULL,
    role_name character varying(80) NOT NULL,
    leave_type_id integer NOT NULL,
    annual_quota numeric(8,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: leave_role_quota_role_quota_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_role_quota_role_quota_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_role_quota_role_quota_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_role_quota_role_quota_id_seq OWNED BY public.leave_role_quota.role_quota_id;


--
-- Name: medication_administration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_administration (
    mar_id integer NOT NULL,
    med_order_id integer NOT NULL,
    scheduled_dt timestamp without time zone,
    action character varying(10) NOT NULL,
    administered_dt timestamp without time zone,
    administered_by_staff_id integer,
    dose_given character varying(80),
    route character varying(40),
    reason text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_mar_action CHECK (((action)::text = ANY (ARRAY[('given'::character varying)::text, ('refused'::character varying)::text, ('held'::character varying)::text, ('skipped'::character varying)::text, ('missed'::character varying)::text]))),
    CONSTRAINT ck_mar_given_complete CHECK ((((action)::text <> 'given'::text) OR ((administered_by_staff_id IS NOT NULL) AND (administered_dt IS NOT NULL))))
);


--
-- Name: medication_administration_mar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medication_administration_mar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medication_administration_mar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medication_administration_mar_id_seq OWNED BY public.medication_administration.mar_id;


--
-- Name: medication_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_order (
    med_order_id integer NOT NULL,
    order_id integer NOT NULL,
    medicine_id integer,
    drug_name character varying(200) NOT NULL,
    dose character varying(80),
    route character varying(40),
    frequency character varying(80),
    schedule_times text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: medication_order_med_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medication_order_med_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medication_order_med_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medication_order_med_order_id_seq OWNED BY public.medication_order.med_order_id;


--
-- Name: medicine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine (
    medicine_id integer NOT NULL,
    generic_name character varying(100) NOT NULL,
    brand_name character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    dosage_value numeric(10,2),
    dosage_unit character varying(20),
    form character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    barcode character varying(50),
    sku character varying(50),
    manufacturer character varying(100),
    min_stock_level integer DEFAULT 10,
    max_stock_level integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    requires_prescription boolean DEFAULT false,
    search_vector tsvector,
    sub_unit character varying(20),
    sub_units_per_unit integer,
    sub_unit_price numeric(10,2),
    allow_sub_unit_sale boolean DEFAULT false,
    category_id integer,
    manufacturer_id integer,
    form_id integer,
    is_controlled boolean DEFAULT false NOT NULL,
    controlled_schedule character varying(20)
);


--
-- Name: medicine_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_batch (
    batch_id integer NOT NULL,
    medicine_id integer,
    stock_quantity integer,
    stock_sub_quantity integer,
    purchase_price numeric(10,2),
    purchase_sub_unit_price numeric(10,2),
    sale_price numeric(10,2),
    sale_sub_unit_price numeric(10,2),
    expiry_date date,
    batch_number text,
    received_date timestamp without time zone DEFAULT now(),
    party_id integer,
    batch_code text DEFAULT public.generate_batch_code() NOT NULL,
    CONSTRAINT ck_purchase_price_nonneg CHECK ((purchase_price >= (0)::numeric)),
    CONSTRAINT ck_purchase_sub_unit_price_nonneg CHECK ((purchase_sub_unit_price >= (0)::numeric)),
    CONSTRAINT ck_sale_price_nonneg CHECK ((sale_price >= (0)::numeric)),
    CONSTRAINT ck_sale_sub_unit_price_nonneg CHECK ((sale_sub_unit_price >= (0)::numeric)),
    CONSTRAINT ck_stock_qty_non_negative CHECK ((stock_quantity >= 0)),
    CONSTRAINT ck_sub_stock_qty_non_negative CHECK ((stock_sub_quantity >= 0))
);


--
-- Name: medicine_batch_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_batch_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_batch_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_batch_batch_id_seq OWNED BY public.medicine_batch.batch_id;


--
-- Name: medicine_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_category (
    category_id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: medicine_category_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.medicine_category ALTER COLUMN category_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.medicine_category_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: medicine_form; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_form (
    form_id integer NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: medicine_form_form_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.medicine_form ALTER COLUMN form_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.medicine_form_form_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: medicine_manufacturer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_manufacturer (
    manufacturer_id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: medicine_manufacturer_manufacturer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.medicine_manufacturer ALTER COLUMN manufacturer_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.medicine_manufacturer_manufacturer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: medicine_medicine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_medicine_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_medicine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_medicine_id_seq OWNED BY public.medicine.medicine_id;


--
-- Name: medicine_purchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_purchase (
    purchase_id integer NOT NULL,
    party_id integer NOT NULL,
    invoice_no character varying(100) DEFAULT public.generate_invoice_no() NOT NULL,
    invoice_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_amount numeric(10,2),
    payment_status character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    paid_amount numeric(10,2) DEFAULT 0,
    CONSTRAINT medicine_purchase_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('Paid'::character varying)::text, ('Unpaid'::character varying)::text, ('Partial'::character varying)::text])))
);


--
-- Name: medicine_purchase_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_purchase_detail (
    id integer NOT NULL,
    purchase_id integer NOT NULL,
    medicine_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(10,2),
    sub_quantity integer DEFAULT 0,
    sub_unit_cost numeric(10,1) DEFAULT 0,
    batch_id integer
);


--
-- Name: medicine_purchase_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_purchase_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_purchase_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_purchase_detail_id_seq OWNED BY public.medicine_purchase_detail.id;


--
-- Name: medicine_purchase_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_purchase_purchase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_purchase_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_purchase_purchase_id_seq OWNED BY public.medicine_purchase.purchase_id;


--
-- Name: medicine_transaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicine_transaction (
    txn_id integer NOT NULL,
    medicine_id integer NOT NULL,
    txn_type character varying(100),
    quantity integer NOT NULL,
    amount_per_unit numeric(10,2) NOT NULL,
    ref_purchase_id integer,
    ref_sale_id integer,
    ref_purchase_return integer,
    ref_sale_return integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sub_quantity integer DEFAULT 0,
    batch_id integer,
    CONSTRAINT medicine_transaction_txn_type_check CHECK (((txn_type)::text = ANY (ARRAY[('purchase'::character varying)::text, ('sale'::character varying)::text, ('purchase_return'::character varying)::text, ('sale_return'::character varying)::text, ('adjustment'::character varying)::text])))
);


--
-- Name: medicine_transaction_txn_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicine_transaction_txn_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicine_transaction_txn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicine_transaction_txn_id_seq OWNED BY public.medicine_transaction.txn_id;


--
-- Name: menstrual_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menstrual_history (
    menstrual_history_id integer NOT NULL,
    patient_id integer NOT NULL,
    menarch_age integer,
    cycle_length_days integer,
    bleeding_days integer,
    menstrual_regular boolean,
    contraception_history text,
    gynecologic_surgeries text,
    medical_conditions text,
    menopause_status boolean,
    notes text
);


--
-- Name: menstrual_history_menstrual_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menstrual_history_menstrual_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menstrual_history_menstrual_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menstrual_history_menstrual_history_id_seq OWNED BY public.menstrual_history.menstrual_history_id;


--
-- Name: notification_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_outbox (
    notification_id integer NOT NULL,
    channel character varying(15) NOT NULL,
    recipient character varying(120) NOT NULL,
    template character varying(60) NOT NULL,
    payload jsonb,
    status character varying(12) DEFAULT 'queued'::character varying NOT NULL,
    related_entity character varying(80),
    error text,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sent_at timestamp without time zone,
    CONSTRAINT ck_notif_channel CHECK (((channel)::text = ANY (ARRAY[('sms'::character varying)::text, ('whatsapp'::character varying)::text, ('email'::character varying)::text]))),
    CONSTRAINT ck_notif_status CHECK (((status)::text = ANY (ARRAY[('queued'::character varying)::text, ('sent'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: notification_outbox_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_outbox_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_outbox_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_outbox_notification_id_seq OWNED BY public.notification_outbox.notification_id;


--
-- Name: nursing_note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_note (
    note_id integer NOT NULL,
    admission_id integer NOT NULL,
    shift character varying(20),
    note_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    author_staff_id integer,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: nursing_note_note_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_note_note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_note_note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_note_note_id_seq OWNED BY public.nursing_note.note_id;


--
-- Name: obstetric_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.obstetric_history (
    obstetric_history_id integer NOT NULL,
    patient_id integer NOT NULL,
    is_first_pregnancy boolean,
    married_years integer,
    gravida integer,
    para integer,
    abortions integer,
    edd date,
    last_menstrual_cycle date,
    notes text
);


--
-- Name: obstetric_history_obstetric_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.obstetric_history_obstetric_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: obstetric_history_obstetric_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.obstetric_history_obstetric_history_id_seq OWNED BY public.obstetric_history.obstetric_history_id;


--
-- Name: para_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.para_details (
    para_id integer NOT NULL,
    obstetric_history_id integer NOT NULL,
    para_number integer,
    birth_year integer,
    birth_month integer,
    gender character varying(20),
    delivery_type character varying(50),
    alive boolean,
    birth_weight_grams integer,
    complications text,
    notes text,
    gestational_age_weeks integer,
    CONSTRAINT para_details_gender_check CHECK (((gender)::text = ANY (ARRAY[('Male'::character varying)::text, ('Female'::character varying)::text])))
);


--
-- Name: para_details_para_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.para_details_para_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: para_details_para_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.para_details_para_id_seq OWNED BY public.para_details.para_id;


--
-- Name: party; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party (
    party_id integer NOT NULL,
    name character varying(100) NOT NULL,
    contact_number character varying(200),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(255),
    gst_number character varying(100),
    status boolean DEFAULT true
);


--
-- Name: party_party_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.party_party_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: party_party_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.party_party_id_seq OWNED BY public.party.party_id;


--
-- Name: party_payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_payment (
    payment_id integer NOT NULL,
    party_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payment_method character varying(50),
    reference_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer
);


--
-- Name: party_payment_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.party_payment_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: party_payment_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.party_payment_payment_id_seq OWNED BY public.party_payment.payment_id;


--
-- Name: patient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient (
    patient_id integer NOT NULL,
    patient_name character varying(100) NOT NULL,
    age integer,
    gender character varying(26),
    contact_number character varying(20),
    cnic character varying(20),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_gender_check CHECK (((gender)::text = ANY (ARRAY[('Male'::character varying)::text, ('Female'::character varying)::text, ('Other'::character varying)::text])))
);


--
-- Name: patient_allergy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_allergy (
    allergy_id integer NOT NULL,
    patient_id integer NOT NULL,
    allergen character varying(160) NOT NULL,
    reaction text,
    severity character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    noted_by integer,
    noted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_allergy_severity CHECK (((severity)::text = ANY (ARRAY[('mild'::character varying)::text, ('moderate'::character varying)::text, ('severe'::character varying)::text, ('unknown'::character varying)::text])))
);


--
-- Name: patient_allergy_allergy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_allergy_allergy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_allergy_allergy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_allergy_allergy_id_seq OWNED BY public.patient_allergy.allergy_id;


--
-- Name: patient_patient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_patient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_patient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_patient_id_seq OWNED BY public.patient.patient_id;


--
-- Name: patient_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_vitals (
    vital_id integer NOT NULL,
    visit_id integer,
    blood_pressure character varying(20),
    heart_rate integer,
    temperature integer,
    weight integer,
    height integer,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blood_group character varying(20),
    admission_id integer,
    CONSTRAINT ck_vitals_anchor CHECK (((visit_id IS NOT NULL) OR (admission_id IS NOT NULL))),
    CONSTRAINT patient_vitals_blood_group_check CHECK (((blood_group)::text = ANY (ARRAY[('A+'::character varying)::text, ('A-'::character varying)::text, ('B+'::character varying)::text, ('B-'::character varying)::text, ('O+'::character varying)::text, ('O-'::character varying)::text, ('AB+'::character varying)::text, ('AB-'::character varying)::text])))
);


--
-- Name: patient_vitals_vital_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_vitals_vital_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_vitals_vital_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_vitals_vital_id_seq OWNED BY public.patient_vitals.vital_id;


--
-- Name: payroll_line_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_line_item (
    payroll_line_id bigint NOT NULL,
    payroll_run_id bigint NOT NULL,
    account_type character varying(20) NOT NULL,
    person_id integer NOT NULL,
    staff_id integer,
    doctor_id integer,
    salary_model character varying(30) NOT NULL,
    base_amount numeric(12,2) DEFAULT 0 NOT NULL,
    patient_count integer DEFAULT 0 NOT NULL,
    per_patient_fee numeric(12,2) DEFAULT 0 NOT NULL,
    allowance_total numeric(12,2) DEFAULT 0 NOT NULL,
    deduction_total numeric(12,2) DEFAULT 0 NOT NULL,
    adjustment_total numeric(12,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(12,2) DEFAULT 0 NOT NULL,
    net_amount numeric(12,2) DEFAULT 0 NOT NULL,
    calc_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payroll_line_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text]))),
    CONSTRAINT payroll_line_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id)))),
    CONSTRAINT payroll_line_salary_model_check CHECK (((salary_model)::text = ANY (ARRAY[('fixed_monthly'::character varying)::text, ('per_patient_seen'::character varying)::text])))
);


--
-- Name: payroll_line_item_payroll_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payroll_line_item_payroll_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payroll_line_item_payroll_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payroll_line_item_payroll_line_id_seq OWNED BY public.payroll_line_item.payroll_line_id;


--
-- Name: payroll_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_run (
    payroll_run_id bigint NOT NULL,
    period_month date NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    generated_by integer,
    finalized_by integer,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finalized_at timestamp without time zone,
    notes text,
    CONSTRAINT payroll_run_month_first_day_check CHECK (((date_trunc('month'::text, (period_month)::timestamp with time zone))::date = period_month)),
    CONSTRAINT payroll_run_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('finalized'::character varying)::text, ('void'::character varying)::text])))
);


--
-- Name: payroll_run_payroll_run_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payroll_run_payroll_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payroll_run_payroll_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payroll_run_payroll_run_id_seq OWNED BY public.payroll_run.payroll_run_id;


--
-- Name: pharmacy_customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_customer (
    customer_id integer NOT NULL,
    name character varying(100),
    phone character varying(20),
    email character varying(100),
    address text,
    loyalty_points integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_purchase_date timestamp without time zone
);


--
-- Name: pharmacy_customer_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pharmacy_customer_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pharmacy_customer_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pharmacy_customer_customer_id_seq OWNED BY public.pharmacy_customer.customer_id;


--
-- Name: pharmacy_sale_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_sale_detail (
    pharmacy_sale_detail_id integer NOT NULL,
    sale_id integer NOT NULL,
    medicine_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_sale_price numeric(10,2),
    line_total numeric(10,2),
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    sub_unit_sale_price numeric(10,2),
    sub_quantity integer DEFAULT 0,
    batch_id integer,
    prescription_medicine_id integer,
    reason_code text,
    reason_note text,
    handled_by integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT check_total_price CHECK ((line_total = round(((((quantity)::numeric * unit_sale_price) + ((sub_quantity)::numeric * COALESCE(sub_unit_sale_price, (0)::numeric))) - discount_amount), 2)))
);


--
-- Name: pharmacy_sale_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pharmacy_sale_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pharmacy_sale_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pharmacy_sale_detail_id_seq OWNED BY public.pharmacy_sale_detail.pharmacy_sale_detail_id;


--
-- Name: pharmacy_sale_sale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pharmacy_sale_sale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pharmacy_sale_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pharmacy_sale_sale_id_seq OWNED BY public.pharmacy_sale.sale_id;


--
-- Name: pos_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_audit_log (
    log_id integer NOT NULL,
    staff_id integer,
    action_type character varying(50) NOT NULL,
    sale_id integer,
    description text,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pos_audit_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pos_audit_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pos_audit_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pos_audit_log_log_id_seq OWNED BY public.pos_audit_log.log_id;


--
-- Name: pos_held_transaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_held_transaction (
    hold_id integer NOT NULL,
    staff_id integer NOT NULL,
    customer_name character varying(100),
    customer_phone character varying(20),
    hold_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    retrieved_timestamp timestamp without time zone,
    total_amount numeric(10,2),
    status character varying(20) DEFAULT 'held'::character varying,
    notes text,
    CONSTRAINT pos_held_status_check CHECK (((status)::text = ANY (ARRAY[('held'::character varying)::text, ('retrieved'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: pos_held_transaction_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_held_transaction_detail (
    detail_id integer NOT NULL,
    hold_id integer NOT NULL,
    medicine_id integer NOT NULL,
    qty integer NOT NULL,
    sub_qty integer DEFAULT 0,
    unit_price numeric(10,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    line_total numeric(10,2) NOT NULL
);


--
-- Name: pos_held_transaction_detail_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pos_held_transaction_detail_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pos_held_transaction_detail_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pos_held_transaction_detail_detail_id_seq OWNED BY public.pos_held_transaction_detail.detail_id;


--
-- Name: pos_held_transaction_hold_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pos_held_transaction_hold_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pos_held_transaction_hold_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pos_held_transaction_hold_id_seq OWNED BY public.pos_held_transaction.hold_id;


--
-- Name: pos_receipt_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_receipt_config (
    config_id integer NOT NULL,
    clinic_name character varying(200) NOT NULL,
    clinic_address text,
    clinic_phone character varying(50),
    clinic_email character varying(100),
    tax_registration_number character varying(50),
    receipt_header text,
    receipt_footer text,
    logo_url text,
    printer_name character varying(100),
    paper_size character varying(20) DEFAULT '80mm'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pos_receipt_config_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pos_receipt_config_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pos_receipt_config_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pos_receipt_config_config_id_seq OWNED BY public.pos_receipt_config.config_id;


--
-- Name: pos_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_session (
    session_id integer NOT NULL,
    staff_id integer NOT NULL,
    opening_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closing_time timestamp without time zone,
    opening_balance numeric(10,2) DEFAULT 0 NOT NULL,
    closing_balance numeric(10,2),
    expected_balance numeric(10,2),
    cash_sales_total numeric(10,2) DEFAULT 0,
    card_sales_total numeric(10,2) DEFAULT 0,
    total_sales_count integer DEFAULT 0,
    notes text,
    status character varying(20) DEFAULT 'open'::character varying,
    CONSTRAINT pos_session_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: pos_session_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pos_session_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pos_session_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pos_session_session_id_seq OWNED BY public.pos_session.session_id;


--
-- Name: prescription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription (
    prescription_id integer NOT NULL,
    visit_id integer NOT NULL,
    doctor_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: prescription_fulfillment_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_fulfillment_action (
    fulfillment_action_id bigint NOT NULL,
    prescription_medicine_id integer NOT NULL,
    prescription_id integer NOT NULL,
    visit_id integer NOT NULL,
    patient_id integer NOT NULL,
    available_quantity_at_action integer DEFAULT 0 NOT NULL,
    action_type text NOT NULL,
    reason_code text,
    reason_note text,
    override_sale_price numeric(12,2),
    override_quantity integer,
    handled_by integer,
    handled_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: prescription_fulfillment_action_fulfillment_action_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prescription_fulfillment_action ALTER COLUMN fulfillment_action_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prescription_fulfillment_action_fulfillment_action_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prescription_medicines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_medicines (
    prescription_medicine_id integer NOT NULL,
    prescription_id integer NOT NULL,
    medicine_id integer NOT NULL,
    duration character varying(50),
    instructions text,
    dispensed_by integer,
    frequency character varying(50),
    prescribed_quantity integer,
    dispensed_quantity integer,
    dispensed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    prescribed_sub_quantity integer DEFAULT 0,
    dispensed_sub_quantity integer DEFAULT 0,
    available_quantity_snapshot integer DEFAULT 0,
    availability_status text DEFAULT 'unknown'::text,
    availability_note text,
    dosage character varying(100)
);


--
-- Name: prescription_medicines_prescription_medicine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prescription_medicines_prescription_medicine_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prescription_medicines_prescription_medicine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescription_medicines_prescription_medicine_id_seq OWNED BY public.prescription_medicines.prescription_medicine_id;


--
-- Name: prescription_prescription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prescription_prescription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prescription_prescription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescription_prescription_id_seq OWNED BY public.prescription.prescription_id;


--
-- Name: purchase_return; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_return (
    return_id integer NOT NULL,
    purchase_id integer NOT NULL,
    reason text,
    return_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL
);


--
-- Name: purchase_return_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_return_detail (
    id integer NOT NULL,
    return_id integer NOT NULL,
    medicine_id integer NOT NULL,
    quantity integer NOT NULL,
    sub_quantity integer DEFAULT 0,
    returned_unit_price numeric(10,2),
    returned_sub_unit_price numeric(10,2),
    batch_id integer
);


--
-- Name: purchase_return_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_return_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_return_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_return_detail_id_seq OWNED BY public.purchase_return_detail.id;


--
-- Name: purchase_return_return_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_return_return_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_return_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_return_return_id_seq OWNED BY public.purchase_return.return_id;


--
-- Name: room; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room (
    room_id integer NOT NULL,
    ward_id integer NOT NULL,
    room_number character varying(40) NOT NULL,
    room_class character varying(30),
    default_daily_rate numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_room_rate_nonneg CHECK ((default_daily_rate >= (0)::numeric))
);


--
-- Name: room_room_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.room_room_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: room_room_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.room_room_id_seq OWNED BY public.room.room_id;


--
-- Name: sale_return; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_return (
    return_id integer NOT NULL,
    sale_id integer NOT NULL,
    reason text,
    return_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    refund_amount numeric DEFAULT 0 NOT NULL,
    refund_method character varying(50) DEFAULT 'CASH'::character varying NOT NULL,
    CONSTRAINT ck_sale_return_refund_method CHECK (((refund_method)::text = ANY (ARRAY[('CASH'::character varying)::text, ('CARD'::character varying)::text, ('INSURANCE'::character varying)::text, ('MOBILE'::character varying)::text, ('SPLIT'::character varying)::text]))),
    CONSTRAINT ck_sale_return_refund_nonneg CHECK ((refund_amount >= (0)::numeric))
);


--
-- Name: sale_return_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_return_detail (
    id integer NOT NULL,
    return_id integer NOT NULL,
    medicine_id integer NOT NULL,
    returned_quantity integer NOT NULL,
    returned_unit_price numeric(10,2),
    batch_id integer,
    returned_sub_quantity integer,
    returned_sub_unit_price numeric(10,2)
);


--
-- Name: sale_return_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_return_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_return_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_return_detail_id_seq OWNED BY public.sale_return_detail.id;


--
-- Name: sale_return_return_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_return_return_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_return_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_return_return_id_seq OWNED BY public.sale_return.return_id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    staff_id integer NOT NULL,
    user_code character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(50) NOT NULL,
    role character varying(50),
    education character varying(255),
    contact_number character varying(20),
    email character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    employment_status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    joined_at date,
    exited_at date,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    last_failed_login_at timestamp without time zone,
    account_locked_until timestamp without time zone,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password_reset_token character varying(128),
    password_reset_expires_at timestamp without time zone,
    mfa_enabled boolean DEFAULT false NOT NULL,
    session_version integer DEFAULT 1 NOT NULL,
    photo_url text,
    gender character varying(20),
    dob date,
    emergency_contact_name character varying(120),
    emergency_contact_number character varying(30),
    address_line_1 character varying(255),
    address_line_2 character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    national_id character varying(80),
    license_id character varying(80),
    department character varying(120),
    designation character varying(120),
    employment_type character varying(40),
    facility_code character varying(80),
    branch_code character varying(80),
    work_location character varying(150),
    reporting_manager_staff_id integer,
    staff_tags text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT staff_employment_status_check CHECK (((employment_status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'resigned'::text]))),
    CONSTRAINT staff_role_check CHECK (((role)::text = ANY (ARRAY['Receptionist'::text, 'Lab_Technician'::text, 'Admin'::text, 'Super Admin'::text, 'Cashier'::text, 'Pharmacist'::text, 'Nurse'::text, 'Doctor'::text, 'Front_Desk'::text, 'Billing'::text, 'Technician'::text, 'Housekeeping'::text])))
);


--
-- Name: staff_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_attendance (
    attendance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id integer,
    date date NOT NULL,
    check_in_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    check_out_time timestamp without time zone,
    status character varying(20) DEFAULT 'Present'::character varying,
    marked_by character varying(50),
    admin_id integer,
    shift_code character varying(50),
    check_in_source character varying(40),
    check_out_source character varying(40),
    late_minutes integer DEFAULT 0 NOT NULL,
    early_leave_minutes integer DEFAULT 0 NOT NULL,
    overtime_minutes integer DEFAULT 0 NOT NULL,
    break_minutes integer DEFAULT 0 NOT NULL,
    attendance_notes text,
    roster_id bigint,
    derived_status character varying(30) DEFAULT 'unscheduled'::character varying NOT NULL,
    is_unscheduled boolean DEFAULT true NOT NULL,
    is_on_time boolean DEFAULT false NOT NULL,
    policy_snapshot jsonb,
    CONSTRAINT staff_attendance_derived_status_check CHECK (((derived_status)::text = ANY (ARRAY['on_time'::text, 'late'::text, 'half_day'::text, 'early_leave'::text, 'overtime'::text, 'unscheduled'::text, 'absent'::text, 'leave'::text])))
);


--
-- Name: staff_leave_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave_approvals (
    approval_id bigint NOT NULL,
    leave_request_id bigint NOT NULL,
    level_no integer NOT NULL,
    approver_staff_id integer NOT NULL,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    note text,
    acted_at timestamp without time zone
);


--
-- Name: staff_leave_approvals_approval_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_leave_approvals_approval_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_leave_approvals_approval_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_leave_approvals_approval_id_seq OWNED BY public.staff_leave_approvals.approval_id;


--
-- Name: staff_leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave_balances (
    balance_id bigint NOT NULL,
    staff_id integer NOT NULL,
    leave_type_id integer NOT NULL,
    period_year integer NOT NULL,
    opening_balance numeric(8,2) DEFAULT 0 NOT NULL,
    accrued numeric(8,2) DEFAULT 0 NOT NULL,
    consumed numeric(8,2) DEFAULT 0 NOT NULL,
    adjusted numeric(8,2) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    account_type character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    person_id integer NOT NULL,
    doctor_id integer,
    CONSTRAINT staff_leave_balances_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text])))
);


--
-- Name: staff_leave_balances_balance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_leave_balances_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_leave_balances_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_leave_balances_balance_id_seq OWNED BY public.staff_leave_balances.balance_id;


--
-- Name: staff_leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave_requests (
    leave_request_id bigint NOT NULL,
    staff_id integer,
    leave_type_id integer NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    is_half_day boolean DEFAULT false NOT NULL,
    requested_hours numeric(6,2),
    reason text,
    attachment_url text,
    request_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    final_approver integer,
    final_decision_at timestamp without time zone,
    decision_note text,
    account_type character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    person_id integer NOT NULL,
    doctor_id integer,
    CONSTRAINT staff_leave_requests_employee_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))))
);


--
-- Name: staff_leave_requests_leave_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_leave_requests_leave_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_leave_requests_leave_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_leave_requests_leave_request_id_seq OWNED BY public.staff_leave_requests.leave_request_id;


--
-- Name: staff_leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave_types (
    leave_type_id integer NOT NULL,
    leave_code character varying(40) NOT NULL,
    leave_name character varying(100) NOT NULL,
    default_annual_quota numeric(8,2),
    is_paid boolean DEFAULT true NOT NULL,
    requires_attachment boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: staff_leave_types_leave_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_leave_types_leave_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_leave_types_leave_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_leave_types_leave_type_id_seq OWNED BY public.staff_leave_types.leave_type_id;


--
-- Name: staff_permission_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permission_audit (
    event_id bigint NOT NULL,
    policy_id bigint,
    actor_staff_id integer,
    event_type character varying(40) NOT NULL,
    before_json jsonb,
    after_json jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: staff_permission_audit_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_permission_audit_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_permission_audit_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_permission_audit_event_id_seq OWNED BY public.staff_permission_audit.event_id;


--
-- Name: staff_permission_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permission_policies (
    policy_id bigint NOT NULL,
    staff_id integer,
    role_id integer,
    module character varying(80) NOT NULL,
    action character varying(20) NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    scope_type character varying(20) DEFAULT 'global'::character varying NOT NULL,
    scope_value character varying(120),
    granted_by integer,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone,
    CONSTRAINT staff_permission_action_check CHECK (((action)::text = ANY (ARRAY['view'::text, 'create'::text, 'edit'::text, 'delete'::text, 'approve'::text, 'export'::text]))),
    CONSTRAINT staff_permission_scope_check CHECK (((scope_type)::text = ANY (ARRAY['global'::text, 'facility'::text, 'branch'::text, 'department'::text]))),
    CONSTRAINT staff_permission_target_check CHECK ((((staff_id IS NOT NULL) AND (role_id IS NULL)) OR ((staff_id IS NULL) AND (role_id IS NOT NULL))))
);


--
-- Name: staff_permission_policies_policy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_permission_policies_policy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_permission_policies_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_permission_policies_policy_id_seq OWNED BY public.staff_permission_policies.policy_id;


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permissions (
    permission_id integer NOT NULL,
    staff_id integer,
    module character varying(50) NOT NULL,
    can_read boolean DEFAULT true,
    can_write boolean DEFAULT false,
    can_delete boolean DEFAULT false
);


--
-- Name: staff_permissions_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_permissions_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_permissions_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_permissions_permission_id_seq OWNED BY public.staff_permissions.permission_id;


--
-- Name: staff_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_role_assignments (
    assignment_id bigint NOT NULL,
    staff_id integer NOT NULL,
    role_id integer NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    effective_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to timestamp without time zone,
    assigned_by integer,
    assignment_note text
);


--
-- Name: staff_role_assignments_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_role_assignments_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_role_assignments_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_role_assignments_assignment_id_seq OWNED BY public.staff_role_assignments.assignment_id;


--
-- Name: staff_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_roles (
    role_id integer NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name character varying(100) NOT NULL,
    is_system boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: staff_roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_roles_role_id_seq OWNED BY public.staff_roles.role_id;


--
-- Name: staff_roster_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_roster_assignments (
    roster_id bigint NOT NULL,
    staff_id integer,
    shift_template_id bigint NOT NULL,
    roster_date date NOT NULL,
    department character varying(120),
    ward character varying(120),
    unit character varying(120),
    on_call boolean DEFAULT false NOT NULL,
    standby boolean DEFAULT false NOT NULL,
    assignment_status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    assigned_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    account_type character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    person_id integer NOT NULL,
    doctor_id integer,
    CONSTRAINT staff_roster_assignments_employee_ref_check CHECK (((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))))
);


--
-- Name: staff_roster_assignments_roster_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_roster_assignments_roster_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_roster_assignments_roster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_roster_assignments_roster_id_seq OWNED BY public.staff_roster_assignments.roster_id;


--
-- Name: staff_security_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_security_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id integer NOT NULL,
    user_code character varying(50) NOT NULL,
    role character varying(50) NOT NULL,
    login_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address character varying(45),
    user_agent text,
    revoked_at timestamp without time zone,
    revoked_reason character varying(120)
);


--
-- Name: staff_shift_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_shift_templates (
    shift_template_id bigint NOT NULL,
    shift_code character varying(50) NOT NULL,
    shift_name character varying(120) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_night_shift boolean DEFAULT false NOT NULL,
    is_split_shift boolean DEFAULT false NOT NULL,
    department character varying(120),
    facility_code character varying(80),
    branch_code character varying(80),
    max_staff integer,
    min_staff integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: staff_shift_templates_shift_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_shift_templates_shift_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_shift_templates_shift_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_shift_templates_shift_template_id_seq OWNED BY public.staff_shift_templates.shift_template_id;


--
-- Name: staff_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_staff_id_seq OWNED BY public.staff.staff_id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    setting_key character varying(100) NOT NULL,
    setting_value jsonb,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


--
-- Name: v_daily_sales_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_daily_sales_summary AS
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
   FROM public.pharmacy_sale ps
  WHERE ((status)::text = 'Completed'::text)
  GROUP BY (date(sale_timestamp))
  ORDER BY (date(sale_timestamp)) DESC;


--
-- Name: v_ip_running_bill; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ip_running_bill AS
 SELECT admission_id,
    admission_no,
    patient_id,
    status,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM public.ip_charge c
          WHERE (c.admission_id = a.admission_id)), (0)::numeric) AS total_charges,
    COALESCE(( SELECT sum(v.amount) AS sum
           FROM public.ip_advance v
          WHERE (v.admission_id = a.admission_id)), (0)::numeric) AS total_advances,
    (COALESCE(( SELECT sum(c.amount) AS sum
           FROM public.ip_charge c
          WHERE (c.admission_id = a.admission_id)), (0)::numeric) - COALESCE(( SELECT sum(v.amount) AS sum
           FROM public.ip_advance v
          WHERE (v.admission_id = a.admission_id)), (0)::numeric)) AS balance_due
   FROM public.admission a;


--
-- Name: v_low_stock_medicines; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_low_stock_medicines AS
 WITH aggregate_stock AS (
         SELECT mb.medicine_id,
            sum(((mb.stock_quantity * COALESCE(( SELECT m_1.sub_units_per_unit
                   FROM public.medicine m_1
                  WHERE (m_1.medicine_id = mb.medicine_id)), 1)) + COALESCE(mb.stock_sub_quantity, 0))) AS total_sub_units
           FROM public.medicine_batch mb
          WHERE ((mb.expiry_date > CURRENT_DATE) OR (mb.expiry_date IS NULL))
          GROUP BY mb.medicine_id
        )
 SELECT m.medicine_id,
    m.brand_name,
    m.generic_name,
    m.category,
    m.min_stock_level,
    public.get_stock_display(m.medicine_id) AS stock_display
   FROM (public.medicine m
     LEFT JOIN aggregate_stock ast ON ((m.medicine_id = ast.medicine_id)))
  WHERE ((m.is_active = true) AND (COALESCE(ast.total_sub_units, (0)::bigint) <= ((m.min_stock_level * COALESCE(m.sub_units_per_unit, 1)))::bigint))
  ORDER BY COALESCE(ast.total_sub_units, (0)::bigint);


--
-- Name: v_medicine_pos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_medicine_pos AS
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
   FROM (public.medicine m
     LEFT JOIN public.medicine_batch mb ON ((m.medicine_id = mb.medicine_id)))
  WHERE ((m.is_active = true) AND ((mb.expiry_date > CURRENT_DATE) OR (mb.expiry_date IS NULL)));


--
-- Name: v_narcotics_register; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narcotics_register AS
 SELECT psd.created_at AS movement_at,
    'dispense'::text AS movement_type,
    m.medicine_id,
    m.generic_name,
    m.brand_name,
    m.controlled_schedule,
    psd.batch_id,
    psd.quantity AS qty_units,
    COALESCE(psd.sub_quantity, 0) AS qty_sub_units,
    s.sale_id,
    s.visit_id,
    s.handled_by AS staff_id
   FROM ((public.pharmacy_sale_detail psd
     JOIN public.medicine m ON (((m.medicine_id = psd.medicine_id) AND m.is_controlled)))
     JOIN public.pharmacy_sale s ON ((s.sale_id = psd.sale_id)))
UNION ALL
 SELECT sr.return_timestamp AS movement_at,
    'return'::text AS movement_type,
    m.medicine_id,
    m.generic_name,
    m.brand_name,
    m.controlled_schedule,
    srd.batch_id,
    srd.returned_quantity AS qty_units,
    COALESCE(srd.returned_sub_quantity, 0) AS qty_sub_units,
    sr.sale_id,
    NULL::integer AS visit_id,
    sr.created_by AS staff_id
   FROM ((public.sale_return_detail srd
     JOIN public.medicine m ON (((m.medicine_id = srd.medicine_id) AND m.is_controlled)))
     JOIN public.sale_return sr ON ((sr.return_id = srd.return_id)));


--
-- Name: visit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit (
    visit_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    visit_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    visit_type character varying(50),
    clinic_number integer,
    status character varying(50),
    reason text,
    is_deleted boolean DEFAULT false,
    CONSTRAINT visit_status_check CHECK (((status)::text = ANY (ARRAY[('waiting'::character varying)::text, ('seen_by_doctor'::character varying)::text, ('dispensing'::character varying)::text, ('medicines_dispensed'::character varying)::text, ('lab_tests_done'::character varying)::text, ('payment_done'::character varying)::text, ('completed'::character varying)::text, ('admitted'::character varying)::text, ('discharged'::character varying)::text]))),
    CONSTRAINT visit_visit_type_check CHECK (((visit_type)::text = ANY (ARRAY[('OPD'::character varying)::text, ('Emergency'::character varying)::text])))
);


--
-- Name: visit_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_status_history (
    visit_status_id integer NOT NULL,
    visit_id integer NOT NULL,
    status character varying(100),
    updated_by_doctor integer,
    updated_by_staff integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT visit_status_history_status_check CHECK (((status)::text = ANY (ARRAY['waiting'::text, 'seen_by_doctor'::text, 'dispensing'::text, 'medicines_dispensed'::text, 'lab_tests_done'::text, 'payment_done'::text, 'completed'::text, 'admitted'::text, 'discharged'::text])))
);


--
-- Name: visit_status_history_visit_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visit_status_history_visit_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visit_status_history_visit_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visit_status_history_visit_status_id_seq OWNED BY public.visit_status_history.visit_status_id;


--
-- Name: visit_visit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visit_visit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visit_visit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visit_visit_id_seq OWNED BY public.visit.visit_id;


--
-- Name: ward; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ward (
    ward_id integer NOT NULL,
    name character varying(120) NOT NULL,
    ward_type character varying(30) DEFAULT 'general'::character varying NOT NULL,
    block character varying(60),
    floor character varying(60),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ward_type CHECK (((ward_type)::text = ANY (ARRAY[('general'::character varying)::text, ('semi_private'::character varying)::text, ('private'::character varying)::text, ('icu'::character varying)::text, ('nicu'::character varying)::text, ('hdu'::character varying)::text, ('isolation'::character varying)::text, ('nursery'::character varying)::text, ('maternity'::character varying)::text])))
);


--
-- Name: ward_ward_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ward_ward_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ward_ward_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ward_ward_id_seq OWNED BY public.ward.ward_id;


--
-- Name: admission admission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission ALTER COLUMN admission_id SET DEFAULT nextval('public.admission_admission_id_seq'::regclass);


--
-- Name: appointment appointment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment ALTER COLUMN appointment_id SET DEFAULT nextval('public.appointment_appointment_id_seq'::regclass);


--
-- Name: attendance_regularization_requests regularization_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_regularization_requests ALTER COLUMN regularization_id SET DEFAULT nextval('public.attendance_regularization_requests_regularization_id_seq'::regclass);


--
-- Name: bed bed_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed ALTER COLUMN bed_id SET DEFAULT nextval('public.bed_bed_id_seq'::regclass);


--
-- Name: bed_transfer transfer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfer ALTER COLUMN transfer_id SET DEFAULT nextval('public.bed_transfer_transfer_id_seq'::regclass);


--
-- Name: bill bill_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill ALTER COLUMN bill_id SET DEFAULT nextval('public.bill_bill_id_seq'::regclass);


--
-- Name: bill_item item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_item ALTER COLUMN item_id SET DEFAULT nextval('public.bill_item_item_id_seq'::regclass);


--
-- Name: current_pregnancy pregnancy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.current_pregnancy ALTER COLUMN pregnancy_id SET DEFAULT nextval('public.current_pregnancy_pregnancy_id_seq'::regclass);


--
-- Name: doctor doctor_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor ALTER COLUMN doctor_id SET DEFAULT nextval('public.doctor_doctor_id_seq'::regclass);


--
-- Name: doctor_order order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_order ALTER COLUMN order_id SET DEFAULT nextval('public.doctor_order_order_id_seq'::regclass);


--
-- Name: employee_allowance allowance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_allowance ALTER COLUMN allowance_id SET DEFAULT nextval('public.employee_allowance_allowance_id_seq'::regclass);


--
-- Name: employee_compensation_profile compensation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_compensation_profile ALTER COLUMN compensation_id SET DEFAULT nextval('public.employee_compensation_profile_compensation_id_seq'::regclass);


--
-- Name: employee_credential_events credential_event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_events ALTER COLUMN credential_event_id SET DEFAULT nextval('public.employee_credential_events_credential_event_id_seq'::regclass);


--
-- Name: employee_credential_types credential_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_types ALTER COLUMN credential_type_id SET DEFAULT nextval('public.employee_credential_types_credential_type_id_seq'::regclass);


--
-- Name: employee_credentials credential_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials ALTER COLUMN credential_id SET DEFAULT nextval('public.employee_credentials_credential_id_seq'::regclass);


--
-- Name: employee_document_requirements requirement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_requirements ALTER COLUMN requirement_id SET DEFAULT nextval('public.employee_document_requirements_requirement_id_seq'::regclass);


--
-- Name: employee_document_reviews document_review_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_reviews ALTER COLUMN document_review_id SET DEFAULT nextval('public.employee_document_reviews_document_review_id_seq'::regclass);


--
-- Name: employee_document_types document_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_types ALTER COLUMN document_type_id SET DEFAULT nextval('public.employee_document_types_document_type_id_seq'::regclass);


--
-- Name: employee_document_versions version_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_versions ALTER COLUMN version_id SET DEFAULT nextval('public.employee_document_versions_version_id_seq'::regclass);


--
-- Name: employee_documents document_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents ALTER COLUMN document_id SET DEFAULT nextval('public.employee_documents_document_id_seq'::regclass);


--
-- Name: employee_lifecycle_events lifecycle_event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_events ALTER COLUMN lifecycle_event_id SET DEFAULT nextval('public.employee_lifecycle_events_lifecycle_event_id_seq'::regclass);


--
-- Name: employee_lifecycle_runs lifecycle_run_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_runs ALTER COLUMN lifecycle_run_id SET DEFAULT nextval('public.employee_lifecycle_runs_lifecycle_run_id_seq'::regclass);


--
-- Name: employee_lifecycle_tasks lifecycle_task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks ALTER COLUMN lifecycle_task_id SET DEFAULT nextval('public.employee_lifecycle_tasks_lifecycle_task_id_seq'::regclass);


--
-- Name: employee_lifecycle_template_tasks lifecycle_template_task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_template_tasks ALTER COLUMN lifecycle_template_task_id SET DEFAULT nextval('public.employee_lifecycle_template_task_lifecycle_template_task_id_seq'::regclass);


--
-- Name: employee_lifecycle_templates lifecycle_template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_templates ALTER COLUMN lifecycle_template_id SET DEFAULT nextval('public.employee_lifecycle_templates_lifecycle_template_id_seq'::regclass);


--
-- Name: fbr_invoice_submission submission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbr_invoice_submission ALTER COLUMN submission_id SET DEFAULT nextval('public.fbr_invoice_submission_submission_id_seq'::regclass);


--
-- Name: finance_asset_purchase asset_purchase_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_asset_purchase ALTER COLUMN asset_purchase_id SET DEFAULT nextval('public.finance_asset_purchase_asset_purchase_id_seq'::regclass);


--
-- Name: finance_expense_entry expense_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_entry ALTER COLUMN expense_id SET DEFAULT nextval('public.finance_expense_entry_expense_id_seq'::regclass);


--
-- Name: intake_output io_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_output ALTER COLUMN io_id SET DEFAULT nextval('public.intake_output_io_id_seq'::regclass);


--
-- Name: ip_advance advance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_advance ALTER COLUMN advance_id SET DEFAULT nextval('public.ip_advance_advance_id_seq'::regclass);


--
-- Name: ip_charge charge_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_charge ALTER COLUMN charge_id SET DEFAULT nextval('public.ip_charge_charge_id_seq'::regclass);


--
-- Name: lab_order order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order ALTER COLUMN order_id SET DEFAULT nextval('public.lab_order_order_id_seq'::regclass);


--
-- Name: lab_result result_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result ALTER COLUMN result_id SET DEFAULT nextval('public.lab_result_result_id_seq'::regclass);


--
-- Name: lab_result_approvals approval_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_approvals ALTER COLUMN approval_id SET DEFAULT nextval('public.lab_result_approvals_approval_id_seq'::regclass);


--
-- Name: lab_test_parameters parameter_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_parameters ALTER COLUMN parameter_id SET DEFAULT nextval('public.lab_test_parameters_parameter_id_seq'::regclass);


--
-- Name: lab_test_results result_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results ALTER COLUMN result_id SET DEFAULT nextval('public.lab_test_results_result_id_seq'::regclass);


--
-- Name: leave_employee_quota_override override_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_employee_quota_override ALTER COLUMN override_id SET DEFAULT nextval('public.leave_employee_quota_override_override_id_seq'::regclass);


--
-- Name: leave_role_quota role_quota_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_role_quota ALTER COLUMN role_quota_id SET DEFAULT nextval('public.leave_role_quota_role_quota_id_seq'::regclass);


--
-- Name: medication_administration mar_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration ALTER COLUMN mar_id SET DEFAULT nextval('public.medication_administration_mar_id_seq'::regclass);


--
-- Name: medication_order med_order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_order ALTER COLUMN med_order_id SET DEFAULT nextval('public.medication_order_med_order_id_seq'::regclass);


--
-- Name: medicine medicine_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine ALTER COLUMN medicine_id SET DEFAULT nextval('public.medicine_medicine_id_seq'::regclass);


--
-- Name: medicine_batch batch_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_batch ALTER COLUMN batch_id SET DEFAULT nextval('public.medicine_batch_batch_id_seq'::regclass);


--
-- Name: medicine_purchase purchase_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase ALTER COLUMN purchase_id SET DEFAULT nextval('public.medicine_purchase_purchase_id_seq'::regclass);


--
-- Name: medicine_purchase_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase_detail ALTER COLUMN id SET DEFAULT nextval('public.medicine_purchase_detail_id_seq'::regclass);


--
-- Name: medicine_transaction txn_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction ALTER COLUMN txn_id SET DEFAULT nextval('public.medicine_transaction_txn_id_seq'::regclass);


--
-- Name: menstrual_history menstrual_history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menstrual_history ALTER COLUMN menstrual_history_id SET DEFAULT nextval('public.menstrual_history_menstrual_history_id_seq'::regclass);


--
-- Name: notification_outbox notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox ALTER COLUMN notification_id SET DEFAULT nextval('public.notification_outbox_notification_id_seq'::regclass);


--
-- Name: nursing_note note_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_note ALTER COLUMN note_id SET DEFAULT nextval('public.nursing_note_note_id_seq'::regclass);


--
-- Name: obstetric_history obstetric_history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obstetric_history ALTER COLUMN obstetric_history_id SET DEFAULT nextval('public.obstetric_history_obstetric_history_id_seq'::regclass);


--
-- Name: para_details para_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.para_details ALTER COLUMN para_id SET DEFAULT nextval('public.para_details_para_id_seq'::regclass);


--
-- Name: party party_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party ALTER COLUMN party_id SET DEFAULT nextval('public.party_party_id_seq'::regclass);


--
-- Name: party_payment payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_payment ALTER COLUMN payment_id SET DEFAULT nextval('public.party_payment_payment_id_seq'::regclass);


--
-- Name: patient patient_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient ALTER COLUMN patient_id SET DEFAULT nextval('public.patient_patient_id_seq'::regclass);


--
-- Name: patient_allergy allergy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_allergy ALTER COLUMN allergy_id SET DEFAULT nextval('public.patient_allergy_allergy_id_seq'::regclass);


--
-- Name: patient_vitals vital_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals ALTER COLUMN vital_id SET DEFAULT nextval('public.patient_vitals_vital_id_seq'::regclass);


--
-- Name: payroll_line_item payroll_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_line_item ALTER COLUMN payroll_line_id SET DEFAULT nextval('public.payroll_line_item_payroll_line_id_seq'::regclass);


--
-- Name: payroll_run payroll_run_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run ALTER COLUMN payroll_run_id SET DEFAULT nextval('public.payroll_run_payroll_run_id_seq'::regclass);


--
-- Name: pharmacy_customer customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_customer ALTER COLUMN customer_id SET DEFAULT nextval('public.pharmacy_customer_customer_id_seq'::regclass);


--
-- Name: pharmacy_sale sale_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale ALTER COLUMN sale_id SET DEFAULT nextval('public.pharmacy_sale_sale_id_seq'::regclass);


--
-- Name: pharmacy_sale_detail pharmacy_sale_detail_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale_detail ALTER COLUMN pharmacy_sale_detail_id SET DEFAULT nextval('public.pharmacy_sale_detail_id_seq'::regclass);


--
-- Name: pos_audit_log log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log ALTER COLUMN log_id SET DEFAULT nextval('public.pos_audit_log_log_id_seq'::regclass);


--
-- Name: pos_held_transaction hold_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction ALTER COLUMN hold_id SET DEFAULT nextval('public.pos_held_transaction_hold_id_seq'::regclass);


--
-- Name: pos_held_transaction_detail detail_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction_detail ALTER COLUMN detail_id SET DEFAULT nextval('public.pos_held_transaction_detail_detail_id_seq'::regclass);


--
-- Name: pos_receipt_config config_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_receipt_config ALTER COLUMN config_id SET DEFAULT nextval('public.pos_receipt_config_config_id_seq'::regclass);


--
-- Name: pos_session session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_session ALTER COLUMN session_id SET DEFAULT nextval('public.pos_session_session_id_seq'::regclass);


--
-- Name: prescription prescription_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription ALTER COLUMN prescription_id SET DEFAULT nextval('public.prescription_prescription_id_seq'::regclass);


--
-- Name: prescription_medicines prescription_medicine_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_medicines ALTER COLUMN prescription_medicine_id SET DEFAULT nextval('public.prescription_medicines_prescription_medicine_id_seq'::regclass);


--
-- Name: purchase_return return_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return ALTER COLUMN return_id SET DEFAULT nextval('public.purchase_return_return_id_seq'::regclass);


--
-- Name: purchase_return_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_detail ALTER COLUMN id SET DEFAULT nextval('public.purchase_return_detail_id_seq'::regclass);


--
-- Name: room room_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room ALTER COLUMN room_id SET DEFAULT nextval('public.room_room_id_seq'::regclass);


--
-- Name: sale_return return_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return ALTER COLUMN return_id SET DEFAULT nextval('public.sale_return_return_id_seq'::regclass);


--
-- Name: sale_return_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return_detail ALTER COLUMN id SET DEFAULT nextval('public.sale_return_detail_id_seq'::regclass);


--
-- Name: staff staff_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff ALTER COLUMN staff_id SET DEFAULT nextval('public.staff_staff_id_seq'::regclass);


--
-- Name: staff_leave_approvals approval_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_approvals ALTER COLUMN approval_id SET DEFAULT nextval('public.staff_leave_approvals_approval_id_seq'::regclass);


--
-- Name: staff_leave_balances balance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances ALTER COLUMN balance_id SET DEFAULT nextval('public.staff_leave_balances_balance_id_seq'::regclass);


--
-- Name: staff_leave_requests leave_request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_requests ALTER COLUMN leave_request_id SET DEFAULT nextval('public.staff_leave_requests_leave_request_id_seq'::regclass);


--
-- Name: staff_leave_types leave_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_types ALTER COLUMN leave_type_id SET DEFAULT nextval('public.staff_leave_types_leave_type_id_seq'::regclass);


--
-- Name: staff_permission_audit event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_audit ALTER COLUMN event_id SET DEFAULT nextval('public.staff_permission_audit_event_id_seq'::regclass);


--
-- Name: staff_permission_policies policy_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_policies ALTER COLUMN policy_id SET DEFAULT nextval('public.staff_permission_policies_policy_id_seq'::regclass);


--
-- Name: staff_permissions permission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions ALTER COLUMN permission_id SET DEFAULT nextval('public.staff_permissions_permission_id_seq'::regclass);


--
-- Name: staff_role_assignments assignment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_role_assignments ALTER COLUMN assignment_id SET DEFAULT nextval('public.staff_role_assignments_assignment_id_seq'::regclass);


--
-- Name: staff_roles role_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roles ALTER COLUMN role_id SET DEFAULT nextval('public.staff_roles_role_id_seq'::regclass);


--
-- Name: staff_roster_assignments roster_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roster_assignments ALTER COLUMN roster_id SET DEFAULT nextval('public.staff_roster_assignments_roster_id_seq'::regclass);


--
-- Name: staff_shift_templates shift_template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shift_templates ALTER COLUMN shift_template_id SET DEFAULT nextval('public.staff_shift_templates_shift_template_id_seq'::regclass);


--
-- Name: visit visit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit ALTER COLUMN visit_id SET DEFAULT nextval('public.visit_visit_id_seq'::regclass);


--
-- Name: visit_status_history visit_status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_status_history ALTER COLUMN visit_status_id SET DEFAULT nextval('public.visit_status_history_visit_status_id_seq'::regclass);


--
-- Name: ward ward_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward ALTER COLUMN ward_id SET DEFAULT nextval('public.ward_ward_id_seq'::regclass);


--
-- Data for Name: admission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admission (admission_id, admission_no, patient_id, visit_id, attending_doctor_id, admission_datetime, admission_type, provisional_diagnosis, final_diagnosis, current_bed_id, status, discharge_datetime, discharge_type, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: allowance_type_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowance_type_master (code, label, description, taxable, created_at, updated_at) FROM stdin;
transport	Transport Allowance	Recurring or ad-hoc transport support	t	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
meal	Meal Allowance	Meal subsidy or food support	t	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
housing	Housing Allowance	Rent or housing support	t	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
medical	Medical Allowance	General medical support for staff	f	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
communication	Communication Allowance	Phone/internet reimbursement	t	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
other	Other Allowance	Any custom allowance type	t	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
\.


--
-- Data for Name: appointment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointment (appointment_id, patient_id, doctor_id, scheduled_at, duration_min, status, reason, visit_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance_regularization_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_regularization_requests (regularization_id, staff_id, attendance_id, requested_check_in, requested_check_out, requested_status, reason, request_status, approved_by, approved_at, decision_note, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (log_id, staff_id, action, entity_type, entity_id, details, ip_address, created_at) FROM stdin;
3ddfb4f2-56d2-479f-9e81-09fca00e73a8	6	Attendance check-in marked	staff_attendance	d9d5b4fa-dbc3-4d8e-bf49-40a68ae6709d	{"date": "2026-03-23", "event": "check_in", "staffId": 1, "markedBy": "System Trigger"}	\N	2026-03-23 19:54:35.401078
f1ae28c9-46f9-4fc3-acb5-c457887b1d6f	\N	Logout	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 04:35:42.849792
692a29ea-7a4b-4990-8894-0de760f838ae	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 04:39:14.928042
75833bed-efdf-491a-abb7-4ac1ff21a45f	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 05:28:27.837543
b8b3b4e1-621b-4cca-8f56-e1f569950bb9	6	Permission matrix updated	staff_permission_policies	1	{"changedPolicies": 84}	\N	2026-03-24 05:55:08.324352
ffacbae3-8c66-40b8-8fa5-84f09e135e4c	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 05:55:17.326749
3521f5c7-30e8-4b5a-921e-44c8527158bb	6	Forced logout	staff_security	1	{"reason": null, "staffId": 1, "targetUserCode": "STF001"}	\N	2026-03-24 05:55:47.651673
8cd9d744-68eb-4199-b986-aae9722b97c1	6	Staff directory profile created	staff	7	{"role": "Admin", "userCode": "ADM001", "employmentStatus": "active"}	\N	2026-03-24 06:10:25.536317
cd49fe44-6af7-47cd-a84b-370f4b20641b	\N	Login success	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 06:15:06.197925
ac01341a-c021-4060-a755-1524c94b1220	6	Account locked	staff_security	1	{"reason": null, "staffId": 1, "lockedUntil": "2026-03-24T06:46:12.822Z", "targetUserCode": "STF001"}	\N	2026-03-24 06:16:13.694964
d5b07aa4-0088-4cfe-99d2-5e6454670fc5	6	Account unlocked	staff_security	1	{"reason": null, "staffId": 1, "targetUserCode": "STF001"}	\N	2026-03-24 06:16:44.398501
32eec301-6ac7-47a9-93ed-0de71aa794f9	\N	Logout	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 06:41:48.581232
9d9ee7c3-bc63-48bd-9fdd-6b1c666d420e	\N	Login success	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 06:42:14.068835
a19beb87-3bae-4c86-a4ce-7de2667c113e	6	Doctor forced logout	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001"}	\N	2026-03-24 06:47:47.999287
96618be6-5f4d-496a-abb9-cd3da2b67980	\N	Login success	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 06:50:38.015576
db40dc58-a6b7-40b2-a3e2-127755ff3192	6	Doctor forced logout	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001"}	\N	2026-03-24 06:54:40.696987
c5b6dc9f-9ac5-42bf-bdec-2d230c52cefe	\N	Login success	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 07:19:28.986376
be506d9d-d496-482c-940a-f629bcd36f5c	6	Doctor forced logout	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001"}	\N	2026-03-24 07:23:29.421102
52215790-5710-4ee5-9c42-959ed63d4dc5	\N	Login success	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 07:23:38.117483
dc51231c-b46b-4ba4-ba57-2156b6414048	6	Doctor account locked	doctor_security	1	{"reason": null, "doctorId": 1, "lockedUntil": "2026-03-24T07:53:55.745Z", "targetUserCode": "DOC001"}	\N	2026-03-24 07:23:56.362805
ecd49b27-5105-4754-af0c-0de66c325e3d	\N	Login blocked	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Account temporarily locked", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "accountLockedUntil": "2026-03-24T07:53:55.745Z"}	\N	2026-03-24 07:24:13.752023
1eacb3e1-8542-46bb-95ce-57d5408516a5	6	Doctor account unlocked	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001"}	\N	2026-03-24 07:24:32.596085
f54d5895-6369-452f-8eaa-e9c743099ed3	\N	Login success	auth	DOC001	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 07:24:39.967048
3f15d2c5-5c36-49c0-8b09-a173cc751ef0	6	Doctor password reset by admin	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001", "generatedPassword": true}	\N	2026-03-24 07:24:48.325648
8748e28a-c30c-4db9-9fad-eacfa551c7a9	6	Doctor password reset by admin	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001", "generatedPassword": true}	\N	2026-03-24 07:29:00.121164
c0605c59-d6a2-426d-9a36-70157da795b1	6	Doctor password reset by admin	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001", "generatedPassword": true}	\N	2026-03-24 07:30:22.00465
b1e9c7c0-ba17-46d3-a068-06e52284fc6e	6	Logout	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 09:32:00.839174
9c87454d-cef5-44a7-aa81-14acd8b618ed	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 11:52:56.478391
520532a3-93f5-4053-b304-a72c0e3a6699	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 13:46:56.217005
143ad07d-d0c7-48e0-a6bb-a4fe12bd078c	6	Attendance check-in marked	staff_attendance	7cee4756-5cc8-4bc2-9da1-16878e6423ab	{"date": "2026-03-24", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF006", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-03-24 13:50:36.828197
edddd4e9-34f5-4065-a8f8-4960f3d9dcac	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 14:31:32.256676
d06585e9-b362-48db-990b-10cb1d812f89	\N	Login failed	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "failedAttempts": 1, "accountLockedUntil": null}	\N	2026-03-24 14:32:10.14675
23a11552-4c03-4a8f-9e2a-c5a23a24f479	6	Doctor account unlocked	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001"}	\N	2026-03-24 14:32:47.931662
5a45be10-14ac-44c4-b911-790c87fe5027	\N	Login failed	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "failedAttempts": 1, "accountLockedUntil": null}	\N	2026-03-24 14:32:57.147512
3bbd2dc7-3779-486f-93ec-a38c1d648ed4	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 14:33:19.583875
4eb3fab7-cddb-48b7-b197-f5d99667b653	\N	Attendance check-in marked	doctor_attendance	fe617cfc-8a47-49f2-957e-f0a63bd9fa63	{"date": "2026-03-24", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "DOC002", "accountType": "doctor", "derivedStatus": "unscheduled"}	\N	2026-03-24 14:34:10.244027
ae37a190-e869-477c-9a0f-d1c6ff6a8df8	6	Doctor password reset by admin	doctor_security	1	{"reason": null, "doctorId": 1, "targetUserCode": "DOC001", "generatedPassword": true}	\N	2026-03-24 14:34:51.204493
5bcf631c-c67c-48e5-b337-53607e3be2c2	\N	Attendance check-out marked	doctor_attendance	fe617cfc-8a47-49f2-957e-f0a63bd9fa63	{"date": "2026-03-24", "event": "check_out", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "DOC002", "accountType": "doctor", "derivedStatus": "unscheduled"}	\N	2026-03-24 14:41:28.662391
5092f178-695d-4bab-828d-991b2cdbb4d8	\N	Logout	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 14:44:13.74343
c4affed9-0deb-498f-a06c-d77873c97347	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-24 14:44:19.504999
2c0ef194-9d07-431f-9e40-6c2d8486ae3c	6	Shift template created	staff_shift_template	1	{"shiftCode": "SHF111"}	\N	2026-03-24 15:03:14.57059
0c184eaf-476b-4c50-b7ac-f4abc4dd67ff	6	Roster assignments updated	staff_roster	1	{"count": 1}	\N	2026-03-24 15:03:39.247556
14eff29a-a3fb-4aae-99c5-40fd3b3ca148	6	Shift template created	staff_shift_template	2	{"shiftCode": "SHF2222"}	\N	2026-03-24 15:34:19.486568
1ebdef44-4a61-4e96-a3ba-811034187a2a	6	Roster assignments updated	staff_roster	1	{"count": 44}	\N	2026-03-24 15:35:29.624902
fc8e2e7e-7785-4765-9beb-530c73cf4644	6	Roster assignments updated	staff_roster	1	{"count": 23}	\N	2026-03-24 15:45:52.736746
c4beb601-8433-4824-be14-51f4231b0ab3	6	Roster assignments updated	staff_roster	1	{"count": 19}	\N	2026-03-24 15:47:11.294004
bfd4202e-33f5-435c-b5df-7d5f5f2a627a	6	Leave request created	staff_leave_request	1	{"toDate": "2026-03-24", "fromDate": "2026-03-24", "personId": 1, "accountType": "doctor", "leaveTypeId": 3}	\N	2026-03-24 16:17:20.017541
07f462e5-fa99-45cc-8079-b87559c82f2b	6	Attendance policy updated	system_settings	attendance_policy	{"after": {"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}, "scope": "global_clinic", "before": {"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}, "source": "admin"}	\N	2026-03-24 17:07:04.994438
2fd0ccf9-14a8-4ea8-9bae-1c5f05f36fec	6	Compensation profile upserted	employee_compensation_profile	4	{"personId": 5, "accountType": "staff", "salaryModel": "fixed_monthly"}	\N	2026-03-24 17:23:22.728718
a01b3c83-63b6-4967-b5bb-bbc2657ae7c1	6	Compensation profile upserted	employee_compensation_profile	12	{"personId": 1, "accountType": "doctor", "salaryModel": "per_patient_seen"}	\N	2026-03-24 17:28:54.153245
8c547743-b996-4372-83ab-3dcf3982d39f	6	Payroll run generated	payroll_run	1	{"month": "2026-03", "lineCount": 12, "totalNetAmount": 53000}	\N	2026-03-24 17:29:52.711639
bd064790-7840-43d4-b330-853fc9c6f85e	6	Payroll run generated	payroll_run	1	{"month": "2026-03", "lineCount": 12, "totalNetAmount": 53000}	\N	2026-03-24 17:32:40.40843
0ccca73a-5ac8-4bae-8b44-061060272b86	6	Update Setting	System	system_timezone	{"new": "Asia/Karachi", "old": "..."}	\N	2026-03-24 19:40:24.456173
69df6a76-815a-4fd7-9513-ae34d786d64d	6	Attendance policy updated	system_settings	attendance_policy	{"after": {"grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}, "scope": "global_clinic", "before": {"grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}, "source": "admin"}	\N	2026-03-24 19:40:25.429267
6b4c0eaf-6efd-4361-8141-3360c610a0c9	6	Payroll run generated	payroll_run	1	{"month": "2026-03", "lineCount": 12, "totalNetAmount": 53000}	\N	2026-03-24 19:41:27.826444
c147342c-ff65-4cae-9afe-dbec001b9d33	6	Compensation profile upserted	employee_compensation_profile	1	{"personId": 2, "accountType": "staff", "salaryModel": "fixed_monthly"}	\N	2026-03-24 19:41:59.755828
d55acad9-3d1a-4b36-afd3-3bbc1a7c10f3	6	Payroll run generated	payroll_run	1	{"month": "2026-03", "lineCount": 12, "totalNetAmount": 113000}	\N	2026-03-24 19:42:21.461612
6aac4e21-3345-442d-9e5f-6374b9bf4b77	6	Payroll run finalized	payroll_run	1	\N	\N	2026-03-24 19:42:36.923174
479a4184-8e90-45ad-95bf-61d1c4f060c7	6	Payroll run voided	payroll_run	1	\N	\N	2026-03-24 19:42:52.898065
6e910f6a-59b9-453c-b8cc-0a10ff15e99b	6	Payroll run generated	payroll_run	1	{"month": "2026-03", "lineCount": 12, "totalNetAmount": 113000}	\N	2026-03-24 19:43:06.430661
f5d1c015-0057-4425-9966-ca22f4908eef	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 04:50:46.287849
6c1a5869-1e39-4b26-b45b-04db1c7235fe	6	Attendance check-in marked	staff_attendance	2804e3c0-2e98-47f1-bb9f-8f543eb22148	{"date": "2026-03-25", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF006", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-03-25 04:51:10.075832
84967f9a-1826-48ce-a869-ab5d49784746	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 04:56:13.486302
ac6c3613-713c-496f-937d-6a980a75dc7b	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 04:56:33.766064
1641cd19-feee-4b2a-8c43-e06626237774	\N	Login failed	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "failedAttempts": 1, "accountLockedUntil": null}	\N	2026-03-25 04:56:46.667821
a1bf22b3-0011-4c1c-b7af-2e6a202e2445	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 04:56:54.347969
13aeb897-2c1e-4cf8-8895-8dd5b3a951f2	\N	Attendance check-in marked	doctor_attendance	9f527bb5-5172-49ab-b69b-09fce9bc4ce1	{"date": "2026-03-25", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "DOC002", "accountType": "doctor", "derivedStatus": "unscheduled"}	\N	2026-03-25 04:57:12.957003
5b3bda59-262a-4048-a035-12393140958e	\N	Logout	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:00:11.084757
47b041dc-cc8f-4b0c-827c-4f0a1e9d64a4	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:00:17.8309
8c4b28c7-0fbe-4ead-ab0e-5a80bf0f07e0	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:00:26.955129
a640d87c-a15c-4976-9ee7-cf5005dcd46f	\N	Login failed	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "failedAttempts": 2, "accountLockedUntil": null}	\N	2026-03-25 06:00:50.909283
dee66c6e-9a9a-463e-91e3-716fe694c9df	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:00:56.846147
9d4c85a6-d07d-4105-a09d-e06880d32e7c	\N	Logout	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:01:22.676348
9c06d1ad-1fd2-4df5-94d5-c68bbbf7ce3a	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:01:29.936078
4828e841-80e7-4de6-b690-19d219e4a11a	1	Attendance check-in marked	staff_attendance	704eeeb6-bc2c-4c5b-bf45-a408dfa1e5b7	{"date": "2026-03-25", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF001", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-03-25 06:04:31.142083
28b2d2ec-e57c-4469-a877-b7503fc4eb2b	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:08:14.226371
0bb66599-4300-4abb-8152-62bef78067d4	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:08:20.063702
d9b96735-a53b-4e6f-98fa-9c0e986db2c5	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:41:35.03508
6e47f048-cfcf-4514-ab1c-81e43beeb995	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:41:42.595241
73b0d8c6-f8a4-4e08-95a4-7f1dbb34042b	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:41:49.669528
d02264e0-8b57-4570-b289-4160c4816747	2	Login success	auth	STF002	{"ip": "::1", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 06:41:57.143603
64a069df-e12f-4c42-8505-56aad28277b1	2	Attendance check-in marked	staff_attendance	0932deb2-f171-40e9-9573-98b2ad273f0f	{"date": "2026-03-25", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF002", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-03-25 06:44:53.994787
3c3ee4db-7ac3-4263-a8df-fa72b3f61ae4	6	Roster assignments updated	staff_roster	88	{"count": 261}	\N	2026-03-25 11:04:05.155143
17c696a0-7a0a-48c0-aec0-180dff783cf7	6	Roster assignments updated	staff_roster	3	{"count": 261}	\N	2026-03-25 11:06:17.864915
c6e19fe6-c8fa-44be-ac0c-3fb23b5949c6	6	Shift template created	staff_shift_template	3	{"shiftCode": "SHF112"}	\N	2026-03-25 11:49:16.021248
3675434c-fa88-4100-8c1a-ee15aa922bdb	6	Roster assignments updated	staff_roster	610	{"count": 261, "last_date": "2027-03-24", "first_date": "2026-03-25"}	\N	2026-03-25 11:49:36.921599
71f2e4a7-a174-4a7f-80aa-8be194fb3036	6	Roster assignments updated	staff_roster	871	{"count": 261, "last_date": "2027-03-24", "first_date": "2026-03-25"}	\N	2026-03-25 11:50:17.249383
46c608f2-6700-4901-87e3-11d66ac8d211	6	Roster assignments updated	staff_roster	1132	{"count": 261, "last_date": "2027-03-24", "first_date": "2026-03-25"}	\N	2026-03-25 11:51:00.186846
30902afb-d49a-4b90-ac91-6e753cfd8da8	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 16:45:58.26344
c5317b60-2881-49d4-8f0c-f25132615d37	6	Logout	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-25 21:32:34.351635
7ba11a01-5d39-4fd6-af42-ea3c3a8cf812	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 08:12:10.220282
40a56194-1049-47cf-98e8-dc89f5f1b401	8	ipd.order	doctor_order	3	{"orderType": "medication", "admissionId": 6}	\N	2026-06-20 14:56:52.395681
195c0eed-272c-47f9-84f6-90a732912c4d	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 08:19:33.479291
c98c924e-4847-4115-a89d-fe07e24795c6	\N	Attendance check-in marked	doctor_attendance	21d6e952-21d4-4039-85a9-9146c84b017f	{"date": "2026-03-26", "event": "check_in", "source": "self", "message": "Late by 315 minute(s).", "userCode": "DOC002", "accountType": "doctor", "derivedStatus": "late"}	\N	2026-03-26 08:30:02.719892
98b2015b-1c1f-4f11-a88c-11f2c743b7ba	\N	Logout	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 08:30:54.945448
44a1bcc0-e5ea-45c8-9d55-6c402aa13da2	2	Login success	auth	STF002	{"ip": "::1", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 08:31:25.275771
c9e996f0-7ef5-4e03-bd4e-bbf94e9a9edc	6	Login success	auth	STF006	{"ip": "223.123.9.68", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 14:31:11.528455
2d1590a1-b210-4a24-ae83-6afd3cb6c7e4	6	Attendance check-in marked	staff_attendance	2b651459-c0cd-45c9-8d78-0eada112e64a	{"date": "2026-03-26", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF006", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-03-26 14:31:57.075625
976ab25f-13ba-44cf-88bd-074a0ac3ff44	6	Attendance check-out marked	staff_attendance	2b651459-c0cd-45c9-8d78-0eada112e64a	{"date": "2026-03-26", "event": "check_out", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF006", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-03-26 14:32:02.50444
ea098c99-7aef-4d74-ab1f-fe9543842639	6	Logout	auth	STF006	{"ip": "223.123.9.68", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 14:32:05.529069
fc98c756-6a19-4cbc-b8af-7fe3b3d86bff	6	Login failed	auth	STF006	{"ip": "223.123.9.68", "role": "Admin", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "failedAttempts": 1, "accountLockedUntil": null}	\N	2026-03-26 14:32:24.54024
b639f0ec-bbe8-46aa-b081-dd91ef96ec4f	6	Login success	auth	STF006	{"ip": "223.123.9.68", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 14:32:30.415284
6d87f6d8-f084-4d17-9cbc-e186aa643098	6	Logout	auth	STF006	{"ip": "223.123.9.68", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 14:38:32.74021
9afa008a-62fd-4cd6-848b-dcef15e3c7ed	2	Login success	auth	STF002	{"ip": "223.123.9.68", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-26 14:38:49.850937
ca85aceb-1103-42bf-ba60-884e030f5015	4	Login success	auth	STF004	{"ip": "::1", "role": "Cashier", "outcome": "success", "userCode": "STF004", "userName": "Imran Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-30 03:29:00.37748
682f650d-9ded-4a81-821b-1bf4272e48cf	4	Logout	auth	STF004	{"ip": "::1", "role": "Cashier", "outcome": "success", "userCode": "STF004", "userName": "Imran Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-30 03:29:31.37781
e2d3ad19-f50d-4a1d-885a-413c5d8053b5	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-30 03:46:30.062403
1997fb20-1233-4ed6-a520-dfae63f036fe	1	Attendance check-in marked	staff_attendance	fc1c64c7-7897-414f-ade8-f5d4ea1738ae	{"date": "2026-03-30", "event": "check_in", "source": "self", "message": "On time.", "userCode": "STF001", "accountType": "staff", "derivedStatus": "on_time"}	\N	2026-03-30 03:47:08.452309
d5c56ae4-fb78-47d9-9fc3-34e93152d506	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-30 03:49:34.727336
7508e0f3-0757-4e20-93a3-b21fb92ba786	2	Login success	auth	STF002	{"ip": "::1", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-30 03:55:31.198219
3b7498b8-421c-4c54-8027-157d209d10af	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-03-30 04:02:24.684489
4033ea2b-bcaa-45e4-aa33-a6927784b035	1	Login failed	auth	STF001	{"ip": "39.50.152.190", "role": "Receptionist", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0", "failedAttempts": 1, "accountLockedUntil": null}	\N	2026-04-02 10:42:07.707994
6aaae24c-596a-4b32-b72d-e9401226d15c	1	Login failed	auth	STF001	{"ip": "39.50.152.190", "role": "Receptionist", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0", "failedAttempts": 2, "accountLockedUntil": null}	\N	2026-04-02 10:42:27.942081
a05786de-6ac0-48cd-8ec0-58d276a9d999	1	Login success	auth	STF001	{"ip": "39.50.152.190", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0"}	\N	2026-04-02 10:52:39.512817
05d2dc8c-39c6-4398-9e44-c733fa028bd2	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 11:08:29.557585
9ee3d545-9af1-47ce-b499-1f07ee1a44b6	\N	Login success	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 11:13:42.711261
43bf23f0-6b30-40cd-bbe4-ce6b2bc24d32	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 11:22:56.28803
f089b75c-ba98-4744-bcda-7927ebb5fe57	\N	Attendance check-in marked	doctor_attendance	b3a3fdf5-c209-49c3-b8c5-4980b9da8693	{"date": "2026-04-02", "event": "check_in", "source": "self", "message": "Late by 491 minute(s).", "userCode": "DOC002", "accountType": "doctor", "derivedStatus": "late"}	\N	2026-04-02 11:26:34.139514
6e723932-1a32-4839-a396-50ac3664b2b3	2	Login success	auth	STF002	{"ip": "::1", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 11:28:51.660699
87ad90ad-cc03-4c07-8a77-906973fbba59	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 11:54:45.56997
b3dd8c42-1830-42d2-8ea0-9980e5ab0725	6	Forced logout	staff_security	2	{"reason": null, "staffId": 2, "targetUserCode": "STF002"}	\N	2026-04-02 12:01:34.190535
0a525b79-08bb-4a8b-ad5c-66f702dc7ea5	6	Shift template created	staff_shift_template	4	{"shiftCode": "NIGHT001"}	\N	2026-04-02 12:03:34.019724
b7a00e90-0ad9-49ae-bb40-6b7b77fc892e	6	Roster assignments updated	staff_roster	1393	{"count": 26, "last_date": "2026-05-01", "first_date": "2026-04-02"}	\N	2026-04-02 12:04:16.943051
798ac56d-a058-45df-9b28-092e96ac767a	6	Payroll run generated	payroll_run	2	{"month": "2026-04", "lineCount": 12, "totalNetAmount": 110000}	\N	2026-04-02 12:14:10.148078
5b69a4e5-e58e-46cf-bcd0-d017dd1ced9e	6	Logout	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 12:16:46.601059
047f1fe7-13b9-4cca-a8fe-50048cc30b4d	4	Login success	auth	STF004	{"ip": "::1", "role": "Cashier", "outcome": "success", "userCode": "STF004", "userName": "Imran Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 12:16:54.177547
43db0998-82ae-4533-b43f-a2ae22c8138f	\N	Logout	auth	DOC002	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 14:18:32.404743
c89b4d0b-4289-42a1-8f91-e1ffb168299f	4	Logout	auth	STF004	{"ip": "::1", "role": "Cashier", "outcome": "success", "userCode": "STF004", "userName": "Imran Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"}	\N	2026-04-02 15:31:21.808427
c90619d5-058c-47bb-9dab-1fc6144c1df0	\N	Login failed	auth	DOC001	{"ip": "182.190.128.168", "role": "Doctor", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36", "failedAttempts": 3, "accountLockedUntil": null}	\N	2026-04-08 09:19:47.611401
fef277d6-cdc1-4dad-a98c-6fb817f998b1	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 09:50:07.196923
a2aac02f-3c3e-4512-91ff-649d2d57dd39	1	Attendance check-in marked	staff_attendance	1e12d143-bc3d-4eec-a786-9387046c9cc9	{"date": "2026-04-19", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF001", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-04-19 09:51:03.572526
6bc66e56-0667-4e41-bbfa-403208424655	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:03:51.794555
0433ed07-3d26-44c6-ba1e-d3c8a43dc8e2	1	Logout	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:11:34.411032
8ebe9c9b-eb14-4ef8-8f79-f2231e2eb9d5	2	Login success	auth	STF002	{"ip": "182.190.129.67", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:11:49.201738
720721bd-0c83-4d45-a479-8b3ead9accd5	2	Logout	auth	STF002	{"ip": "182.190.129.67", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:17:08.107769
25ab0637-e8e6-447b-bd39-8941513f1c8d	\N	Login success	auth	DOC002	{"ip": "182.190.129.67", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:17:37.318326
34b6e70b-83e1-4fab-af8d-e183368b6a0f	\N	Attendance check-in marked	doctor_attendance	369a064e-5c20-4abb-9664-e0b2a838d235	{"date": "2026-04-19", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "DOC002", "accountType": "doctor", "derivedStatus": "unscheduled"}	\N	2026-04-19 17:17:51.129472
40312e12-e0ab-42fd-8c70-32e373e13615	\N	Logout	auth	DOC002	{"ip": "182.190.129.67", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:17:56.355915
c40e4297-5bb0-40d3-8d47-f99c4789da47	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:02.854702
2907d9d1-b67b-47c7-8c21-aec70230426a	1	Logout	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:17.373729
82fdfd03-94c7-4fc8-bf3b-cca56ee93071	\N	Login success	auth	DOC002	{"ip": "182.190.129.67", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:24.820977
75f9b733-7af8-4cd6-9262-cdb6e7e16690	\N	Logout	auth	DOC002	{"ip": "182.190.129.67", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:31.1577
cd801d63-bd21-4970-920a-2f3764417a1d	8	ipd.discharge	admission	6	{"netDue": "0", "dischargeType": "normal"}	\N	2026-06-20 14:56:52.461078
a162da91-af22-4b4b-ab8a-ff4222c26cbf	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:39.415094
3399b00a-0c86-45a6-a7bd-3e6df5b8659f	\N	Login success	auth	DOC002	{"ip": "182.190.129.67", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:19:00.967885
b0bdc206-c23c-40a2-9cd2-6f31d88a3344	1	Logout	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:50.936736
804a24c1-59fb-4cb3-90ac-ce8522f54df3	6	Login success	auth	STF006	{"ip": "182.190.129.67", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-20 06:30:40.941931
c3ded64d-e572-4050-b91e-f57a37a751e4	6	Attendance check-in marked	staff_attendance	3c2ca877-84bb-43fe-b621-34da3ee762b3	{"date": "2026-04-20", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF006", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-04-20 06:30:56.527159
7606d11d-5e24-4539-8b03-25cd3783ecb7	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-22 14:40:34.236713
7b8af9b7-f5f4-4021-bd6c-4fa788c2f260	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"}	\N	2026-05-23 13:25:14.21654
2cf2dcbc-ded8-443f-aee5-e37f96ba4f8c	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-20 08:34:58.03489
6be17c1e-0b6f-4ba3-9a6a-c785aa02caf3	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "node"}	\N	2026-06-20 11:18:59.423323
4ebc0671-2f4f-404b-9cf5-42ee088daaa6	7	Login success	auth	ADM001	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "ADM001", "userName": "Muhammad Abdul Rehman", "userAgent": "node"}	\N	2026-06-20 11:18:59.473078
af8fcbc2-639a-4349-a778-6466a5822471	\N	Login failed	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Invalid Credentials", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "node", "failedAttempts": 4, "accountLockedUntil": null}	\N	2026-06-20 11:18:59.520829
1a32a664-910d-49d9-8b0d-4d71a8136b76	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "node"}	\N	2026-06-20 11:19:49.912882
bcced037-ad5a-40a7-9128-e8a7984d84e7	7	Login success	auth	ADM001	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "ADM001", "userName": "Muhammad Abdul Rehman", "userAgent": "node"}	\N	2026-06-20 11:19:49.960182
bcee3dcf-6aa6-4d8f-9c9f-5ece64d6d9b6	\N	Login failed	auth	DOC001	{"ip": "::1", "role": "Doctor", "reason": "Account locked due to repeated failed attempts", "outcome": "failed", "userCode": "DOC001", "userName": "Dr. Ahmed Khan", "userAgent": "node", "failedAttempts": 5, "accountLockedUntil": "2026-06-20T06:34:49.965Z"}	\N	2026-06-20 11:19:50.003736
97d184d5-4efc-4dfa-be49-1fc79c300310	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 11:22:27.056851
ea88692b-9350-4449-8e60-085f0a5cefce	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 11:22:27.109051
9235b2d8-7698-4cc6-8c54-44251ca544b3	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 11:22:27.159053
a767f14e-28cb-45ed-89bb-792b9e341159	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 11:31:12.601469
d6c595f9-9f00-4ab0-8187-150fbb020cce	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 11:31:12.659996
6cd27728-c00d-4da3-8862-e10e219d0886	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 11:31:12.7156
eaddf219-efea-4c10-9e3b-402d7dc56413	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 13:37:51.578429
e6a6c453-a6a5-499c-839c-0a345312cab8	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 13:37:51.636421
56591635-f172-456e-812a-273ab575b228	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 13:37:51.687849
94ae4cb4-2b9b-48af-bd44-669edf5689c4	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 13:52:27.011179
df7ff7b4-b373-4f6c-8817-6ad672a02987	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 13:52:27.066205
2da503b0-9dc2-45be-a693-7fae67ba3e9d	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 13:52:27.117066
513c3b7d-bc01-4b02-b0ac-eba38ef61a31	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 14:56:51.607506
bdeb0c36-7692-4964-a46b-d71e4334a1fb	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 14:56:51.674512
82701ad9-ae68-40ff-8301-6bf285068b3b	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 14:56:51.733326
fa2cd0c9-b8cf-47c2-8eb7-1657e9f08456	8	ipd.admit	admission	6	{"bedId": 5, "patientId": 1, "admissionNo": "IPD000006"}	\N	2026-06-20 14:56:52.312955
1b02684e-f07b-4319-8e22-a0924698d48c	8	ipd.advance	admission	6	{"amount": 5000, "paymentType": "CASH"}	\N	2026-06-20 14:56:52.38258
ab6cd049-203a-4f6f-9561-ece2641e6c0e	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-20 14:57:53.394271
54f35d63-d89d-4ab4-b45b-781792f900aa	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-20 14:58:07.158912
f78d29a9-9dbb-4dfd-a10a-c3fb214946a9	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 14:58:11.612053
cae3f07e-3abe-49af-94b5-655d7ef0fb86	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 14:58:11.670889
07a5742d-c7d3-4fca-bcb7-bf19784d4120	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 14:58:11.7283
854e7557-f08a-41ae-bda6-5e074aa92357	8	ipd.admit	admission	7	{"bedId": 5, "patientId": 1, "admissionNo": "IPD000007"}	\N	2026-06-20 14:58:12.316789
518f4345-3a9c-437d-87b8-0d266102a9a6	8	ipd.advance	admission	7	{"amount": 5000, "paymentType": "CASH"}	\N	2026-06-20 14:58:12.540647
18ef5d7a-de3e-4084-b261-97f99db34d08	8	ipd.order	doctor_order	4	{"orderType": "medication", "admissionId": 7}	\N	2026-06-20 14:58:12.577206
13a35796-0153-4d2a-a736-64acfadc5b01	8	ipd.mar	medication_administration	4	{"action": "given", "medOrderId": 4, "allergyOverride": false}	\N	2026-06-20 14:58:12.623418
65b2aaf4-713d-4c86-8f9e-573bc076e3ae	8	ipd.discharge	admission	7	{"netDue": "0", "dischargeType": "normal"}	\N	2026-06-20 14:58:12.741276
70ed0e98-81f5-4083-86cd-1561aa71283f	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 19:01:57.036358
b43cb6f0-a9cd-4764-b642-98bd6da1dcca	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 19:01:57.109116
92d7a311-bbd3-4252-bff1-52ae18ec4bcc	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 19:01:57.166143
bf8cf3e8-247e-49d7-a280-b1ce1d02b2fc	8	ipd.admit	admission	8	{"bedId": 5, "patientId": 1, "admissionNo": "IPD000008"}	\N	2026-06-20 19:01:57.87134
f91812c1-a642-45a0-84af-b31c97fa64c4	8	ipd.advance	admission	8	{"amount": 5000, "paymentType": "CASH"}	\N	2026-06-20 19:01:57.944755
a1254ad1-334d-4f5e-b7f1-75acf894c8a1	8	ipd.order	doctor_order	5	{"orderType": "medication", "admissionId": 8}	\N	2026-06-20 19:01:57.957514
fa3b46a1-076f-4966-8311-7341013f36b7	8	ipd.mar	medication_administration	5	{"action": "given", "medOrderId": 5, "allergyOverride": false}	\N	2026-06-20 19:01:57.973157
1ef874f5-d5db-438d-a36b-af20a00da6b9	8	ipd.discharge	admission	8	{"netDue": "0", "dischargeType": "normal"}	\N	2026-06-20 19:01:58.01607
69e93eea-8667-41cc-a8d5-91e5c61a5699	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 19:43:40.175192
29bd2e28-b85d-4c7a-bdf5-a6e2534f066a	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 19:43:40.221102
5159115a-f4ee-4e3b-8021-e2ba61df73e8	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 19:43:40.26185
65f9f6b6-3228-4cd2-a1ce-b82caaba38ce	8	ipd.admit	admission	9	{"bedId": 5, "patientId": 1, "admissionNo": "IPD000009"}	\N	2026-06-20 19:43:40.596499
92947fea-6257-471c-9c1f-1c76bda4679d	8	ipd.advance	admission	9	{"amount": 5000, "paymentType": "CASH"}	\N	2026-06-20 19:43:40.645734
98a0c2d0-5223-49c3-bad6-2f6b5bc1940a	8	ipd.order	doctor_order	6	{"orderType": "medication", "admissionId": 9}	\N	2026-06-20 19:43:40.653778
db93a28d-edbc-4724-b1e6-fa1babaa0999	8	ipd.mar	medication_administration	6	{"action": "given", "medOrderId": 6, "allergyOverride": false}	\N	2026-06-20 19:43:40.663469
32dfc1f8-e7cf-4b6c-8807-6b8960ce3ffc	8	ipd.discharge	admission	9	{"netDue": "0", "dischargeType": "normal"}	\N	2026-06-20 19:43:40.690385
a7986e09-4d8a-47de-aac1-75b01cf16fa0	9	Login success	auth	SCN_RECEP	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "SCN_RECEP", "userName": "Scenario Receptionist", "userAgent": "node"}	\N	2026-06-20 20:50:11.428619
5c75c5c3-da09-4294-afd1-2a33d83639ed	8	Login success	auth	SCN_ADMIN	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "SCN_ADMIN", "userName": "Scenario Admin", "userAgent": "node"}	\N	2026-06-20 20:50:11.479549
1a7b3673-fe1a-4ff7-9718-a74023c79a32	\N	Login success	auth	SCN_DOC	{"ip": "::1", "role": "Doctor", "outcome": "success", "userCode": "SCN_DOC", "userName": "Scenario Doctor", "userAgent": "node"}	\N	2026-06-20 20:50:11.527009
25bd5df0-098e-4d00-9a80-d11c59ec1f1b	8	ipd.admit	admission	10	{"bedId": 5, "patientId": 1, "admissionNo": "IPD000010"}	\N	2026-06-20 20:50:12.060859
60b40ba4-9a84-42e1-b651-f298033184d3	8	ipd.advance	admission	10	{"amount": 5000, "paymentType": "CASH"}	\N	2026-06-20 20:50:12.117144
477f4f70-3fc0-4391-9450-5dff722b7e08	8	ipd.order	doctor_order	7	{"orderType": "medication", "admissionId": 10}	\N	2026-06-20 20:50:12.126529
b17dd93f-926b-4e78-8ef0-9cdab0117a05	8	ipd.mar	medication_administration	7	{"action": "given", "medOrderId": 7, "allergyOverride": false}	\N	2026-06-20 20:50:12.137328
7655984d-e759-4405-8ebe-2430fce2f88f	8	ipd.discharge	admission	10	{"netDue": "0", "dischargeType": "normal"}	\N	2026-06-20 20:50:12.16754
00243acf-f11b-4b79-a737-337e6e6dcbdc	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 00:53:53.706675
fb2597bc-c079-419b-8596-7a7251916b9d	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 01:02:54.35221
84337fad-6c81-40f4-ae9f-9d9b1d93710c	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 03:32:51.637153
8c43380c-fb97-47eb-b8c8-7c7c3a1a5da7	2	Login success	auth	STF002	{"ip": "::1", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 03:33:01.002573
3960ebee-f556-479d-853c-fcebd32a1c45	2	Logout	auth	STF002	{"ip": "::1", "role": "Pharmacist", "outcome": "success", "userCode": "STF002", "userName": "Naveed Khan", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 08:03:31.728907
d8098cb1-2bc2-4787-ae63-2e97e88d57de	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 08:06:32.700056
66b1f9c7-deea-41dc-8f35-8c9d1c932832	1	Attendance check-in marked	staff_attendance	b94eefc0-0055-442c-8e38-80456050520f	{"date": "2026-06-21", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF001", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-06-21 08:07:10.615818
f2d50282-a161-4d19-a015-18c935cdd807	1	Logout	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 08:07:18.309594
1963601c-7bca-4fbf-960e-1511b79794ad	4	Login success	auth	STF004	{"ip": "::1", "role": "Cashier", "outcome": "success", "userCode": "STF004", "userName": "Imran Ali", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 08:07:30.914781
595b288c-5ff4-4188-b267-f1fe80d9ca5b	4	Logout	auth	STF004	{"ip": "::1", "role": "Cashier", "outcome": "success", "userCode": "STF004", "userName": "Imran Ali", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 08:08:01.564839
53541063-05df-47b4-b70e-bb728b3ea0bb	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 08:08:14.791979
f3f77e28-9ed1-425d-8197-27b6137c1dd1	6	Logout	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 13:24:22.281589
9aca8746-1e32-4ba5-8ed5-f2b3fa8530f0	3	Login success	auth	STF003	{"ip": "::1", "role": "Lab_Technician", "outcome": "success", "userCode": "STF003", "userName": "Ayesha Malik", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 13:24:32.917069
5556e206-7438-443b-ab9b-3b08ebb589d4	3	Logout	auth	STF003	{"ip": "::1", "role": "Lab_Technician", "outcome": "success", "userCode": "STF003", "userName": "Ayesha Malik", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 14:37:37.251437
9e6ae073-8eaa-4126-a773-6871db67a2d6	6	Login success	auth	STF006	{"ip": "::1", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"}	\N	2026-06-21 14:37:54.262708
99b874d9-57e0-45a7-9e75-51902b145225	3	lab.results.enter	lab_order	1	{"entered": 2, "criticalCount": 0}	\N	2026-06-21 16:02:53.71739
c654e2a3-5fe8-4b46-88a2-79751a97d058	3	lab.results.enter	lab_order	2	{"entered": 1, "criticalCount": 0}	\N	2026-06-21 16:02:53.730047
4b13b1b1-949e-419a-9eac-ad70e0a25832	3	lab.results.enter	lab_order	3	{"entered": 2, "criticalCount": 0}	\N	2026-06-21 16:02:53.736171
4637374c-eeec-41e7-92f8-b6cf1ff6a3ab	3	lab.results.enter	lab_order	4	{"entered": 1, "criticalCount": 0}	\N	2026-06-21 16:02:53.741674
a8b7e4cd-eebd-49f2-bdb2-3fb3d0b5ca64	3	lab.results.enter	lab_order	5	{"entered": 1, "criticalCount": 0}	\N	2026-06-21 16:02:53.746554
70cd8a10-c8da-4313-9f57-e93b0afb868d	3	lab.results.enter	lab_order	7	{"entered": 2, "criticalCount": 0}	\N	2026-06-21 16:02:53.753423
97b3f08f-f7fe-45e9-8f73-6d932faf75f1	4	Cashier payment settled	cashier_payment_txn	1	{"amount": 1100, "billId": 51, "visitId": 59, "dueAfter": 0, "paidAfter": 1100, "receiptNo": "CPT-20260621-1", "paymentType": "CASH", "paymentStatus": "Paid"}	\N	2026-06-21 16:02:53.788277
8cd2e109-b89f-4502-be97-dde21adc7494	4	Cashier payment settled	cashier_payment_txn	2	{"amount": 400, "billId": 50, "visitId": 58, "dueAfter": 400, "paidAfter": 400, "receiptNo": "CPT-20260621-2", "paymentType": "CARD", "paymentStatus": "Partial"}	\N	2026-06-21 16:02:53.819049
59eef986-5cc2-47b3-9171-098c1e2f2f07	4	Cashier payment settled	cashier_payment_txn	3	{"amount": 1500, "billId": 48, "visitId": 56, "dueAfter": 0, "paidAfter": 1500, "receiptNo": "CPT-20260621-3", "paymentType": "CARD", "paymentStatus": "Paid"}	\N	2026-06-21 16:02:53.82685
a2ad8120-828b-4902-a4ff-89e38185f346	4	Cashier payment settled	cashier_payment_txn	4	{"amount": 400, "billId": 47, "visitId": 55, "dueAfter": 400, "paidAfter": 400, "receiptNo": "CPT-20260621-4", "paymentType": "CASH", "paymentStatus": "Partial"}	\N	2026-06-21 16:02:53.836654
1299cadb-8c84-46d6-830e-b3dd527c0f9b	4	Cashier payment settled	cashier_payment_txn	5	{"amount": 2300, "billId": 45, "visitId": 53, "dueAfter": 0, "paidAfter": 2300, "receiptNo": "CPT-20260621-5", "paymentType": "CASH", "paymentStatus": "Paid"}	\N	2026-06-21 16:02:53.849002
f41ad0cc-17ff-4c1c-845b-edd4ec31effa	4	Cashier payment settled	cashier_payment_txn	6	{"amount": 250, "billId": 44, "visitId": 52, "dueAfter": 250, "paidAfter": 250, "receiptNo": "CPT-20260621-6", "paymentType": "CARD", "paymentStatus": "Partial"}	\N	2026-06-21 16:02:53.86407
51781085-6c76-425e-b3ec-d1b27581dc1e	4	Cashier payment settled	cashier_payment_txn	7	{"amount": 300, "billId": 41, "visitId": 47, "dueAfter": 0, "paidAfter": 300, "receiptNo": "CPT-20260621-7", "paymentType": "CARD", "paymentStatus": "Paid"}	\N	2026-06-21 16:02:53.872638
f62546dc-639f-45bf-a96b-f32ced015541	\N	Lab sample collected	lab_order	6	{"collectedBy": 3, "specimenType": "Whole Blood (EDTA)"}	\N	2026-06-21 16:04:56.024987
037415b6-cbbf-4713-9374-e7e37c00cccd	\N	Lab sample collected	lab_order	8	{"collectedBy": 3, "specimenType": "Serum"}	\N	2026-06-21 16:04:56.042541
bc816c32-7cb8-4555-b5b8-c8910d977531	\N	Lab sample collected	lab_order	9	{"collectedBy": 3, "specimenType": "Urine"}	\N	2026-06-21 16:04:56.048472
8de76712-6955-4f64-b6e8-3e55a0acf772	\N	Lab sample collected	lab_order	10	{"collectedBy": 3, "specimenType": "Plasma"}	\N	2026-06-21 16:04:56.054894
199cd77c-571d-4920-94e7-ad23e8a95ec7	\N	Lab sample collected	lab_order	12	{"collectedBy": 3, "specimenType": "Serum"}	\N	2026-06-21 16:04:56.061816
e279e0bc-5be1-4e24-a289-9f294ff30d27	\N	Lab sample collected	lab_order	13	{"collectedBy": 3, "specimenType": "Urine"}	\N	2026-06-21 16:04:56.068865
dff500a4-3094-488e-9052-df114c1e0a8e	\N	Lab sample collected	lab_order	14	{"collectedBy": 3, "specimenType": "Plasma"}	\N	2026-06-21 16:04:56.074506
\.


--
-- Data for Name: bed; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bed (bed_id, room_id, bed_number, daily_rate, status, is_active, created_at) FROM stdin;
5	5	SCN-B1	2000	vacant	t	2026-06-20 14:56:52.299095
\.


--
-- Data for Name: bed_transfer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bed_transfer (transfer_id, admission_id, from_bed_id, to_bed_id, transfer_datetime, reason, by_staff_id, created_at) FROM stdin;
\.


--
-- Data for Name: bill; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill (bill_id, patient_id, visit_id, total_amount, payment_status, created_at) FROM stdin;
1	6	7	0.00	Unpaid	2026-02-07 02:49:17.488985
2	1	8	0.00	Unpaid	2026-02-07 02:49:45.352506
3	6	9	0.00	Unpaid	2026-02-08 13:31:32.04573
4	6	10	0.00	Unpaid	2026-02-08 13:31:33.275504
5	6	11	0.00	Unpaid	2026-02-08 13:31:33.849509
6	6	12	0.00	Unpaid	2026-02-08 13:31:34.644125
7	6	13	0.00	Unpaid	2026-02-08 13:31:34.830041
8	6	14	0.00	Unpaid	2026-02-08 13:31:35.20173
9	6	15	0.00	Unpaid	2026-02-10 03:35:14.706343
10	2	16	0.00	Unpaid	2026-02-10 03:36:03.018284
11	2	17	0.00	Unpaid	2026-02-10 03:36:03.78014
12	2	18	0.00	Unpaid	2026-02-10 03:36:05.166311
13	1	19	0.00	Unpaid	2026-03-02 04:03:52.204541
14	1	20	0.00	Unpaid	2026-03-02 04:03:56.705788
15	6	21	0.00	Unpaid	2026-03-03 03:07:25.726684
16	6	22	0.00	Unpaid	2026-03-03 03:07:32.902754
17	6	23	0.00	Unpaid	2026-03-03 03:07:34.347203
18	6	24	0.00	Unpaid	2026-03-03 03:07:34.56142
19	6	25	0.00	Unpaid	2026-03-03 03:07:38.925326
20	6	26	0.00	Unpaid	2026-03-03 03:07:39.037738
21	6	27	0.00	Unpaid	2026-03-03 03:07:39.502995
22	6	28	0.00	Unpaid	2026-03-03 03:07:40.587614
23	6	29	0.00	Unpaid	2026-03-03 03:07:40.809511
24	6	30	0.00	Unpaid	2026-03-03 03:28:59.378245
25	1	31	0.00	Unpaid	2026-03-03 03:29:49.746305
26	3	32	0.00	Unpaid	2026-03-03 03:47:15.795659
27	4	33	0.00	Unpaid	2026-03-03 03:47:35.33195
28	6	34	0.00	Unpaid	2026-03-03 04:28:42.387333
29	6	35	0.00	Unpaid	2026-03-04 04:21:57.60424
30	6	36	0.00	Unpaid	2026-03-04 04:22:03.50912
31	6	37	0.00	Unpaid	2026-03-04 04:22:03.673181
32	6	38	0.00	Unpaid	2026-03-04 04:22:04.145632
33	6	39	0.00	Unpaid	2026-03-04 04:22:05.078326
34	1	40	0.00	Unpaid	2026-03-04 19:14:21.752007
35	6	41	0.00	Unpaid	2026-03-04 19:15:36.804535
36	5	42	0.00	Unpaid	2026-03-05 08:05:43.605026
38	1	44	0.00	Unpaid	2026-03-14 05:06:52.215856
42	3	48	0.00	Unpaid	2026-03-18 14:30:17.126949
52	10	60	0.00	Unpaid	2026-03-23 13:01:13.735928
53	12	61	0.00	Unpaid	2026-03-23 14:14:14.6735
54	10	62	0.00	Unpaid	2026-03-23 14:59:34.346632
55	12	63	0.00	Unpaid	2026-03-26 08:14:48.270603
56	1	64	0.00	Unpaid	2026-03-26 08:18:22.226102
57	10	65	0.00	Unpaid	2026-03-26 08:21:41.081277
58	11	66	0.00	Unpaid	2026-03-30 03:47:48.695344
59	10	67	0.00	Unpaid	2026-03-30 03:50:04.307191
60	15	68	0.00	Unpaid	2026-04-02 11:10:41.992168
61	10	69	0.00	Unpaid	2026-04-02 11:15:41.44232
62	10	70	0.00	Unpaid	2026-04-19 09:50:39.25616
63	11	71	0.00	Unpaid	2026-04-19 17:04:58.631048
49	1	57	800.00	Unpaid	2026-03-22 03:52:00.932678
46	6	54	300.00	Unpaid	2026-03-21 13:41:51.443668
43	6	51	1100.00	Unpaid	2026-03-19 03:17:38.430736
51	11	59	1100.00	Paid	2026-03-23 11:56:20.653795
50	10	58	800.00	Partial	2026-03-23 03:34:04.592437
48	6	56	1500.00	Paid	2026-03-22 03:51:43.825294
47	1	55	800.00	Partial	2026-03-21 19:37:21.129601
45	2	53	2300.00	Paid	2026-03-19 03:18:28.080864
44	1	52	500.00	Partial	2026-03-19 03:18:04.235656
41	1	47	300.00	Paid	2026-03-18 09:44:07.058623
40	6	46	300.00	Unpaid	2026-03-18 09:43:42.819438
39	6	45	1300.00	Unpaid	2026-03-14 06:22:32.7918
37	6	43	1500.00	Unpaid	2026-03-05 15:37:56.284362
64	4	4	300.00	Unpaid	2026-06-21 16:05:22.81916
\.


--
-- Data for Name: bill_charge_source; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_charge_source (bill_charge_source_id, bill_id, bill_item_id, source_type, source_id, amount, meta_json, created_by, created_at) FROM stdin;
1	51	1	lab	1	800.00	{"orderId": 1, "testName": "Complete Blood Count", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.519997
2	51	2	lab	2	300.00	{"orderId": 2, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.519997
3	50	3	lab	3	800.00	{"orderId": 3, "testName": "Complete Blood Count", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.550614
4	49	4	lab	4	300.00	{"orderId": 4, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.560099
5	49	5	lab	5	500.00	{"orderId": 5, "testName": "Pregnancy Test (Urine)", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.560099
6	48	6	lab	6	1500.00	{"orderId": 6, "testName": "Lipid Profile", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.573361
7	47	7	lab	7	800.00	{"orderId": 7, "testName": "Complete Blood Count", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.581126
8	46	8	lab	8	300.00	{"orderId": 8, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.588795
9	45	9	lab	9	800.00	{"orderId": 9, "testName": "Complete Blood Count", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.595501
10	45	10	lab	10	1500.00	{"orderId": 10, "testName": "Lipid Profile", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.595501
11	44	11	lab	11	500.00	{"orderId": 11, "testName": "Pregnancy Test (Urine)", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.60313
12	43	12	lab	12	800.00	{"orderId": 12, "testName": "Complete Blood Count", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.608984
13	43	13	lab	13	300.00	{"orderId": 13, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.608984
14	41	14	lab	14	300.00	{"orderId": 14, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:02:53.616601
15	40	15	lab	15	300.00	{"orderId": 15, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:05:22.784727
16	39	16	lab	16	800.00	{"orderId": 16, "testName": "Complete Blood Count", "orderedByDoctor": 1}	\N	2026-06-21 16:05:22.803556
17	39	17	lab	17	500.00	{"orderId": 17, "testName": "Pregnancy Test (Urine)", "orderedByDoctor": 1}	\N	2026-06-21 16:05:22.803556
18	37	18	lab	18	1500.00	{"orderId": 18, "testName": "Lipid Profile", "orderedByDoctor": 1}	\N	2026-06-21 16:05:22.812102
19	64	19	lab	19	300.00	{"orderId": 19, "testName": "Blood Glucose", "orderedByDoctor": 1}	\N	2026-06-21 16:05:22.81916
\.


--
-- Data for Name: bill_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_item (item_id, bill_id, description, amount, quantity, created_at) FROM stdin;
1	51	Lab: Complete Blood Count	800.00	1	2026-06-21 16:02:53.519997
2	51	Lab: Blood Glucose	300.00	1	2026-06-21 16:02:53.519997
3	50	Lab: Complete Blood Count	800.00	1	2026-06-21 16:02:53.550614
4	49	Lab: Blood Glucose	300.00	1	2026-06-21 16:02:53.560099
5	49	Lab: Pregnancy Test (Urine)	500.00	1	2026-06-21 16:02:53.560099
6	48	Lab: Lipid Profile	1500.00	1	2026-06-21 16:02:53.573361
7	47	Lab: Complete Blood Count	800.00	1	2026-06-21 16:02:53.581126
8	46	Lab: Blood Glucose	300.00	1	2026-06-21 16:02:53.588795
9	45	Lab: Complete Blood Count	800.00	1	2026-06-21 16:02:53.595501
10	45	Lab: Lipid Profile	1500.00	1	2026-06-21 16:02:53.595501
11	44	Lab: Pregnancy Test (Urine)	500.00	1	2026-06-21 16:02:53.60313
12	43	Lab: Complete Blood Count	800.00	1	2026-06-21 16:02:53.608984
13	43	Lab: Blood Glucose	300.00	1	2026-06-21 16:02:53.608984
14	41	Lab: Blood Glucose	300.00	1	2026-06-21 16:02:53.616601
15	40	Lab: Blood Glucose	300.00	1	2026-06-21 16:05:22.784727
16	39	Lab: Complete Blood Count	800.00	1	2026-06-21 16:05:22.803556
17	39	Lab: Pregnancy Test (Urine)	500.00	1	2026-06-21 16:05:22.803556
18	37	Lab: Lipid Profile	1500.00	1	2026-06-21 16:05:22.812102
19	64	Lab: Blood Glucose	300.00	1	2026-06-21 16:05:22.81916
\.


--
-- Data for Name: bill_pharmacy_sale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_pharmacy_sale (bill_pharmacy_sale_id, bill_id, sale_id, amount, settled_amount, settlement_status, created_by, settled_by, settled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cashier_audit_event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_audit_event (cashier_audit_event_id, event_type, bill_id, visit_id, cashier_payment_txn_id, actor_staff_id, before_json, after_json, reason_code, reason_note, created_at) FROM stdin;
1	settle_success	51	59	1	4	{"dueBefore": 1100, "paidBefore": 0}	{"dueAfter": 0, "paidAfter": 1100, "receiptNo": "CPT-20260621-1", "paymentStatus": "Paid"}	\N	\N	2026-06-21 16:02:53.788277
2	settle_success	50	58	2	4	{"dueBefore": 800, "paidBefore": 0}	{"dueAfter": 400, "paidAfter": 400, "receiptNo": "CPT-20260621-2", "paymentStatus": "Partial"}	\N	\N	2026-06-21 16:02:53.819049
3	settle_success	48	56	3	4	{"dueBefore": 1500, "paidBefore": 0}	{"dueAfter": 0, "paidAfter": 1500, "receiptNo": "CPT-20260621-3", "paymentStatus": "Paid"}	\N	\N	2026-06-21 16:02:53.82685
4	settle_success	47	55	4	4	{"dueBefore": 800, "paidBefore": 0}	{"dueAfter": 400, "paidAfter": 400, "receiptNo": "CPT-20260621-4", "paymentStatus": "Partial"}	\N	\N	2026-06-21 16:02:53.836654
5	settle_success	45	53	5	4	{"dueBefore": 2300, "paidBefore": 0}	{"dueAfter": 0, "paidAfter": 2300, "receiptNo": "CPT-20260621-5", "paymentStatus": "Paid"}	\N	\N	2026-06-21 16:02:53.849002
6	settle_success	44	52	6	4	{"dueBefore": 500, "paidBefore": 0}	{"dueAfter": 250, "paidAfter": 250, "receiptNo": "CPT-20260621-6", "paymentStatus": "Partial"}	\N	\N	2026-06-21 16:02:53.86407
7	settle_success	41	47	7	4	{"dueBefore": 300, "paidBefore": 0}	{"dueAfter": 0, "paidAfter": 300, "receiptNo": "CPT-20260621-7", "paymentStatus": "Paid"}	\N	\N	2026-06-21 16:02:53.872638
\.


--
-- Data for Name: cashier_idempotency; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_idempotency (cashier_idempotency_id, idempotency_key, endpoint, bill_id, request_hash, response_json, status_code, created_by, created_at) FROM stdin;
1	86f2b701-b9b0-47aa-aa6e-1de59d92fa83	/api/cashier/settle	51	{"billId":51,"amount":1100,"paymentType":"CASH"}	{"data": {"billId": 51, "visitId": 59, "dueAmount": 0, "receiptNo": "CPT-20260621-1", "paidAmount": 1100, "totalAmount": 1100, "paymentStatus": "Paid", "cashierPaymentTxnId": 1}, "success": true}	200	4	2026-06-21 16:02:53.788277
2	bda07c56-c629-4d0c-b269-6e56b012c079	/api/cashier/settle	50	{"billId":50,"amount":400,"paymentType":"CARD"}	{"data": {"billId": 50, "visitId": 58, "dueAmount": 400, "receiptNo": "CPT-20260621-2", "paidAmount": 400, "totalAmount": 800, "paymentStatus": "Partial", "cashierPaymentTxnId": 2}, "success": true}	200	4	2026-06-21 16:02:53.819049
3	1e6d1c26-9a24-4d69-a175-3216d40b62b0	/api/cashier/settle	48	{"billId":48,"amount":1500,"paymentType":"CARD"}	{"data": {"billId": 48, "visitId": 56, "dueAmount": 0, "receiptNo": "CPT-20260621-3", "paidAmount": 1500, "totalAmount": 1500, "paymentStatus": "Paid", "cashierPaymentTxnId": 3}, "success": true}	200	4	2026-06-21 16:02:53.82685
4	42975fd2-7834-4af3-bc9e-6bb163715f19	/api/cashier/settle	47	{"billId":47,"amount":400,"paymentType":"CASH"}	{"data": {"billId": 47, "visitId": 55, "dueAmount": 400, "receiptNo": "CPT-20260621-4", "paidAmount": 400, "totalAmount": 800, "paymentStatus": "Partial", "cashierPaymentTxnId": 4}, "success": true}	200	4	2026-06-21 16:02:53.836654
5	d6bee01e-f023-458c-8da2-d93c856c7ead	/api/cashier/settle	45	{"billId":45,"amount":2300,"paymentType":"CASH"}	{"data": {"billId": 45, "visitId": 53, "dueAmount": 0, "receiptNo": "CPT-20260621-5", "paidAmount": 2300, "totalAmount": 2300, "paymentStatus": "Paid", "cashierPaymentTxnId": 5}, "success": true}	200	4	2026-06-21 16:02:53.849002
6	53bca653-126c-4d0d-9cf4-78154bcbd7bd	/api/cashier/settle	44	{"billId":44,"amount":250,"paymentType":"CARD"}	{"data": {"billId": 44, "visitId": 52, "dueAmount": 250, "receiptNo": "CPT-20260621-6", "paidAmount": 250, "totalAmount": 500, "paymentStatus": "Partial", "cashierPaymentTxnId": 6}, "success": true}	200	4	2026-06-21 16:02:53.86407
7	c894fa64-fbca-4023-8e6d-6656e25f19f5	/api/cashier/settle	41	{"billId":41,"amount":300,"paymentType":"CARD"}	{"data": {"billId": 41, "visitId": 47, "dueAmount": 0, "receiptNo": "CPT-20260621-7", "paidAmount": 300, "totalAmount": 300, "paymentStatus": "Paid", "cashierPaymentTxnId": 7}, "success": true}	200	4	2026-06-21 16:02:53.872638
\.


--
-- Data for Name: cashier_payment_allocation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_payment_allocation (cashier_payment_allocation_id, cashier_payment_txn_id, sale_id, bill_id, allocated_amount, created_at) FROM stdin;
\.


--
-- Data for Name: cashier_payment_txn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_payment_txn (cashier_payment_txn_id, bill_id, visit_id, amount, payment_type, payment_reference, notes, received_by, created_at, txn_type, reversed_from_txn_id, reversal_reason_code, reversal_reason_note, receipt_no) FROM stdin;
1	51	59	1100.00	CASH	\N	\N	4	2026-06-21 16:02:53.788277	payment	\N	\N	\N	CPT-20260621-1
2	50	58	400.00	CARD	\N	\N	4	2026-06-21 16:02:53.819049	payment	\N	\N	\N	CPT-20260621-2
3	48	56	1500.00	CARD	\N	\N	4	2026-06-21 16:02:53.82685	payment	\N	\N	\N	CPT-20260621-3
4	47	55	400.00	CASH	\N	\N	4	2026-06-21 16:02:53.836654	payment	\N	\N	\N	CPT-20260621-4
5	45	53	2300.00	CASH	\N	\N	4	2026-06-21 16:02:53.849002	payment	\N	\N	\N	CPT-20260621-5
6	44	52	250.00	CARD	\N	\N	4	2026-06-21 16:02:53.86407	payment	\N	\N	\N	CPT-20260621-6
7	41	47	300.00	CARD	\N	\N	4	2026-06-21 16:02:53.872638	payment	\N	\N	\N	CPT-20260621-7
\.


--
-- Data for Name: cashier_settlement_draft; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_settlement_draft (cashier_settlement_draft_id, bill_id, visit_id, amount, payment_type, payment_reference, notes, draft_status, created_by, applied_cashier_payment_txn_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cashier_shift; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_shift (cashier_shift_id, staff_id, opened_at, closed_at, opening_cash, closing_cash_counted, expected_cash, variance, status, notes, closed_by) FROM stdin;
\.


--
-- Data for Name: current_pregnancy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.current_pregnancy (pregnancy_id, patient_id, visit_id, multiple_pregnancy, complications, ultrasound_findings, fetal_heart_rate_bpm, placenta_position, presentation, gestational_age_weeks, notes) FROM stdin;
1	6	6	\N	\N	\N	150	Anterior	Cephalic	12	Baby is doing great
\.


--
-- Data for Name: doctor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctor (doctor_id, user_code, password, doctor_name, specialization, education, consultation_fee, emergency_fee, contact_number, email, created_at, employment_status, failed_login_attempts, last_failed_login_at, account_locked_until, last_login_at, password_changed_at, password_reset_token, password_reset_expires_at, mfa_enabled, session_version) FROM stdin;
3	DOC003	password123	Dr. Ali Raza	General Medicine	MBBS	1000.00	2000.00	03001230003	ali.raza@example.com	2026-02-06 11:42:40.173912	active	0	\N	\N	\N	2026-03-24 06:36:16.409066	\N	\N	f	1
4	DOC004	password123	Dr. Sara Malik	Pediatrics	MBBS, FCPS	1200.00	2500.00	03001230004	sara.malik@example.com	2026-02-06 11:42:40.173912	active	0	\N	\N	\N	2026-03-24 06:36:16.409066	\N	\N	f	1
5	DOC005	password123	Dr. Omar Siddiqui	Orthopedics	MBBS, MS	1800.00	3500.00	03001230005	omar.siddiqui@example.com	2026-02-06 11:42:40.173912	active	0	\N	\N	\N	2026-03-24 06:36:16.409066	\N	\N	f	1
2	DOC002	scrypt$a1107b7ae45b07baf92ff6c920195d7d$ef491ba16d4f339496a11873bd11a5200f5c41fea53d74e9397d63e5f08f0eb40ce309dde3314ef45284f835aeb2340fb080ecf432bbb07d4179657ecde0638b	Dr. Fatima Ali	Cardiology	MBBS, MD	2000.00	4000.00	03001230002	fatima.ali@example.com	2026-02-06 11:42:40.173912	active	0	\N	\N	2026-04-19 17:19:00.563007	2026-03-24 14:33:19.044785	\N	\N	f	1
1	DOC001	scrypt$18a5d9a5cacfefda7fae22e5925437e2$60bc8b3791f81535ee39f9161b560c8f7d04128db9a07a1452aad307bae8339f755f82834eba0ffd4eb48271daf11bc98eaf003a54cc795dd8c3f7e1e4c814ba	Dr. Ahmed Khan	Gynecology	MBBS, FCPS	1500.00	3000.00	03001230001	ahmed.khan@example.com	2026-02-06 11:42:40.173912	active	5	2026-06-20 11:19:50.002229	2026-06-20 11:34:49.965	2026-03-24 07:24:39.584513	2026-03-24 14:34:50.460504	\N	\N	f	8
6	SCN_DOC	scrypt$14eafadfde48ef5f0ec0c2d88ae4611f$33c2601328eb821da876269e6a40334fb16f91e6fd3330117638d9630680c006d0f808d665bcd20d6f6265af2b3d2caf52f93009a1866fa4859a9b7bfdaba034	Scenario Doctor	General	\N	0.00	0.00	\N	\N	2026-06-20 11:22:27.003723	active	0	\N	\N	2026-06-20 20:50:11.488886	2026-06-20 20:50:11.52521	\N	\N	f	1
\.


--
-- Data for Name: doctor_attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctor_attendance (attendance_id, doctor_id, date, check_in_time, check_out_time, status, marked_by, admin_id, roster_id, shift_code, check_in_source, check_out_source, late_minutes, early_leave_minutes, overtime_minutes, break_minutes, attendance_notes, derived_status, is_unscheduled, is_on_time, policy_snapshot) FROM stdin;
fe617cfc-8a47-49f2-957e-f0a63bd9fa63	2	2026-03-24	2026-03-24 14:34:06.618	2026-03-24 14:41:24.978	Present	Doctor	\N	\N	\N	self	self	0	0	0	0	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
9f527bb5-5172-49ab-b69b-09fce9bc4ce1	2	2026-03-25	2026-03-25 04:57:10.633	\N	Present	Doctor	\N	\N	\N	self	\N	0	0	0	0	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
21d6e952-21d4-4039-85a9-9146c84b017f	2	2026-03-26	2026-03-26 08:30:00.787	\N	Present	Doctor	\N	611	SHF112	self	\N	315	0	0	0	\N	late	f	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
b3a3fdf5-c209-49c3-b8c5-4980b9da8693	2	2026-04-02	2026-04-02 11:26:32.031	\N	Present	Doctor	\N	616	SHF112	self	\N	491	0	0	0	\N	late	f	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
369a064e-5c20-4abb-9664-e0b2a838d235	2	2026-04-19	2026-04-19 17:17:48.983	\N	Present	Doctor	\N	\N	\N	self	\N	0	0	0	0	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
\.


--
-- Data for Name: doctor_encounter_note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctor_encounter_note (doctor_encounter_note_id, visit_id, patient_id, doctor_id, reception_complaint, doctor_note, created_at, updated_at) FROM stdin;
1	2	2	3	Fever and Bodyache	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
2	3	3	5	Fracture in right arm	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
3	4	4	1	Prenatal Scan	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
4	5	5	4	Child Vaccination	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
5	16	2	3	chill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
6	17	2	3	chill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
7	18	2	3	chill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
8	40	1	5	e-c-s	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
9	1	1	5	e-c-s	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
10	8	1	5	e-c-s	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
11	19	1	5	e-c-s	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
12	20	1	5	e-c-s	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
13	41	6	3	huuojlkjlk	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
14	43	6	1	illl	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
15	45	6	1	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
16	48	3	3	sick	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
17	52	1	1	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
18	53	2	1	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
19	51	6	1	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
20	32	3	2	sick	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
21	33	4	4	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
22	31	1	5	e-c-s	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
23	42	5	2	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
24	44	1	2	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
25	46	6	1	ill	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
26	47	1	1	sick	\N	2026-03-19 08:18:41.701302	2026-03-19 08:18:41.701302
27	65	10	2	sick	lfjdsflsdaflsdf	2026-03-26 08:25:55.041008	2026-03-26 08:25:55.041008
\.


--
-- Data for Name: doctor_order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctor_order (order_id, admission_id, ordered_by_doctor_id, order_type, details, priority, status, start_dt, stop_dt, created_at) FROM stdin;
\.


--
-- Data for Name: doctor_security_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doctor_security_sessions (session_id, doctor_id, user_code, role, login_at, last_seen_at, ip_address, user_agent, revoked_at, revoked_reason) FROM stdin;
a1d014ad-d60c-4ca9-bb29-414077d76043	1	DOC001	Doctor	2026-03-24 06:42:13.303008	2026-03-24 06:42:13.303008	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 06:47:47.598929	forced_logout
a38f4b93-7f73-400f-84e9-562f5b676394	1	DOC001	Doctor	2026-03-24 06:50:37.030053	2026-03-24 06:50:37.030053	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 06:54:40.0276	forced_logout
cab75e59-d7f6-435a-a61d-fcb1a24785d7	1	DOC001	Doctor	2026-03-24 07:19:27.981993	2026-03-24 07:19:27.981993	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 07:23:29.02667	forced_logout
69b3eb6e-daa7-470d-b79a-391b7cd5bd2e	1	DOC001	Doctor	2026-03-24 07:23:37.452134	2026-03-24 07:23:37.452134	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 07:24:47.951142	password_reset
2dc07bdb-8550-4f64-9b8b-27476da709f4	1	DOC001	Doctor	2026-03-24 07:24:39.395256	2026-03-24 07:24:39.395256	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 07:24:47.951142	password_reset
2a31400e-0fd7-47a7-a57b-560e62154063	2	DOC002	Doctor	2026-03-24 14:33:18.038449	2026-03-24 14:33:18.038449	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 14:44:13.301497	logout
7f7a94da-88d8-4ba5-b51e-9225527a29d7	2	DOC002	Doctor	2026-03-24 14:44:18.812343	2026-03-24 14:44:18.812343	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
ea5aa4fa-6860-44fa-8bd5-c06ad9385658	2	DOC002	Doctor	2026-03-25 04:56:53.57088	2026-03-25 04:56:53.57088	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 06:00:10.665255	logout
26cf1b7d-b853-4280-9c9d-0265f224ee00	2	DOC002	Doctor	2026-03-25 06:00:56.097527	2026-03-25 06:00:56.097527	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 06:01:22.254957	logout
916284c2-9701-48f9-9d2b-2b188b4d357c	2	DOC002	Doctor	2026-03-26 08:19:32.876965	2026-03-26 08:19:32.876965	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-26 08:30:54.532299	logout
8bfa0985-3eec-44ec-835b-73b636526a6e	2	DOC002	Doctor	2026-03-30 03:49:34.079904	2026-03-30 03:49:34.079904	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
a2c0c653-9638-464b-ad8a-d292674010ed	2	DOC002	Doctor	2026-04-02 11:13:42.023443	2026-04-02 11:13:42.023443	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 14:18:31.954011	logout
65487e9e-d264-402e-839e-7708028c144b	2	DOC002	Doctor	2026-04-19 17:17:36.704536	2026-04-19 17:17:36.704536	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-19 17:17:55.957973	logout
c4c1a3ba-dd5a-4ee8-a1f2-921e175f8454	2	DOC002	Doctor	2026-04-19 17:18:24.220603	2026-04-19 17:18:24.220603	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-19 17:18:30.749996	logout
a4c3777a-c34d-477e-887b-e86b2aa670d7	2	DOC002	Doctor	2026-04-19 17:19:00.360923	2026-04-19 17:19:00.360923	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N
2614764c-8357-40ee-b287-fa3638060579	6	SCN_DOC	Doctor	2026-06-20 11:22:27.116431	2026-06-20 11:22:27.116431	::1	node	\N	\N
087db051-3038-466a-85da-9e26c804a70e	6	SCN_DOC	Doctor	2026-06-20 11:31:12.669211	2026-06-20 11:31:12.669211	::1	node	\N	\N
1bfa187b-4eb4-4ec3-b627-83bb4aaece3d	6	SCN_DOC	Doctor	2026-06-20 13:37:51.643876	2026-06-20 13:37:51.643876	::1	node	\N	\N
28a7f4fa-9a7b-41ec-bf60-6a6f9c857b6e	6	SCN_DOC	Doctor	2026-06-20 13:52:27.073912	2026-06-20 13:52:27.073912	::1	node	\N	\N
651c6ec0-b177-465e-bb1a-0faf96212139	6	SCN_DOC	Doctor	2026-06-20 14:56:51.682434	2026-06-20 14:56:51.682434	::1	node	\N	\N
401dd018-53ed-415a-84c2-d23b9cf1fcbf	6	SCN_DOC	Doctor	2026-06-20 14:58:11.680065	2026-06-20 14:58:11.680065	::1	node	\N	\N
f0a726f1-fc3d-45b4-bd4d-2c6ad88ddf82	6	SCN_DOC	Doctor	2026-06-20 19:01:57.117382	2026-06-20 19:01:57.117382	::1	node	\N	\N
396e0385-fe02-4645-8b99-41683ba27889	6	SCN_DOC	Doctor	2026-06-20 19:43:40.227506	2026-06-20 19:43:40.227506	::1	node	\N	\N
3975159c-15a8-4696-9984-97b1f3339574	6	SCN_DOC	Doctor	2026-06-20 20:50:11.486383	2026-06-20 20:50:11.486383	::1	node	\N	\N
\.


--
-- Data for Name: employee_allowance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_allowance (allowance_id, account_type, person_id, staff_id, doctor_id, allowance_code, allowance_name, amount, allowance_mode, taxable, is_active, effective_from, effective_to, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_compensation_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_compensation_profile (compensation_id, account_type, person_id, staff_id, doctor_id, salary_model, payroll_cycle, base_monthly_salary, per_patient_fee, active_from, active_to, notes, created_at, updated_at) FROM stdin;
2	staff	3	3	\N	fixed_monthly	monthly	0.00	0.00	2026-03-24	\N	Backfill: default fixed monthly profile	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
3	staff	4	4	\N	fixed_monthly	monthly	0.00	0.00	2026-03-24	\N	Backfill: default fixed monthly profile	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
5	staff	7	7	\N	fixed_monthly	monthly	0.00	0.00	2026-03-24	\N	Backfill: default fixed monthly profile	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
6	staff	1	1	\N	fixed_monthly	monthly	0.00	0.00	2026-03-24	\N	Backfill: default fixed monthly profile	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
7	staff	6	6	\N	fixed_monthly	monthly	0.00	0.00	2026-03-24	\N	Backfill: default fixed monthly profile	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
8	doctor	3	\N	3	per_patient_seen	monthly	0.00	1000.00	2026-03-24	\N	Backfill: per-patient model seeded from doctor.consultation_fee	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
9	doctor	4	\N	4	per_patient_seen	monthly	0.00	1200.00	2026-03-24	\N	Backfill: per-patient model seeded from doctor.consultation_fee	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
10	doctor	5	\N	5	per_patient_seen	monthly	0.00	1800.00	2026-03-24	\N	Backfill: per-patient model seeded from doctor.consultation_fee	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
11	doctor	2	\N	2	per_patient_seen	monthly	0.00	2000.00	2026-03-24	\N	Backfill: per-patient model seeded from doctor.consultation_fee	2026-03-24 16:54:46.054771	2026-03-24 16:54:46.054771
4	staff	5	5	\N	fixed_monthly	monthly	50000.00	0.00	2026-03-24	\N	\N	2026-03-24 16:54:46.054771	2026-03-24 17:23:22.218967
12	doctor	1	\N	1	per_patient_seen	monthly	0.00	1500.00	2026-03-24	\N	\N	2026-03-24 16:54:46.054771	2026-03-24 17:28:53.504805
1	staff	2	2	\N	fixed_monthly	monthly	60000.00	0.00	2026-03-24	\N	\N	2026-03-24 16:54:46.054771	2026-03-24 19:41:59.347839
\.


--
-- Data for Name: employee_credential_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_credential_events (credential_event_id, credential_id, actor_staff_id, event_type, from_status, to_status, event_note, payload, created_at) FROM stdin;
\.


--
-- Data for Name: employee_credential_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_credential_types (credential_type_id, credential_code, credential_name, credential_category, issuing_authority_default, validity_months, renewal_window_days, active, created_at) FROM stdin;
1	MED_LICENSE	Medical License	license	Medical Council	12	90	t	2026-03-25 12:19:58.634263
2	BLS	Basic Life Support	certification	Accredited Provider	24	60	t	2026-03-25 12:19:58.634263
3	ACLS	Advanced Cardiac Life Support	certification	Accredited Provider	24	60	t	2026-03-25 12:19:58.634263
4	DEA	Controlled Substance Registration	license	Regulatory Authority	36	120	t	2026-03-25 12:19:58.634263
\.


--
-- Data for Name: employee_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_credentials (credential_id, account_type, person_id, staff_id, doctor_id, credential_type_id, credential_number, credential_title, issued_on, expires_on, issuing_authority, issuing_country, verification_status, renewal_status, reminder_status, submitted_at, reviewed_by, reviewed_at, review_note, verified_at, revoked_by, revoked_at, revoke_reason, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_document_requirements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_document_requirements (requirement_id, document_type_id, target_type, target_value, mandatory, due_days_from_joining, recurrence_days, active, created_at) FROM stdin;
\.


--
-- Data for Name: employee_document_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_document_reviews (document_review_id, document_id, version_id, reviewer_staff_id, review_action, review_note, created_at) FROM stdin;
\.


--
-- Data for Name: employee_document_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_document_types (document_type_id, document_code, document_name, document_category, required_default, requires_expiry, retention_days, active, created_at) FROM stdin;
1	ID_PROOF	Government ID Proof	identity	t	f	3650	t	2026-03-25 12:19:58.634263
2	CONTRACT	Employment Contract	employment	t	f	3650	t	2026-03-25 12:19:58.634263
3	LICENSE_COPY	Professional License Copy	compliance	t	t	3650	t	2026-03-25 12:19:58.634263
4	BACKGROUND_CHECK	Background Verification	compliance	f	t	1825	t	2026-03-25 12:19:58.634263
\.


--
-- Data for Name: employee_document_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_document_versions (version_id, document_id, version_no, storage_path, file_url, file_name, mime_type, file_size_bytes, checksum_sha256, uploaded_by, uploaded_at, is_active, metadata) FROM stdin;
\.


--
-- Data for Name: employee_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_documents (document_id, account_type, person_id, staff_id, doctor_id, document_type_id, document_title, document_description, review_status, visibility, current_version_no, effective_from, effective_to, expires_on, required_by, submitted_by, submitted_at, reviewed_by, reviewed_at, review_note, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_lifecycle_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_lifecycle_events (lifecycle_event_id, lifecycle_run_id, lifecycle_task_id, actor_staff_id, event_type, from_status, to_status, event_note, payload, created_at) FROM stdin;
\.


--
-- Data for Name: employee_lifecycle_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_lifecycle_runs (lifecycle_run_id, account_type, person_id, staff_id, doctor_id, lifecycle_template_id, lifecycle_type, run_status, started_at, completed_at, initiated_by, summary_note, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_lifecycle_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_lifecycle_tasks (lifecycle_task_id, lifecycle_run_id, lifecycle_template_task_id, task_code, task_name, task_group, owner_staff_id, task_status, due_at, completed_at, completed_by, completion_note, evidence_document_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_lifecycle_template_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_lifecycle_template_tasks (lifecycle_template_task_id, lifecycle_template_id, task_code, task_name, task_group, sequence_no, default_owner_role, mandatory, due_offset_days, requires_document_type_id, blocks_transition, metadata, created_at) FROM stdin;
1	1	CREATE_ACCOUNT	Create User Account	it	1	Admin	t	0	\N	t	{"module": "access"}	2026-03-25 12:19:58.634263
2	1	COLLECT_DOCS	Collect Mandatory Documents	hr	2	Admin	t	7	\N	t	{"module": "documents"}	2026-03-25 12:19:58.634263
3	1	VERIFY_CREDENTIALS	Verify Credentials	compliance	3	Admin	t	14	\N	t	{"module": "credentialing"}	2026-03-25 12:19:58.634263
4	2	REVOKE_ACCESS	Revoke System Access	it	1	Admin	t	0	\N	t	{"module": "security"}	2026-03-25 12:19:58.634263
5	2	ASSET_HANDOVER	Complete Asset Handover	operations	2	Admin	t	2	\N	t	{"module": "lifecycle"}	2026-03-25 12:19:58.634263
6	2	ARCHIVE_RECORDS	Archive Employee Records	hr	3	Admin	t	5	\N	t	{"module": "documents"}	2026-03-25 12:19:58.634263
\.


--
-- Data for Name: employee_lifecycle_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_lifecycle_templates (lifecycle_template_id, template_code, template_name, lifecycle_type, applies_to, role_code, department, facility_code, is_active, metadata, created_by, created_at) FROM stdin;
1	ONBOARD_STD	Standard Onboarding	onboarding	both	\N	\N	\N	t	{"version": "v1"}	\N	2026-03-25 12:19:58.634263
2	OFFBOARD_STD	Standard Offboarding	offboarding	both	\N	\N	\N	t	{"version": "v1"}	\N	2026-03-25 12:19:58.634263
\.


--
-- Data for Name: fbr_invoice_submission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fbr_invoice_submission (submission_id, bill_id, status, fbr_invoice_number, qr_payload, error, attempts, created_at, submitted_at) FROM stdin;
4	51	queued	\N	\N	\N	0	2026-06-21 16:02:53.788277	\N
5	48	queued	\N	\N	\N	0	2026-06-21 16:02:53.82685	\N
6	45	queued	\N	\N	\N	0	2026-06-21 16:02:53.849002	\N
7	41	queued	\N	\N	\N	0	2026-06-21 16:02:53.872638	\N
\.


--
-- Data for Name: finance_asset_purchase; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_asset_purchase (asset_purchase_id, purchase_date, asset_name, asset_category, amount, vendor_name, reference_no, useful_life_months, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: finance_expense_category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_expense_category (code, label, description, created_at, updated_at) FROM stdin;
utilities	Utilities	Electricity, water, internet and utility bills	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
inventory	Inventory	General inventory not tracked as medicine purchase	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
maintenance	Maintenance	Repairs and upkeep	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
rent	Rent	Facility rent and related charges	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
equipment_service	Equipment Service	Machine service and AMC costs	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
salary_related	Salary Related	Payroll-linked overhead costs	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
other	Other	Any uncategorized operating expense	2026-03-24 16:56:15.28611+00	2026-03-24 16:56:15.28611+00
\.


--
-- Data for Name: finance_expense_entry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_expense_entry (expense_id, expense_date, category, subcategory, amount, vendor_name, reference_no, payment_mode, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: intake_output; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.intake_output (io_id, admission_id, recorded_dt, io_type, category, volume_ml, recorded_by_staff_id, created_at) FROM stdin;
\.


--
-- Data for Name: ip_advance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ip_advance (advance_id, admission_id, amount, payment_type, receipt_no, received_by, received_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: ip_charge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ip_charge (charge_id, admission_id, charge_type, description, qty, unit_rate, amount, source_ref, posted_by, posted_at, created_at) FROM stdin;
\.


--
-- Data for Name: ip_final_bill; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ip_final_bill (admission_id, gross_amount, discount_amount, advance_adjusted, net_due, settled, settled_at, settled_by, gate_pass_no, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_order (order_id, visit_id, test_id, ordered_by, performed_by, status, created_at, urgency, results_entered_at, results_entered_by, finalized_at, finalized_by, sample_collected_at, sample_collected_by, specimen_type) FROM stdin;
11	52	3	1	\N	Pending	2026-06-21 16:02:53.60313	Routine	\N	\N	\N	\N	\N	\N	\N
1	59	1	1	\N	Performed	2026-06-21 16:02:53.519997	Urgent	2026-06-21 16:02:53.71739	3	\N	\N	\N	\N	\N
2	59	2	1	\N	Performed	2026-06-21 16:02:53.519997	Urgent	2026-06-21 16:02:53.730047	3	\N	\N	\N	\N	\N
3	58	1	1	\N	Performed	2026-06-21 16:02:53.550614	Routine	2026-06-21 16:02:53.736171	3	\N	\N	\N	\N	\N
4	57	2	1	\N	Performed	2026-06-21 16:02:53.560099	Routine	2026-06-21 16:02:53.741674	3	\N	\N	\N	\N	\N
5	57	3	1	\N	Performed	2026-06-21 16:02:53.560099	Routine	2026-06-21 16:02:53.746554	3	\N	\N	\N	\N	\N
7	55	1	1	\N	Performed	2026-06-21 16:02:53.581126	Routine	2026-06-21 16:02:53.753423	3	\N	\N	\N	\N	\N
6	56	4	1	\N	Collected	2026-06-21 16:02:53.573361	Urgent	\N	\N	\N	\N	2026-06-21 16:04:56.024987	3	Whole Blood (EDTA)
8	54	2	1	\N	Collected	2026-06-21 16:02:53.588795	Routine	\N	\N	\N	\N	2026-06-21 16:04:56.042541	3	Serum
9	53	1	1	\N	Collected	2026-06-21 16:02:53.595501	Urgent	\N	\N	\N	\N	2026-06-21 16:04:56.048472	3	Urine
10	53	4	1	\N	Collected	2026-06-21 16:02:53.595501	Urgent	\N	\N	\N	\N	2026-06-21 16:04:56.054894	3	Plasma
12	51	1	1	\N	Collected	2026-06-21 16:02:53.608984	Routine	\N	\N	\N	\N	2026-06-21 16:04:56.061816	3	Serum
13	51	2	1	\N	Collected	2026-06-21 16:02:53.608984	Routine	\N	\N	\N	\N	2026-06-21 16:04:56.068865	3	Urine
14	47	2	1	\N	Collected	2026-06-21 16:02:53.616601	Urgent	\N	\N	\N	\N	2026-06-21 16:04:56.074506	3	Plasma
15	46	2	1	\N	Pending	2026-06-21 16:05:22.784727	Routine	\N	\N	\N	\N	\N	\N	\N
16	45	1	1	\N	Pending	2026-06-21 16:05:22.803556	Urgent	\N	\N	\N	\N	\N	\N	\N
17	45	3	1	\N	Pending	2026-06-21 16:05:22.803556	Urgent	\N	\N	\N	\N	\N	\N	\N
18	43	4	1	\N	Pending	2026-06-21 16:05:22.812102	Routine	\N	\N	\N	\N	\N	\N	\N
19	4	2	1	\N	Pending	2026-06-21 16:05:22.81916	Urgent	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: lab_result; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_result (order_id, lab_result, reported_by, reported_at, result_id) FROM stdin;
\.


--
-- Data for Name: lab_result_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_result_approvals (approval_id, order_id, approved_by, approval_status, approval_notes, approved_at, signature_data) FROM stdin;
\.


--
-- Data for Name: lab_test; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test (test_id, test_name, category, price, description) FROM stdin;
1	Complete Blood Count	Hematology	800.00	Comprehensive blood panel
2	Blood Glucose	Biochemistry	300.00	Fasting or Random sugar test
3	Pregnancy Test (Urine)	Serology	500.00	Urine HCG test
4	Lipid Profile	Biochemistry	1500.00	Cholesterol, HDL, LDL, Triglycerides
\.


--
-- Data for Name: lab_test_parameters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_parameters (parameter_id, test_id, parameter_name, parameter_code, unit, input_type, reference_range_min, reference_range_max, reference_value_text, display_order, is_critical, is_required, created_at) FROM stdin;
1	1	Haemoglobin	HB	g/dL	number	12.00	16.00	\N	0	f	t	2026-02-06 11:42:40.173912
2	1	WBC Count	WBC	x10^9/L	number	4.00	11.00	\N	0	f	t	2026-02-06 11:42:40.173912
3	2	Glucose (Fasting)	GLU_F	mg/dL	number	70.00	110.00	\N	0	f	t	2026-02-06 11:42:40.173912
4	3	HCG Status	HCG	\N	select	\N	\N	\N	0	f	t	2026-02-06 11:42:40.173912
\.


--
-- Data for Name: lab_test_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_test_results (result_id, order_id, parameter_id, result_value, is_abnormal, technician_notes, entered_by, entered_at, verified_by, verified_at) FROM stdin;
1	1	1	8	t	\N	3	2026-06-21 16:02:53.71739	\N	\N
2	1	2	7.5	f	\N	3	2026-06-21 16:02:53.71739	\N	\N
3	2	3	90	f	\N	3	2026-06-21 16:02:53.730047	\N	\N
4	3	1	14	f	\N	3	2026-06-21 16:02:53.736171	\N	\N
5	3	2	7.5	f	\N	3	2026-06-21 16:02:53.736171	\N	\N
6	4	3	90	f	\N	3	2026-06-21 16:02:53.741674	\N	\N
7	5	4	0	f	\N	3	2026-06-21 16:02:53.746554	\N	\N
8	7	1	14	f	\N	3	2026-06-21 16:02:53.753423	\N	\N
9	7	2	7.5	f	\N	3	2026-06-21 16:02:53.753423	\N	\N
\.


--
-- Data for Name: leave_employee_quota_override; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_employee_quota_override (override_id, account_type, person_id, staff_id, doctor_id, leave_type_id, annual_quota, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leave_role_quota; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_role_quota (role_quota_id, role_name, leave_type_id, annual_quota, active, created_at, updated_at) FROM stdin;
1	Receptionist	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
2	Lab_Technician	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
3	Admin	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
4	Super Admin	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
5	Cashier	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
6	Pharmacist	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
7	Nurse	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
8	Doctor	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
9	Front_Desk	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
10	Billing	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
11	Technician	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
12	Housekeeping	1	12.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
13	Receptionist	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
14	Lab_Technician	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
15	Admin	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
16	Super Admin	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
17	Cashier	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
18	Pharmacist	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
19	Nurse	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
20	Doctor	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
21	Front_Desk	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
22	Billing	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
23	Technician	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
24	Housekeeping	2	10.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
25	Receptionist	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
26	Lab_Technician	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
27	Admin	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
28	Super Admin	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
29	Cashier	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
30	Pharmacist	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
31	Nurse	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
32	Doctor	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
33	Front_Desk	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
34	Billing	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
35	Technician	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
36	Housekeeping	3	20.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
37	Receptionist	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
38	Lab_Technician	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
39	Admin	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
40	Super Admin	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
41	Cashier	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
42	Pharmacist	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
43	Nurse	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
44	Doctor	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
45	Front_Desk	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
46	Billing	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
47	Technician	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
48	Housekeeping	4	90.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
49	Receptionist	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
50	Lab_Technician	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
51	Admin	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
52	Super Admin	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
53	Cashier	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
54	Pharmacist	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
55	Nurse	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
56	Doctor	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
57	Front_Desk	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
58	Billing	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
59	Technician	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
60	Housekeeping	5	6.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
61	Receptionist	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
62	Lab_Technician	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
63	Admin	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
64	Super Admin	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
65	Cashier	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
66	Pharmacist	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
67	Nurse	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
68	Doctor	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
69	Front_Desk	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
70	Billing	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
71	Technician	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
72	Housekeeping	6	0.00	t	2026-03-24 16:51:29.557539	2026-03-24 16:51:29.557539
\.


--
-- Data for Name: medication_administration; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medication_administration (mar_id, med_order_id, scheduled_dt, action, administered_dt, administered_by_staff_id, dose_given, route, reason, notes, created_at) FROM stdin;
\.


--
-- Data for Name: medication_order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medication_order (med_order_id, order_id, medicine_id, drug_name, dose, route, frequency, schedule_times, created_at) FROM stdin;
\.


--
-- Data for Name: medicine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine (medicine_id, generic_name, brand_name, category, dosage_value, dosage_unit, form, created_at, barcode, sku, manufacturer, min_stock_level, max_stock_level, is_active, requires_prescription, search_vector, sub_unit, sub_units_per_unit, sub_unit_price, allow_sub_unit_sale, category_id, manufacturer_id, form_id, is_controlled, controlled_schedule) FROM stdin;
9	Azithromycin	Azomax	Antibiotic	250.00	mg	Capsule	2026-03-19 07:00:12.700101	HMS-AZOMAX-250	AZOMAX-250	Getz	12	300	t	t	'antibiot':3B 'azithromycin':1A 'azomax':2A	Blister	6	18.00	t	3	2	3	f	\N
10	Loratadine	Claritek	Antihistamine	10.00	mg	Tablet	2026-03-19 07:00:12.700101	HMS-CLARITEK-10	CLARITEK-10	Abbott	8	200	t	f	'antihistamin':3B 'claritek':2A 'loratadin':1A	Strip	10	2.20	t	4	1	2	f	\N
11	Esomeprazole	Nexum	Gastroprotective	20.00	mg	Capsule	2026-03-19 07:00:12.700101	HMS-NEXUM-20	NEXUM-20	GSK	10	250	t	f	'esomeprazol':1A 'gastroprotect':3B 'nexum':2A	Strip	10	5.50	t	2	3	3	f	\N
12	Diphenhydramine HCl	Benadryl Cough	Antihistamines	12.50	mg/5ml	Syrup	2026-03-23 08:53:52.213396	300450123456	JNJ-BEN-SYP-150	Johnson & Johnson	5	100	t	f	'antihistamin':5B 'benadryl':3A 'cough':4A 'diphenhydramin':1A 'hcl':2A	\N	1	\N	f	8	5	4	f	\N
2	Amoxicillin	Amoxil	Antibiotic	250.00	mg	Capsule	2026-02-06 11:42:40.173912	AMX001	MD-002	GSK	10	1000	t	f	'amoxicillin':1A 'amoxil':2A 'antibiot':3B	Blister	10	2.50	t	3	3	3	f	\N
3	Cefixime	Suprax	Antibiotic	200.00	mg	Tablet	2026-02-06 11:42:40.173912	SUP001	MD-003	Getz	10	1000	t	f	'antibiot':3B 'cefixim':1A 'suprax':2A	Strip	10	4.00	t	3	2	2	f	\N
4	Ibuprofen	Brufen	Analgesic	400.00	mg	Tablet	2026-02-06 11:42:40.173912	BRU001	MD-004	Abbott	10	1000	t	f	'analges':3B 'brufen':2A 'ibuprofen':1A	Strip	10	2.00	t	6	1	2	f	\N
5	Metformin	Glucophage	Anti-diabetic	500.00	mg	Tablet	2026-02-06 11:42:40.173912	GLU001	MD-005	Searle	10	1000	t	f	'anti':4B 'anti-diabet':3B 'diabet':5B 'glucophag':2A 'metformin':1A	Blister	10	5.00	t	5	4	2	f	\N
6	Omeprazole	Losec	Gastroprotective	20.00	mg	Capsule	2026-02-06 11:42:40.173912	LOS001	MD-006	Getz	10	1000	t	f	'gastroprotect':3B 'losec':2A 'omeprazol':1A	Strip	10	3.00	t	2	2	3	f	\N
8	Cetirizine	Zyrtec	Antihistamine	10.00	mg	Tablet	2026-02-06 11:42:40.173912	ZYR001	MD-008	GSK	10	1000	t	f	'antihistamin':3B 'cetirizin':1A 'zyrtec':2A	Blister	10	1.80	t	4	3	2	f	\N
1	Paracetamol	Panadol	Analgesic	500.00	mg	Tablet	2026-02-06 11:42:40.173912	PAN001	MD-001	GSK	10	1000	t	f	'analges':3B 'panadol':2A 'paracetamol':1A	Blister	10	1.50	t	6	3	2	f	\N
7	Salbutamol	Ventolin	Bronchodilator	100.00	mcg	Inhaler	2026-02-06 11:42:40.173912	VEN001	MD-007	GSK	10	1000	t	f	'bronchodil':3B 'salbutamol':1A 'ventolin':2A	Inhaler	1	250.00	f	1	3	1	f	\N
21	Paracetamol + Caffeine	Panadol Extra	Analgesic	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	GSK	20	5000	t	f	'analges':5B 'caffein':2A 'extra':4A 'panadol':3A 'paracetamol':1A	unit	10	\N	t	6	3	2	f	\N
22	Mefenamic Acid	Ponstan	Analgesic	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Pfizer	20	5000	t	f	'acid':2A 'analges':4B 'mefenam':1A 'ponstan':3A	unit	10	\N	t	6	8	2	f	\N
23	Paracetamol	Disprol	Analgesic	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Highnoon	20	5000	t	f	'analges':3B 'disprol':2A 'paracetamol':1A	unit	10	\N	t	6	11	2	f	\N
24	Diclofenac Sodium	Voltral	Analgesic	50.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Searle	20	5000	t	t	'analges':4B 'diclofenac':1A 'sodium':2A 'voltral':3A	unit	10	\N	t	6	4	2	f	\N
25	Amoxicillin + Clavulanate	Augmentin	Antibiotic	625.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	GSK	20	5000	t	t	'amoxicillin':1A 'antibiot':4B 'augmentin':3A 'clavulan':2A	unit	6	\N	t	3	3	2	f	\N
26	Metronidazole	Flagyl	Antibiotic	400.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Sanofi	20	5000	t	t	'antibiot':3B 'flagyl':2A 'metronidazol':1A	unit	10	\N	t	3	7	2	f	\N
27	Ciprofloxacin	Ciproxin	Antibiotic	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Bayer	20	5000	t	t	'antibiot':3B 'ciprofloxacin':1A 'ciproxin':2A	unit	10	\N	t	3	17	2	f	\N
28	Clarithromycin	Klaricid	Antibiotic	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Abbott	20	5000	t	t	'antibiot':3B 'clarithromycin':1A 'klaricid':2A	unit	7	\N	t	3	1	2	f	\N
29	Cephradine	Velosef	Antibiotic	500.00	mg	Capsule	2026-06-21 15:57:45.926079	\N	\N	GSK	20	5000	t	t	'antibiot':3B 'cephradin':1A 'velosef':2A	unit	12	\N	t	3	3	3	f	\N
30	Omeprazole	Risek	Gastroprotective	20.00	mg	Capsule	2026-06-21 15:57:45.926079	\N	\N	Getz Pharma	20	5000	t	f	'gastroprotect':3B 'omeprazol':1A 'risek':2A	unit	14	\N	t	2	6	3	f	\N
31	Domperidone	Motilium	Gastroprotective	10.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Abbott	20	5000	t	f	'domperidon':1A 'gastroprotect':3B 'motilium':2A	unit	10	\N	t	2	1	2	f	\N
32	Sodium Alginate	Gaviscon	Antacid	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	GSK	20	5000	t	f	'algin':2A 'antacid':4B 'gaviscon':3A 'sodium':1A	unit	16	\N	t	9	3	2	f	\N
33	Fexofenadine	Telfast	Antihistamine	120.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Sanofi	20	5000	t	f	'antihistamin':3B 'fexofenadin':1A 'telfast':2A	unit	10	\N	t	4	7	2	f	\N
34	Cetirizine	Softin	Antihistamine	10.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Hilton Pharma	20	5000	t	f	'antihistamin':3B 'cetirizin':1A 'softin':2A	unit	10	\N	t	4	9	2	f	\N
35	Pheniramine	Avil	Antihistamine	25.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Sanofi	20	5000	t	f	'antihistamin':3B 'avil':2A 'pheniramin':1A	unit	10	\N	t	4	7	2	f	\N
36	Gliclazide	Diamicron	Anti-diabetic	80.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Servier	20	5000	t	t	'anti':4B 'anti-diabet':3B 'diabet':5B 'diamicron':2A 'gliclazid':1A	unit	30	\N	t	5	18	2	f	\N
37	Sitagliptin	Januvia	Anti-diabetic	50.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Pfizer	20	5000	t	t	'anti':4B 'anti-diabet':3B 'diabet':5B 'januvia':2A 'sitagliptin':1A	unit	14	\N	t	5	8	2	f	\N
38	Atenolol	Tenormin	Cardiovascular	50.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Searle	20	5000	t	t	'atenolol':1A 'cardiovascular':3B 'tenormin':2A	unit	14	\N	t	11	4	2	f	\N
39	Bisoprolol	Concor	Cardiovascular	5.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Merck	20	5000	t	t	'bisoprolol':1A 'cardiovascular':3B 'concor':2A	unit	14	\N	t	11	19	2	f	\N
40	Amlodipine	Norvasc	Cardiovascular	5.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Pfizer	20	5000	t	t	'amlodipin':1A 'cardiovascular':3B 'norvasc':2A	unit	14	\N	t	11	8	2	f	\N
41	Atorvastatin	Lipiget	Cardiovascular	20.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Getz Pharma	20	5000	t	t	'atorvastatin':1A 'cardiovascular':3B 'lipiget':2A	unit	14	\N	t	11	6	2	f	\N
42	Clopidogrel	Cardexa	Cardiovascular	75.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Highnoon	20	5000	t	t	'cardexa':2A 'cardiovascular':3B 'clopidogrel':1A	unit	14	\N	t	11	11	2	f	\N
43	Valsartan	Diovan	Cardiovascular	80.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Novartis	20	5000	t	t	'cardiovascular':3B 'diovan':2A 'valsartan':1A	unit	14	\N	t	11	20	2	f	\N
44	Furosemide	Lasix	Cardiovascular	40.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Sanofi	20	5000	t	t	'cardiovascular':3B 'furosemid':1A 'lasix':2A	unit	10	\N	t	11	7	2	f	\N
45	Prednisolone	Deltacortril	Corticosteroid	5.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Pfizer	20	5000	t	t	'corticosteroid':3B 'deltacortril':2A 'prednisolon':1A	unit	20	\N	t	13	8	2	f	\N
46	Methylprednisolone	Medrol	Corticosteroid	4.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Pfizer	20	5000	t	t	'corticosteroid':3B 'medrol':2A 'methylprednisolon':1A	unit	10	\N	t	13	8	2	f	\N
47	Artemether + Lumefantrine	Coartem	Antimalarial	80.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Novartis	20	5000	t	t	'antimalari':4B 'artemeth':1A 'coartem':3A 'lumefantrin':2A	unit	24	\N	t	10	20	2	f	\N
48	Fluconazole	Fungone	Antifungal	150.00	mg	Capsule	2026-06-21 15:57:45.926079	\N	\N	Ferozsons	10	1000	t	t	'antifung':3B 'fluconazol':1A 'fungon':2A	\N	1	\N	f	12	12	3	f	\N
49	Multivitamin + Zinc	Surbex Z	Vitamin & Supplement	0.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Abbott	20	5000	t	f	'multivitamin':1A 'supplement':6B 'surbex':3A 'vitamin':5B 'z':4A 'zinc':2A	unit	30	\N	t	14	1	2	f	\N
50	Calcium + Vitamin C	CAC-1000	Vitamin & Supplement	1000.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	GSK	20	5000	t	f	'-1000':5A 'c':3A 'cac':4A 'calcium':1A 'supplement':7B 'vitamin':2A,6B	unit	10	\N	t	14	3	2	f	\N
51	Tranexamic Acid	Tranexa	Analgesic	500.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Bosch Pharma	20	5000	t	t	'acid':2A 'analges':4B 'tranexa':3A 'tranexam':1A	unit	10	\N	t	6	13	2	f	\N
52	Carbamazepine	Tegral	Analgesic	200.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Novartis	20	5000	t	t	'analges':3B 'carbamazepin':1A 'tegral':2A	unit	30	\N	t	6	20	2	f	\N
53	Bromazepam	Lexotanil	Analgesic	3.00	mg	Tablet	2026-06-21 15:57:45.926079	\N	\N	Roche	20	5000	t	t	'analges':3B 'bromazepam':1A 'lexotanil':2A	unit	30	\N	t	6	21	2	t	\N
54	Paracetamol	Calpol Syrup	Analgesic	120.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	f	'analges':4B 'calpol':2A 'paracetamol':1A 'syrup':3A	\N	1	\N	f	6	3	4	f	\N
55	Ibuprofen	Brufen Suspension	Analgesic	100.00	mg/5ml	Suspension	2026-06-21 15:57:45.926079	\N	\N	Abbott	10	1000	t	f	'analges':4B 'brufen':2A 'ibuprofen':1A 'suspens':3A	\N	1	\N	f	6	1	5	f	\N
56	Amoxicillin + Clavulanate	Augmentin Syrup	Antibiotic	156.00	mg/5ml	Suspension	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	t	'amoxicillin':1A 'antibiot':5B 'augmentin':3A 'clavulan':2A 'syrup':4A	\N	1	\N	f	3	3	5	f	\N
57	Clarithromycin	Klaricid Syrup	Antibiotic	125.00	mg/5ml	Suspension	2026-06-21 15:57:45.926079	\N	\N	Abbott	10	1000	t	t	'antibiot':4B 'clarithromycin':1A 'klaricid':2A 'syrup':3A	\N	1	\N	f	3	1	5	f	\N
58	Salbutamol	Ventolin Syrup	Bronchodilator	2.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	f	'bronchodil':4B 'salbutamol':1A 'syrup':3A 'ventolin':2A	\N	1	\N	f	1	3	4	f	\N
59	Diphenhydramine	Hydryllin	Antihistamine	0.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	Searle	10	1000	t	f	'antihistamin':3B 'diphenhydramin':1A 'hydryllin':2A	\N	1	\N	f	4	4	4	f	\N
60	Oral Rehydration Salts	Peditral	IV Fluid	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Searle	10	1000	t	f	'fluid':6B 'iv':5B 'oral':1A 'peditr':4A 'rehydr':2A 'salt':3A	\N	1	\N	f	16	4	8	f	\N
61	Metronidazole	Flagyl Suspension	Antibiotic	200.00	mg/5ml	Suspension	2026-06-21 15:57:45.926079	\N	\N	Sanofi	10	1000	t	t	'antibiot':4B 'flagyl':2A 'metronidazol':1A 'suspens':3A	\N	1	\N	f	3	7	5	f	\N
62	Omeprazole	Risek Syrup	Gastroprotective	0.00	mg/5ml	Suspension	2026-06-21 15:57:45.926079	\N	\N	Getz Pharma	10	1000	t	f	'gastroprotect':4B 'omeprazol':1A 'risek':2A 'syrup':3A	\N	1	\N	f	2	6	5	f	\N
63	Cetirizine	Softin Syrup	Antihistamine	5.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	Hilton Pharma	10	1000	t	f	'antihistamin':4B 'cetirizin':1A 'softin':2A 'syrup':3A	\N	1	\N	f	4	9	4	f	\N
64	Metronidazole + Diloxanide	Entamizole	Antibiotic	0.00	mg/5ml	Suspension	2026-06-21 15:57:45.926079	\N	\N	Abbott	10	1000	t	t	'antibiot':4B 'diloxanid':2A 'entamizol':3A 'metronidazol':1A	\N	1	\N	f	3	1	5	f	\N
65	Polymyxin B	Polyfax Drops	Antibiotic	0.00	ml	Drops	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	f	'antibiot':5B 'b':2A 'drop':4A 'polyfax':3A 'polymyxin':1A	\N	1	\N	f	3	3	9	f	\N
66	Butamirate	Sinecod	Bronchodilator	0.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	Novartis	10	1000	t	f	'bronchodil':3B 'butamir':1A 'sinecod':2A	\N	1	\N	f	1	20	4	f	\N
67	Iron Polymaltose	Ferinorm Syrup	Vitamin & Supplement	0.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	Highnoon	10	1000	t	f	'ferinorm':3A 'iron':1A 'polymaltos':2A 'supplement':6B 'syrup':4A 'vitamin':5B	\N	1	\N	f	14	11	4	f	\N
68	Bromhexine	Mucolator	Bronchodilator	4.00	mg/5ml	Syrup	2026-06-21 15:57:45.926079	\N	\N	Bosch Pharma	10	1000	t	f	'bromhexin':1A 'bronchodil':3B 'mucol':2A	\N	1	\N	f	1	13	4	f	\N
69	Ceftriaxone	Rocephin Inj	Injectable	1.00	g	Vial	2026-06-21 15:57:45.926079	\N	\N	Roche	10	1000	t	t	'ceftriaxon':1A 'inj':3A 'inject':4B 'rocephin':2A	\N	1	\N	f	15	21	7	f	\N
70	Amoxicillin + Clavulanate	Augmentin Inj	Injectable	12.00	g	Vial	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	t	'amoxicillin':1A 'augmentin':3A 'clavulan':2A 'inj':4A 'inject':5B	\N	1	\N	f	15	3	7	f	\N
71	Ketorolac	Toradol Inj	Injectable	30.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Sanofi	10	1000	t	t	'inj':3A 'inject':4B 'ketorolac':1A 'toradol':2A	\N	1	\N	f	15	7	6	f	\N
72	Dexamethasone	Dexa Inj	Injectable	4.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Highnoon	10	1000	t	t	'dexa':2A 'dexamethason':1A 'inj':3A 'inject':4B	\N	1	\N	f	15	11	6	f	\N
73	Hyoscine	Buscopan Inj	Injectable	20.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Sanofi	10	1000	t	t	'buscopan':2A 'hyoscin':1A 'inj':3A 'inject':4B	\N	1	\N	f	15	7	6	f	\N
74	Dimenhydrinate	Gravinate Inj	Injectable	50.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Searle	10	1000	t	t	'dimenhydrin':1A 'gravin':2A 'inj':3A 'inject':4B	\N	1	\N	f	15	4	6	f	\N
75	Human Insulin	Insulin Mixtard	Anti-diabetic	100.00	IU	Vial	2026-06-21 15:57:45.926079	\N	\N	Novo Nordisk	10	1000	t	t	'anti':6B 'anti-diabet':5B 'diabet':7B 'human':1A 'insulin':2A,3A 'mixtard':4A	\N	1	\N	f	5	22	7	f	\N
76	Insulin Glargine	Lantus	Anti-diabetic	100.00	IU	Vial	2026-06-21 15:57:45.926079	\N	\N	Sanofi	10	1000	t	t	'anti':5B 'anti-diabet':4B 'diabet':6B 'glargin':2A 'insulin':1A 'lantus':3A	\N	1	\N	f	5	7	7	f	\N
77	Ioversol	Optiray Inj	Injectable	0.00	ml	Vial	2026-06-21 15:57:45.926079	\N	\N	Guerbet	10	1000	t	t	'inj':3A 'inject':4B 'ioversol':1A 'optiray':2A	\N	1	\N	f	15	23	7	f	\N
78	Tramadol	Tramal Inj	Injectable	100.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Searle	10	1000	t	t	'inj':3A 'inject':4B 'tramadol':1A 'tramal':2A	\N	1	\N	f	15	4	6	t	\N
79	Morphine Sulphate	Morphine Inj	Injectable	10.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Local Generics	10	1000	t	t	'inj':4A 'inject':5B 'morphin':1A,3A 'sulphat':2A	\N	1	\N	f	15	16	6	t	\N
80	Diclofenac Sodium	Voltral Inj	Injectable	75.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Searle	10	1000	t	t	'diclofenac':1A 'inj':4A 'inject':5B 'sodium':2A 'voltral':3A	\N	1	\N	f	15	4	6	f	\N
81	Methylprednisolone	Solu-Medrol	Injectable	500.00	mg	Vial	2026-06-21 15:57:45.926079	\N	\N	Pfizer	10	1000	t	t	'inject':5B 'medrol':4A 'methylprednisolon':1A 'solu':3A 'solu-medrol':2A	\N	1	\N	f	15	8	7	f	\N
82	Dexamethasone	Decadron Inj	Corticosteroid	8.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Merck	10	1000	t	t	'corticosteroid':4B 'decadron':2A 'dexamethason':1A 'inj':3A	\N	1	\N	f	13	19	6	f	\N
83	Phytomenadione	Vitamin K Inj	Injectable	10.00	mg	Injection	2026-06-21 15:57:45.926079	\N	\N	Local Generics	10	1000	t	t	'inj':4A 'inject':5B 'k':3A 'phytomenadion':1A 'vitamin':2A	\N	1	\N	f	15	16	6	f	\N
84	Sodium Chloride	Normal Saline 0.9%	IV Fluid	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	f	'0.9':5A 'chlorid':2A 'fluid':7B 'iv':6B 'normal':3A 'salin':4A 'sodium':1A	\N	1	\N	f	16	24	8	f	\N
85	Compound Sodium Lactate	Ringer's Lactate	IV Fluid	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	f	'compound':1A 'fluid':8B 'iv':7B 'lactat':3A,6A 'ringer':4A 'sodium':2A	\N	1	\N	f	16	24	8	f	\N
86	Dextrose	Dextrose 5%	IV Fluid	5.00	%	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	f	'5':3A 'dextros':1A,2A 'fluid':5B 'iv':4B	\N	1	\N	f	16	24	8	f	\N
87	Dextrose	Dextrose 10%	IV Fluid	10.00	%	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	f	'10':3A 'dextros':1A,2A 'fluid':5B 'iv':4B	\N	1	\N	f	16	24	8	f	\N
88	Dextrose + Saline	DextroSaline	IV Fluid	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	f	'dextros':1A 'dextrosalin':3A 'fluid':5B 'iv':4B 'salin':2A	\N	1	\N	f	16	24	8	f	\N
89	Water for Injection	Sterile Water 500ml	IV Fluid	500.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	f	'500ml':6A 'fluid':8B 'inject':3A 'iv':7B 'steril':4A 'water':1A,5A	\N	1	\N	f	16	24	8	f	\N
90	Mannitol	Mannitol 20%	IV Fluid	20.00	%	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	t	'20':3A 'fluid':5B 'iv':4B 'mannitol':1A,2A	\N	1	\N	f	16	24	8	f	\N
91	Polygeline	Haemaccel	IV Fluid	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Hoechst	10	1000	t	t	'fluid':4B 'haemaccel':2A 'iv':3B 'polygelin':1A	\N	1	\N	f	16	25	8	f	\N
92	Metronidazole	Metronidazole IV	IV Fluid	500.00	mg	Solution	2026-06-21 15:57:45.926079	\N	\N	Sanofi	10	1000	t	t	'fluid':5B 'iv':3A,4B 'metronidazol':1A,2A	\N	1	\N	f	16	7	8	f	\N
93	Potassium Chloride	Potassium Chloride IV	IV Fluid	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Otsuka	10	1000	t	t	'chlorid':2A,4A 'fluid':7B 'iv':5A,6B 'potassium':1A,3A	\N	1	\N	f	16	24	8	f	\N
94	Syringe 3ml	Disposable Syringe 3cc	Consumables	3.00	ml	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'3cc':5A '3ml':2A 'consum':6B 'dispos':3A 'syring':1A,4A	\N	1	\N	f	18	14	12	f	\N
95	Syringe 5ml	Disposable Syringe 5cc	Consumables	5.00	ml	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'5cc':5A '5ml':2A 'consum':6B 'dispos':3A 'syring':1A,4A	\N	1	\N	f	18	14	12	f	\N
96	Syringe 10ml	Disposable Syringe 10cc	Consumables	10.00	ml	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'10cc':5A '10ml':2A 'consum':6B 'dispos':3A 'syring':1A,4A	\N	1	\N	f	18	14	12	f	\N
97	Insulin Syringe 1ml	Insulin Syringe	Consumables	1.00	ml	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'1ml':3A 'consum':6B 'insulin':1A,4A 'syring':2A,5A	\N	1	\N	f	18	14	12	f	\N
98	IV Cannula Pink	IV Cannula 20G	Surgical Supplies	20.00	G	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'20g':6A 'cannula':2A,5A 'iv':1A,4A 'pink':3A 'suppli':8B 'surgic':7B	\N	1	\N	f	17	15	11	f	\N
99	IV Cannula Blue	IV Cannula 22G	Surgical Supplies	22.00	G	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'22g':6A 'blue':3A 'cannula':2A,5A 'iv':1A,4A 'suppli':8B 'surgic':7B	\N	1	\N	f	17	15	11	f	\N
100	IV Cannula Yellow	IV Cannula 24G	Surgical Supplies	24.00	G	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'24g':6A 'cannula':2A,5A 'iv':1A,4A 'suppli':8B 'surgic':7B 'yellow':3A	\N	1	\N	f	17	15	11	f	\N
101	Latex Gloves Medium	Surgical Gloves M	Surgical Supplies	0.00	pair	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'glove':2A,5A 'latex':1A 'm':6A 'medium':3A 'suppli':8B 'surgic':4A,7B	\N	1	\N	f	17	14	12	f	\N
102	Latex Gloves Large	Surgical Gloves L	Surgical Supplies	0.00	pair	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'glove':2A,5A 'l':6A 'larg':3A 'latex':1A 'suppli':8B 'surgic':4A,7B	\N	1	\N	f	17	14	12	f	\N
103	Nitrile Gloves	Examination Gloves	Surgical Supplies	0.00	box	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	20	5000	t	f	'examin':3A 'glove':2A,4A 'nitril':1A 'suppli':6B 'surgic':5B	unit	100	\N	t	17	14	12	f	\N
104	Sterile Gauze 4x4	Gauze Swab	Surgical Supplies	0.00	pc	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'4x4':3A 'gauz':2A,4A 'steril':1A 'suppli':7B 'surgic':6B 'swab':5A	\N	1	\N	f	17	14	12	f	\N
105	Absorbent Cotton	Cotton Roll 500g	Consumables	500.00	g	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'500g':5A 'absorb':1A 'consum':6B 'cotton':2A,3A 'roll':4A	\N	1	\N	f	18	14	12	f	\N
106	Elastic Bandage	Crepe Bandage 4in	Surgical Supplies	4.00	in	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'4in':5A 'bandag':2A,4A 'crepe':3A 'elast':1A 'suppli':7B 'surgic':6B	\N	1	\N	f	17	14	12	f	\N
107	Surgical Tape	Adhesive Tape	Consumables	0.00	roll	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'adhes':3A 'consum':5B 'surgic':1A 'tape':2A,4A	\N	1	\N	f	18	14	12	f	\N
108	3-Ply Face Mask	Disposable Mask	Consumables	0.00	box	Consumable	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	20	5000	t	f	'3':1A 'consum':7B 'dispos':5A 'face':3A 'mask':4A,6A 'pli':2A	unit	50	\N	t	18	15	12	f	\N
109	Drip Set	IV Infusion Set	Surgical Supplies	0.00	pc	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'drip':1A 'infus':4A 'iv':3A 'set':2A,5A 'suppli':7B 'surgic':6B	\N	1	\N	f	17	15	11	f	\N
110	Foley Catheter	Urinary Catheter 16Fr	Surgical Supplies	16.00	Fr	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'16fr':5A 'cathet':2A,4A 'foley':1A 'suppli':7B 'surgic':6B 'urinari':3A	\N	1	\N	f	17	15	11	f	\N
111	Suction Tube	Suction Catheter	Surgical Supplies	0.00	pc	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'cathet':4A 'suction':1A,3A 'suppli':6B 'surgic':5B 'tube':2A	\N	1	\N	f	17	15	11	f	\N
112	Plastic Apron	Disposable Apron	Consumables	0.00	pc	Consumable	2026-06-21 15:57:45.926079	\N	\N	CarePlus Surgicals	10	1000	t	f	'apron':2A,4A 'consum':5B 'dispos':3A 'plastic':1A	\N	1	\N	f	18	14	12	f	\N
113	Isopropyl Swab	Alcohol Swab	Consumables	0.00	box	Consumable	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	20	5000	t	f	'alcohol':3A 'consum':5B 'isopropyl':1A 'swab':2A,4A	unit	100	\N	t	18	15	12	f	\N
114	Povidone Iodine	Pyodine Solution	Antiseptic	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Brookes	10	1000	t	f	'antisept':5B 'iodin':2A 'povidon':1A 'pyodin':3A 'solut':4A	\N	1	\N	f	21	26	8	f	\N
115	Chloroxylenol	Dettol Antiseptic	Antiseptic	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Reckitt	10	1000	t	f	'antisept':3A,4B 'chloroxylenol':1A 'dettol':2A	\N	1	\N	f	21	27	8	f	\N
116	Ethanol Gel	Hand Sanitizer 500ml	General Inventory	500.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Local Generics	10	1000	t	f	'500ml':5A 'ethanol':1A 'gel':2A 'general':6B 'hand':3A 'inventori':7B 'sanit':4A	\N	1	\N	f	19	16	8	f	\N
117	Thermometer	Digital Thermometer	General Inventory	0.00	pc	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'digit':2A 'general':4B 'inventori':5B 'thermomet':1A,3A	\N	1	\N	f	19	15	11	f	\N
118	Aneroid Sphygmomanometer	BP Apparatus	General Inventory	0.00	pc	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'aneroid':1A 'apparatus':4A 'bp':3A 'general':5B 'inventori':6B 'sphygmomanomet':2A	\N	1	\N	f	19	15	11	f	\N
119	Fingertip Oximeter	Pulse Oximeter	General Inventory	0.00	pc	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'fingertip':1A 'general':5B 'inventori':6B 'oximet':2A,4A 'puls':3A	\N	1	\N	f	19	15	11	f	\N
120	Nebulizer Kit	Nebulizer Mask	General Inventory	0.00	pc	Device	2026-06-21 15:57:45.926079	\N	\N	Medisure Devices	10	1000	t	f	'general':5B 'inventori':6B 'kit':2A 'mask':4A 'nebul':1A,3A	\N	1	\N	f	19	15	11	f	\N
121	Blood Glucose Strips	Glucometer Strips	General Inventory	0.00	box	Consumable	2026-06-21 15:57:45.926079	\N	\N	Abbott	20	5000	t	f	'blood':1A 'general':6B 'glucomet':4A 'glucos':2A 'inventori':7B 'strip':3A,5A	unit	50	\N	t	19	1	12	f	\N
122	Methylated Spirit	Surgical Spirit	Antiseptic	0.00	ml	Solution	2026-06-21 15:57:45.926079	\N	\N	Brookes	10	1000	t	f	'antisept':5B 'methyl':1A 'spirit':2A,4A 'surgic':3A	\N	1	\N	f	21	26	8	f	\N
123	Hydrogen Peroxide 3%	Hydrogen Peroxide	Antiseptic	3.00	%	Solution	2026-06-21 15:57:45.926079	\N	\N	Brookes	10	1000	t	f	'3':3A 'antisept':6B 'hydrogen':1A,4A 'peroxid':2A,5A	\N	1	\N	f	21	26	8	f	\N
124	Aminacrine + Cetrimide	Burnol Cream	Antiseptic	0.00	g	Ointment	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	f	'aminacrin':1A 'antisept':5B 'burnol':3A 'cetrimid':2A 'cream':4A	\N	1	\N	f	21	3	13	f	\N
125	Polymyxin + Bacitracin	Polyfax Ointment	Antibiotic	0.00	g	Ointment	2026-06-21 15:57:45.926079	\N	\N	GSK	10	1000	t	f	'antibiot':5B 'bacitracin':2A 'ointment':4A 'polyfax':3A 'polymyxin':1A	\N	1	\N	f	3	3	13	f	\N
\.


--
-- Data for Name: medicine_batch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_batch (batch_id, medicine_id, stock_quantity, stock_sub_quantity, purchase_price, purchase_sub_unit_price, sale_price, sale_sub_unit_price, expiry_date, batch_number, received_date, party_id, batch_code) FROM stdin;
8	7	0	0	180.00	180.00	240.00	240.00	2027-10-31	BCH007	2026-03-19 07:00:12.700101	\N	BATCH-00000006
10	10	0	5	14.00	1.40	22.00	2.20	2027-05-31	BCH010	2026-03-19 07:00:12.700101	\N	BATCH-00000008
2	2	14	0	18.00	1.80	25.00	2.50	2026-12-31	BCH002	2026-02-06 11:42:40.173912	1	BATCH-00000001
21	12	8	0	300.00	300.00	400.00	400.00	2026-03-26	LOT-00007	2026-03-23 08:57:44.385093	6	BATCH-00000021
20	11	7	9	34.00	3.40	60.00	6.00	2026-03-28	LOT-00007	2026-03-23 08:57:44.385093	6	BATCH-00000020
1	1	167	1	10.09	1.01	15.25	1.50	2029-12-29	BCH001	2026-02-06 11:42:40.173912	1	BATCH-00000011
22	1	36	0	15.00	1.50	16.00	1.60	2026-05-14	LOT-00008	2026-03-26 08:50:08.30069	6	BATCH-00000022
5	5	61	2	35.00	3.50	50.00	5.00	2027-11-11	BCH005	2026-02-06 11:42:40.173912	3	BATCH-00000004
4	4	33	0	15.00	1.50	20.00	2.00	2027-09-19	BCH004	2026-02-06 11:42:40.173912	4	BATCH-00000003
9	9	35	0	85.00	14.17	108.00	18.00	2028-03-31	BCH009	2026-03-19 07:00:12.700101	\N	BATCH-00000007
23	8	50	0	100.00	10.00	120.00	12.00	2026-03-23	LOT-00009	2026-04-02 11:44:45.56495	6	BATCH-00000023
3	3	6	0	30.00	3.00	40.00	4.00	2027-01-15	BCH003	2026-02-06 11:42:40.173912	2	BATCH-00000002
24	1	100	0	20.00	2.00	25.00	2.50	2026-10-14	LOT-00009	2026-04-02 11:44:45.56495	6	BATCH-00000024
11	11	30	0	34.00	3.40	55.00	5.50	2028-01-29	BCH011	2026-03-19 07:00:12.700101	\N	BATCH-00000009
6	1	8	0	10.25	1.03	15.50	1.55	2030-06-30	BCH001B	2026-03-19 07:00:12.700101	\N	BATCH-00000010
12	1	1	0	10.25	1.03	15.50	1.55	2030-06-29	BCH001B	2026-03-20 10:09:57.942956	4	BATCH-00000012
13	1	0	0	10.25	1.03	15.50	1.55	2029-12-28	LOT-00001	2026-03-20 10:49:38.667582	4	BATCH-00000013
14	1	0	0	10.25	1.03	15.50	1.55	2029-12-27	LOT-00002	2026-03-22 01:20:58.724236	4	BATCH-00000014
7	6	19	8	22.00	2.20	30.00	3.00	2027-08-31	BCH006	2026-03-19 07:00:12.700101	\N	BATCH-00000005
16	1	0	0	10.25	1.03	15.50	1.55	2026-05-04	LOT-00004	2026-03-22 15:30:37.536986	1	BATCH-00000016
15	1	0	0	10.25	1.03	15.50	1.55	2029-12-26	LOT-00003	2026-03-22 15:29:19.014133	4	BATCH-00000015
17	4	0	0	12.00	1.20	24.00	2.40	2026-03-23	LOT-00005	2026-03-23 08:22:44.954103	6	BATCH-00000017
18	8	5	0	100.00	10.00	120.00	12.00	2026-03-24	LOT-00006	2026-03-23 08:26:41.696044	6	BATCH-00000018
19	4	1	0	12.00	1.20	24.00	2.40	2026-03-22	LOT-00006	2026-03-23 08:26:41.696044	6	BATCH-00000019
35	23	140	0	8.00	0.00	11.00	0.00	2027-09-30	B23-A	2026-06-21 16:00:12.40043	1	BATCH-00000035
36	24	170	0	9.00	0.00	12.00	0.00	2028-03-31	B24-A	2026-06-21 16:00:12.40043	1	BATCH-00000036
37	25	200	0	10.00	0.00	14.00	0.00	2027-06-30	B25-A	2026-06-21 16:00:12.40043	1	BATCH-00000037
38	26	80	0	11.00	0.00	15.00	0.00	2027-12-31	B26-A	2026-06-21 16:00:12.40043	1	BATCH-00000038
39	27	110	0	12.00	0.00	16.00	0.00	2028-06-30	B27-A	2026-06-21 16:00:12.40043	1	BATCH-00000039
40	28	140	0	13.00	0.00	18.00	0.00	2027-09-30	B28-A	2026-06-21 16:00:12.40043	1	BATCH-00000040
41	29	170	0	14.00	0.00	19.00	0.00	2028-03-31	B29-A	2026-06-21 16:00:12.40043	1	BATCH-00000041
42	30	200	0	15.00	0.00	20.00	0.00	2027-06-30	B30-A	2026-06-21 16:00:12.40043	1	BATCH-00000042
43	31	80	0	16.00	0.00	22.00	0.00	2027-12-31	B31-A	2026-06-21 16:00:12.40043	1	BATCH-00000043
44	32	110	0	17.00	0.00	23.00	0.00	2028-06-30	B32-A	2026-06-21 16:00:12.40043	1	BATCH-00000044
45	33	140	0	18.00	0.00	24.00	0.00	2027-09-30	B33-A	2026-06-21 16:00:12.40043	1	BATCH-00000045
46	34	170	0	19.00	0.00	26.00	0.00	2028-03-31	B34-A	2026-06-21 16:00:12.40043	1	BATCH-00000046
47	35	200	0	20.00	0.00	27.00	0.00	2027-06-30	B35-A	2026-06-21 16:00:12.40043	1	BATCH-00000047
48	36	80	0	3.00	0.00	4.00	0.00	2027-12-31	B36-A	2026-06-21 16:00:12.40043	1	BATCH-00000048
49	37	110	0	4.00	0.00	5.00	0.00	2028-06-30	B37-A	2026-06-21 16:00:12.40043	1	BATCH-00000049
50	38	140	0	5.00	0.00	7.00	0.00	2027-09-30	B38-A	2026-06-21 16:00:12.40043	1	BATCH-00000050
51	39	170	0	6.00	0.00	8.00	0.00	2028-03-31	B39-A	2026-06-21 16:00:12.40043	1	BATCH-00000051
52	40	200	0	7.00	0.00	9.00	0.00	2027-06-30	B40-A	2026-06-21 16:00:12.40043	1	BATCH-00000052
53	41	80	0	8.00	0.00	11.00	0.00	2027-12-31	B41-A	2026-06-21 16:00:12.40043	1	BATCH-00000053
54	42	110	0	9.00	0.00	12.00	0.00	2028-06-30	B42-A	2026-06-21 16:00:12.40043	1	BATCH-00000054
33	21	80	0	6.00	0.00	8.00	0.00	2027-12-31	B21-A	2026-06-21 16:00:12.40043	1	BATCH-00000033
34	22	110	0	7.00	0.00	9.00	0.00	2028-06-30	B22-A	2026-06-21 16:00:12.40043	1	BATCH-00000034
55	43	140	0	10.00	0.00	14.00	0.00	2027-09-30	B43-A	2026-06-21 16:00:12.40043	1	BATCH-00000055
56	44	170	0	11.00	0.00	15.00	0.00	2028-03-31	B44-A	2026-06-21 16:00:12.40043	1	BATCH-00000056
57	45	200	0	12.00	0.00	16.00	0.00	2027-06-30	B45-A	2026-06-21 16:00:12.40043	1	BATCH-00000057
58	46	80	0	13.00	0.00	18.00	0.00	2027-12-31	B46-A	2026-06-21 16:00:12.40043	1	BATCH-00000058
59	47	110	0	14.00	0.00	19.00	0.00	2028-06-30	B47-A	2026-06-21 16:00:12.40043	1	BATCH-00000059
60	48	140	0	15.00	0.00	20.00	0.00	2027-09-30	B48-A	2026-06-21 16:00:12.40043	1	BATCH-00000060
61	49	170	0	16.00	0.00	22.00	0.00	2028-03-31	B49-A	2026-06-21 16:00:12.40043	1	BATCH-00000061
62	50	40	0	17.00	0.00	23.00	0.00	2028-06-30	B50-A	2026-06-21 16:00:12.538351	2	BATCH-00000062
63	51	60	0	18.00	0.00	24.00	0.00	2027-09-30	B51-A	2026-06-21 16:00:12.538351	2	BATCH-00000063
64	52	80	0	19.00	0.00	26.00	0.00	2028-03-31	B52-A	2026-06-21 16:00:12.538351	2	BATCH-00000064
65	53	100	0	20.00	0.00	27.00	0.00	2027-06-30	B53-A	2026-06-21 16:00:12.538351	2	BATCH-00000065
66	54	40	0	70.00	0.00	95.00	0.00	2027-12-31	B54-A	2026-06-21 16:00:12.538351	2	BATCH-00000066
67	55	60	0	88.00	0.00	119.00	0.00	2028-06-30	B55-A	2026-06-21 16:00:12.538351	2	BATCH-00000067
68	56	80	0	106.00	0.00	143.00	0.00	2027-09-30	B56-A	2026-06-21 16:00:12.538351	2	BATCH-00000068
69	57	100	0	124.00	0.00	167.00	0.00	2028-03-31	B57-A	2026-06-21 16:00:12.538351	2	BATCH-00000069
70	58	40	0	142.00	0.00	192.00	0.00	2027-06-30	B58-A	2026-06-21 16:00:12.538351	2	BATCH-00000070
71	59	60	0	160.00	0.00	216.00	0.00	2027-12-31	B59-A	2026-06-21 16:00:12.538351	2	BATCH-00000071
72	60	80	0	190.00	0.00	257.00	0.00	2028-06-30	B60-A	2026-06-21 16:00:12.538351	2	BATCH-00000072
73	61	100	0	196.00	0.00	265.00	0.00	2027-09-30	B61-A	2026-06-21 16:00:12.538351	2	BATCH-00000073
74	62	40	0	214.00	0.00	289.00	0.00	2028-03-31	B62-A	2026-06-21 16:00:12.538351	2	BATCH-00000074
75	63	60	0	70.00	0.00	95.00	0.00	2027-06-30	B63-A	2026-06-21 16:00:12.538351	2	BATCH-00000075
76	64	80	0	88.00	0.00	119.00	0.00	2027-12-31	B64-A	2026-06-21 16:00:12.538351	2	BATCH-00000076
77	65	100	0	106.00	0.00	143.00	0.00	2028-06-30	B65-A	2026-06-21 16:00:12.538351	2	BATCH-00000077
78	66	40	0	124.00	0.00	167.00	0.00	2027-09-30	B66-A	2026-06-21 16:00:12.538351	2	BATCH-00000078
79	67	60	0	142.00	0.00	192.00	0.00	2028-03-31	B67-A	2026-06-21 16:00:12.538351	2	BATCH-00000079
80	68	80	0	160.00	0.00	216.00	0.00	2027-06-30	B68-A	2026-06-21 16:00:12.538351	2	BATCH-00000080
81	69	100	0	660.00	0.00	891.00	0.00	2027-12-31	B69-A	2026-06-21 16:00:12.538351	2	BATCH-00000081
82	70	40	0	720.00	0.00	972.00	0.00	2028-06-30	B70-A	2026-06-21 16:00:12.538351	2	BATCH-00000082
83	71	60	0	780.00	0.00	1053.00	0.00	2027-09-30	B71-A	2026-06-21 16:00:12.538351	2	BATCH-00000083
84	72	80	0	120.00	0.00	162.00	0.00	2028-03-31	B72-A	2026-06-21 16:00:12.538351	2	BATCH-00000084
85	73	100	0	180.00	0.00	243.00	0.00	2027-06-30	B73-A	2026-06-21 16:00:12.538351	2	BATCH-00000085
86	74	40	0	240.00	0.00	324.00	0.00	2027-12-31	B74-A	2026-06-21 16:00:12.538351	2	BATCH-00000086
87	75	60	0	300.00	0.00	405.00	0.00	2028-06-30	B75-A	2026-06-21 16:00:12.538351	2	BATCH-00000087
88	76	80	0	360.00	0.00	486.00	0.00	2027-09-30	B76-A	2026-06-21 16:00:12.538351	2	BATCH-00000088
89	77	100	0	420.00	0.00	567.00	0.00	2028-03-31	B77-A	2026-06-21 16:00:12.538351	2	BATCH-00000089
90	78	40	0	480.00	0.00	648.00	0.00	2027-06-30	B78-A	2026-06-21 16:00:12.538351	2	BATCH-00000090
91	79	25	0	540.00	0.00	729.00	0.00	2026-09-30	B79-A	2026-06-21 16:00:12.591262	3	BATCH-00000091
92	80	40	0	600.00	0.00	810.00	0.00	2028-03-31	B80-A	2026-06-21 16:00:12.591262	3	BATCH-00000092
93	81	55	0	660.00	0.00	891.00	0.00	2027-06-30	B81-A	2026-06-21 16:00:12.591262	3	BATCH-00000093
94	82	70	0	720.00	0.00	972.00	0.00	2027-12-31	B82-A	2026-06-21 16:00:12.591262	3	BATCH-00000094
95	83	25	0	780.00	0.00	1053.00	0.00	2028-06-30	B83-A	2026-06-21 16:00:12.591262	3	BATCH-00000095
96	84	40	0	190.00	0.00	257.00	0.00	2027-09-30	B84-A	2026-06-21 16:00:12.591262	3	BATCH-00000096
97	85	55	0	215.00	0.00	290.00	0.00	2026-09-30	B85-A	2026-06-21 16:00:12.591262	3	BATCH-00000097
98	86	70	0	240.00	0.00	324.00	0.00	2027-06-30	B86-A	2026-06-21 16:00:12.591262	3	BATCH-00000098
99	87	25	0	265.00	0.00	358.00	0.00	2027-12-31	B87-A	2026-06-21 16:00:12.591262	3	BATCH-00000099
100	88	40	0	90.00	0.00	122.00	0.00	2028-06-30	B88-A	2026-06-21 16:00:12.591262	3	BATCH-00000100
101	89	55	0	115.00	0.00	155.00	0.00	2027-09-30	B89-A	2026-06-21 16:00:12.591262	3	BATCH-00000101
102	90	70	0	140.00	0.00	189.00	0.00	2028-03-31	B90-A	2026-06-21 16:00:12.591262	3	BATCH-00000102
103	91	25	0	165.00	0.00	223.00	0.00	2026-09-30	B91-A	2026-06-21 16:00:12.591262	3	BATCH-00000103
104	92	40	0	190.00	0.00	257.00	0.00	2027-12-31	B92-A	2026-06-21 16:00:12.591262	3	BATCH-00000104
105	93	55	0	215.00	0.00	290.00	0.00	2028-06-30	B93-A	2026-06-21 16:00:12.591262	3	BATCH-00000105
106	94	70	0	118.00	0.00	159.00	0.00	2027-09-30	B94-A	2026-06-21 16:00:12.591262	3	BATCH-00000106
107	95	25	0	140.00	0.00	189.00	0.00	2028-03-31	B95-A	2026-06-21 16:00:12.591262	3	BATCH-00000107
108	96	40	0	162.00	0.00	219.00	0.00	2027-06-30	B96-A	2026-06-21 16:00:12.591262	3	BATCH-00000108
109	97	55	0	184.00	0.00	248.00	0.00	2026-09-30	B97-A	2026-06-21 16:00:12.591262	3	BATCH-00000109
110	98	70	0	1770.00	0.00	2390.00	0.00	2028-06-30	B98-A	2026-06-21 16:00:12.591262	3	BATCH-00000110
111	99	25	0	1860.00	0.00	2511.00	0.00	2027-09-30	B99-A	2026-06-21 16:00:12.591262	3	BATCH-00000111
112	100	40	0	150.00	0.00	203.00	0.00	2028-03-31	B100-A	2026-06-21 16:00:12.591262	3	BATCH-00000112
113	101	55	0	272.00	0.00	367.00	0.00	2027-06-30	B101-A	2026-06-21 16:00:12.591262	3	BATCH-00000113
114	102	70	0	294.00	0.00	397.00	0.00	2027-12-31	B102-A	2026-06-21 16:00:12.591262	3	BATCH-00000114
115	103	25	0	316.00	0.00	427.00	0.00	2026-09-30	B103-A	2026-06-21 16:00:12.591262	3	BATCH-00000115
116	104	40	0	338.00	0.00	456.00	0.00	2027-09-30	B104-A	2026-06-21 16:00:12.591262	3	BATCH-00000116
117	105	55	0	30.00	0.00	41.00	0.00	2028-03-31	B105-A	2026-06-21 16:00:12.591262	3	BATCH-00000117
118	106	70	0	52.00	0.00	70.00	0.00	2027-06-30	B106-A	2026-06-21 16:00:12.591262	3	BATCH-00000118
119	107	25	0	74.00	0.00	100.00	0.00	2027-12-31	B107-A	2026-06-21 16:00:12.591262	3	BATCH-00000119
120	108	3	0	96.00	0.00	130.00	0.00	2027-12-31	B108-A	2026-06-21 16:00:12.660156	4	BATCH-00000120
121	109	3	0	960.00	0.00	1296.00	0.00	2027-12-31	B109-A	2026-06-21 16:00:12.660156	4	BATCH-00000121
122	110	3	0	1050.00	0.00	1418.00	0.00	2027-12-31	B110-A	2026-06-21 16:00:12.660156	4	BATCH-00000122
123	111	3	0	1140.00	0.00	1539.00	0.00	2027-12-31	B111-A	2026-06-21 16:00:12.660156	4	BATCH-00000123
124	112	3	0	184.00	0.00	248.00	0.00	2027-12-31	B112-A	2026-06-21 16:00:12.660156	4	BATCH-00000124
125	113	3	0	206.00	0.00	278.00	0.00	2027-12-31	B113-A	2026-06-21 16:00:12.660156	4	BATCH-00000125
126	21	30	0	6.00	0.00	8.00	0.00	2026-09-30	B21-B	2026-06-21 16:00:12.688675	1	BATCH-00000126
127	22	30	0	7.00	0.00	9.00	0.00	2026-09-30	B22-B	2026-06-21 16:00:12.688675	1	BATCH-00000127
128	23	30	0	8.00	0.00	11.00	0.00	2026-09-30	B23-B	2026-06-21 16:00:12.688675	1	BATCH-00000128
\.


--
-- Data for Name: medicine_category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_category (category_id, name, is_active, created_at) FROM stdin;
1	Bronchodilator	t	2026-03-18 09:40:32.673948
2	Gastroprotective	t	2026-03-18 09:40:32.673948
3	Antibiotic	t	2026-03-18 09:40:32.673948
4	Antihistamine	t	2026-03-18 09:40:32.673948
5	Anti-diabetic	t	2026-03-18 09:40:32.673948
6	Analgesic	t	2026-03-18 09:40:32.673948
7	New	f	2026-03-18 09:48:47.379649
8	Antihistamines	t	2026-03-23 08:37:13.009129
9	Antacid	t	2026-06-21 15:57:45.926079
10	Antimalarial	t	2026-06-21 15:57:45.926079
11	Cardiovascular	t	2026-06-21 15:57:45.926079
12	Antifungal	t	2026-06-21 15:57:45.926079
13	Corticosteroid	t	2026-06-21 15:57:45.926079
14	Vitamin & Supplement	t	2026-06-21 15:57:45.926079
15	Injectable	t	2026-06-21 15:57:45.926079
16	IV Fluid	t	2026-06-21 15:57:45.926079
17	Surgical Supplies	t	2026-06-21 15:57:45.926079
18	Consumables	t	2026-06-21 15:57:45.926079
19	General Inventory	t	2026-06-21 15:57:45.926079
20	Vaccine	t	2026-06-21 15:57:45.926079
21	Antiseptic	t	2026-06-21 15:57:45.926079
\.


--
-- Data for Name: medicine_form; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_form (form_id, name, is_active, created_at) FROM stdin;
1	Inhaler	t	2026-03-18 09:40:32.673948
2	Tablet	t	2026-03-18 09:40:32.673948
3	Capsule	t	2026-03-18 09:40:32.673948
4	Syrup	t	2026-03-23 08:37:56.34805
5	Suspension	t	2026-06-21 15:57:45.926079
6	Injection	t	2026-06-21 15:57:45.926079
7	Vial	t	2026-06-21 15:57:45.926079
8	Solution	t	2026-06-21 15:57:45.926079
9	Drops	t	2026-06-21 15:57:45.926079
10	Sachet	t	2026-06-21 15:57:45.926079
11	Device	t	2026-06-21 15:57:45.926079
12	Consumable	t	2026-06-21 15:57:45.926079
13	Ointment	t	2026-06-21 15:57:45.926079
\.


--
-- Data for Name: medicine_manufacturer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_manufacturer (manufacturer_id, name, is_active, created_at) FROM stdin;
1	Abbott	t	2026-03-18 09:40:32.673948
2	Getz	t	2026-03-18 09:40:32.673948
3	GSK	t	2026-03-18 09:40:32.673948
4	Searle	t	2026-03-18 09:40:32.673948
5	Johnson & Johnson	t	2026-03-23 08:37:30.110488
6	Getz Pharma	t	2026-06-21 15:57:45.926079
7	Sanofi	t	2026-06-21 15:57:45.926079
8	Pfizer	t	2026-06-21 15:57:45.926079
9	Hilton Pharma	t	2026-06-21 15:57:45.926079
10	Martin Dow	t	2026-06-21 15:57:45.926079
11	Highnoon	t	2026-06-21 15:57:45.926079
12	Ferozsons	t	2026-06-21 15:57:45.926079
13	Bosch Pharma	t	2026-06-21 15:57:45.926079
14	CarePlus Surgicals	t	2026-06-21 15:57:45.926079
15	Medisure Devices	t	2026-06-21 15:57:45.926079
16	Local Generics	t	2026-06-21 15:57:45.926079
17	Bayer	t	2026-06-21 15:57:45.926079
18	Servier	t	2026-06-21 15:57:45.926079
19	Merck	t	2026-06-21 15:57:45.926079
20	Novartis	t	2026-06-21 15:57:45.926079
21	Roche	t	2026-06-21 15:57:45.926079
22	Novo Nordisk	t	2026-06-21 15:57:45.926079
23	Guerbet	t	2026-06-21 15:57:45.926079
24	Otsuka	t	2026-06-21 15:57:45.926079
25	Hoechst	t	2026-06-21 15:57:45.926079
26	Brookes	t	2026-06-21 15:57:45.926079
27	Reckitt	t	2026-06-21 15:57:45.926079
\.


--
-- Data for Name: medicine_purchase; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_purchase (purchase_id, party_id, invoice_no, invoice_timestamp, total_amount, payment_status, created_at, created_by, paid_amount) FROM stdin;
3	1	INV-7819	2026-03-03 20:32:57.241573	25.00	Paid	2026-03-03 20:32:57.241573	1	0.00
4	1	INV-7820	2026-03-04 18:24:51.307636	10.00	Paid	2026-03-04 18:24:51.307636	1	0.00
5	2	INV-7821	2026-03-19 02:09:08.581868	10090.00	Paid	2026-03-19 02:09:08.581868	1	0.00
6	4	INV-7822	2026-03-19 05:14:35.702167	17510.09	Paid	2026-03-19 05:14:35.702167	1	0.00
7	1	INV-7823	2026-03-20 03:13:36.265377	34.00	Paid	2026-03-20 03:13:36.265377	1	0.00
8	2	INV-7824	2026-03-20 03:14:30.769781	34.00	Paid	2026-03-20 03:14:30.769781	1	0.00
9	4	INV-007825	2026-03-20 10:09:57.942956	10.25	Paid	2026-03-20 10:09:57.942956	1	0.00
10	4	INV-007826	2026-03-20 10:49:38.667582	10.25	Paid	2026-03-20 10:49:38.667582	1	0.00
11	4	INV-007827	2026-03-22 01:20:58.724236	10.25	Paid	2026-03-22 01:20:58.724236	1	0.00
12	4	INV-007828	2026-03-22 15:29:19.014133	10.25	Paid	2026-03-22 15:29:19.014133	1	0.00
13	1	INV-007829	2026-03-22 15:30:37.536986	10.25	Paid	2026-03-22 15:30:37.536986	1	0.00
14	6	INV-007830	2026-03-23 08:22:44.954103	120.00	Paid	2026-03-23 08:22:44.954103	1	0.00
15	6	INV-007831	2026-03-23 08:26:41.696044	512.00	Paid	2026-03-23 08:26:41.696044	1	0.00
16	6	INV-007832	2026-03-23 08:57:44.385093	3340.00	Paid	2026-03-23 08:57:44.385093	1	0.00
17	6	INV-007833	2026-03-26 08:50:08.30069	750.00	Paid	2026-03-26 08:50:08.30069	1	0.00
18	6	INV-007834	2026-04-02 11:44:45.56495	7000.00	Paid	2026-04-02 11:44:45.56495	1	0.00
19	1	INV-007835	2026-06-21 16:00:12.40043	46700.00	Paid	2026-06-21 16:00:12.40043	2	0.00
20	2	INV-007836	2026-06-21 16:00:12.538351	427800.00	Paid	2026-06-21 16:00:12.538351	2	0.00
21	3	INV-007837	2026-06-21 16:00:12.591262	498685.00	Paid	2026-06-21 16:00:12.591262	2	0.00
22	4	INV-007838	2026-06-21 16:00:12.660156	10908.00	Paid	2026-06-21 16:00:12.660156	2	0.00
23	1	INV-007839	2026-06-21 16:00:12.688675	630.00	Paid	2026-06-21 16:00:12.688675	2	0.00
\.


--
-- Data for Name: medicine_purchase_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_purchase_detail (id, purchase_id, medicine_id, quantity, unit_cost, sub_quantity, sub_unit_cost, batch_id) FROM stdin;
1	3	1	1	10.00	0	1.0	1
2	3	4	1	15.00	0	1.5	4
3	4	1	1	10.00	0	1.0	1
4	5	1	1000	10.09	0	1.0	1
5	6	5	500	35.00	0	3.5	5
6	6	1	1	10.09	0	1.0	1
7	7	11	1	34.00	0	3.4	11
8	8	11	1	34.00	0	3.4	11
9	9	1	1	10.25	0	1.0	12
10	10	1	1	10.25	0	1.0	13
11	11	1	1	10.25	0	1.0	14
12	12	1	1	10.25	0	1.0	15
13	13	1	1	10.25	0	1.0	16
14	14	4	10	12.00	0	1.2	17
15	15	8	5	100.00	0	10.0	18
16	15	4	1	12.00	0	1.2	19
17	16	11	10	34.00	0	3.4	20
18	16	12	10	300.00	0	300.0	21
19	17	1	50	15.00	0	1.5	22
20	18	8	50	100.00	0	10.0	23
21	18	1	100	20.00	0	2.0	24
22	19	21	80	6.00	0	0.0	33
23	19	22	110	7.00	0	0.0	34
24	19	23	140	8.00	0	0.0	35
25	19	24	170	9.00	0	0.0	36
26	19	25	200	10.00	0	0.0	37
27	19	26	80	11.00	0	0.0	38
28	19	27	110	12.00	0	0.0	39
29	19	28	140	13.00	0	0.0	40
30	19	29	170	14.00	0	0.0	41
31	19	30	200	15.00	0	0.0	42
32	19	31	80	16.00	0	0.0	43
33	19	32	110	17.00	0	0.0	44
34	19	33	140	18.00	0	0.0	45
35	19	34	170	19.00	0	0.0	46
36	19	35	200	20.00	0	0.0	47
37	19	36	80	3.00	0	0.0	48
38	19	37	110	4.00	0	0.0	49
39	19	38	140	5.00	0	0.0	50
40	19	39	170	6.00	0	0.0	51
41	19	40	200	7.00	0	0.0	52
42	19	41	80	8.00	0	0.0	53
43	19	42	110	9.00	0	0.0	54
44	19	43	140	10.00	0	0.0	55
45	19	44	170	11.00	0	0.0	56
46	19	45	200	12.00	0	0.0	57
47	19	46	80	13.00	0	0.0	58
48	19	47	110	14.00	0	0.0	59
49	19	48	140	15.00	0	0.0	60
50	19	49	170	16.00	0	0.0	61
51	20	50	40	17.00	0	0.0	62
52	20	51	60	18.00	0	0.0	63
53	20	52	80	19.00	0	0.0	64
54	20	53	100	20.00	0	0.0	65
55	20	54	40	70.00	0	0.0	66
56	20	55	60	88.00	0	0.0	67
57	20	56	80	106.00	0	0.0	68
58	20	57	100	124.00	0	0.0	69
59	20	58	40	142.00	0	0.0	70
60	20	59	60	160.00	0	0.0	71
61	20	60	80	190.00	0	0.0	72
62	20	61	100	196.00	0	0.0	73
63	20	62	40	214.00	0	0.0	74
64	20	63	60	70.00	0	0.0	75
65	20	64	80	88.00	0	0.0	76
66	20	65	100	106.00	0	0.0	77
67	20	66	40	124.00	0	0.0	78
68	20	67	60	142.00	0	0.0	79
69	20	68	80	160.00	0	0.0	80
70	20	69	100	660.00	0	0.0	81
71	20	70	40	720.00	0	0.0	82
72	20	71	60	780.00	0	0.0	83
73	20	72	80	120.00	0	0.0	84
74	20	73	100	180.00	0	0.0	85
75	20	74	40	240.00	0	0.0	86
76	20	75	60	300.00	0	0.0	87
77	20	76	80	360.00	0	0.0	88
78	20	77	100	420.00	0	0.0	89
79	20	78	40	480.00	0	0.0	90
80	21	79	25	540.00	0	0.0	91
81	21	80	40	600.00	0	0.0	92
82	21	81	55	660.00	0	0.0	93
83	21	82	70	720.00	0	0.0	94
84	21	83	25	780.00	0	0.0	95
85	21	84	40	190.00	0	0.0	96
86	21	85	55	215.00	0	0.0	97
87	21	86	70	240.00	0	0.0	98
88	21	87	25	265.00	0	0.0	99
89	21	88	40	90.00	0	0.0	100
90	21	89	55	115.00	0	0.0	101
91	21	90	70	140.00	0	0.0	102
92	21	91	25	165.00	0	0.0	103
93	21	92	40	190.00	0	0.0	104
94	21	93	55	215.00	0	0.0	105
95	21	94	70	118.00	0	0.0	106
96	21	95	25	140.00	0	0.0	107
97	21	96	40	162.00	0	0.0	108
98	21	97	55	184.00	0	0.0	109
99	21	98	70	1770.00	0	0.0	110
100	21	99	25	1860.00	0	0.0	111
101	21	100	40	150.00	0	0.0	112
102	21	101	55	272.00	0	0.0	113
103	21	102	70	294.00	0	0.0	114
104	21	103	25	316.00	0	0.0	115
105	21	104	40	338.00	0	0.0	116
106	21	105	55	30.00	0	0.0	117
107	21	106	70	52.00	0	0.0	118
108	21	107	25	74.00	0	0.0	119
109	22	108	3	96.00	0	0.0	120
110	22	109	3	960.00	0	0.0	121
111	22	110	3	1050.00	0	0.0	122
112	22	111	3	1140.00	0	0.0	123
113	22	112	3	184.00	0	0.0	124
114	22	113	3	206.00	0	0.0	125
115	23	21	30	6.00	0	0.0	126
116	23	22	30	7.00	0	0.0	127
117	23	23	30	8.00	0	0.0	128
\.


--
-- Data for Name: medicine_transaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_transaction (txn_id, medicine_id, txn_type, quantity, amount_per_unit, ref_purchase_id, ref_sale_id, ref_purchase_return, ref_sale_return, created_at, sub_quantity, batch_id) FROM stdin;
1	1	sale	1	15.00	\N	2	\N	\N	2026-02-06 10:40:55.360756	0	1
2	7	sale	1	250.00	\N	3	\N	\N	2026-02-10 03:39:00.912221	0	\N
3	1	sale	0	15.00	\N	4	\N	\N	2026-03-03 09:15:26.697036	1	1
4	1	sale	0	15.00	\N	5	\N	\N	2026-03-03 09:16:02.493575	1	1
5	1	sale	1	15.00	\N	6	\N	\N	2026-03-03 09:29:23.166007	0	1
6	1	sale	0	15.00	\N	7	\N	\N	2026-03-03 09:30:06.909347	1	1
7	1	sale	0	15.00	\N	8	\N	\N	2026-03-03 09:31:00.032848	8	1
8	1	sale	1	15.00	\N	9	\N	\N	2026-03-03 10:05:51.187964	0	1
9	1	sale	0	15.00	\N	10	\N	\N	2026-03-03 10:31:02.116343	1	1
10	1	sale	1	15.00	\N	11	\N	\N	2026-03-03 17:57:02.489355	0	1
11	1	sale	1	15.00	\N	12	\N	\N	2026-03-03 18:20:48.95872	0	1
12	1	sale	1	15.00	\N	13	\N	\N	2026-03-03 18:33:03.791011	0	1
13	1	sale	1	15.00	\N	14	\N	\N	2026-03-03 18:41:14.075212	0	1
14	1	sale	1	15.00	\N	15	\N	\N	2026-03-03 18:41:51.868192	0	1
15	1	sale	1	15.00	\N	16	\N	\N	2026-03-03 18:42:54.013289	0	1
16	1	sale_return	1	15.00	\N	\N	\N	2	2026-03-03 18:56:49.827934	0	1
17	1	sale_return	1	15.00	\N	\N	\N	3	2026-03-03 18:57:15.725396	0	1
18	1	purchase	1	10.00	3	\N	\N	\N	2026-03-03 20:32:57.241573	0	1
19	4	purchase	1	15.00	3	\N	\N	\N	2026-03-03 20:32:57.241573	0	4
20	1	purchase	1	10.00	4	\N	\N	\N	2026-03-04 18:24:51.307636	0	1
21	1	sale	1	15.00	\N	20	\N	\N	2026-03-04 19:23:15.076058	9	1
22	5	sale	1	50.00	\N	21	\N	\N	2026-03-04 19:25:44.552936	8	5
23	1	sale	1	15.00	\N	22	\N	\N	2026-03-05 15:39:05.760392	0	1
24	1	sale	0	15.00	\N	23	\N	\N	2026-03-14 03:49:28.16219	1	1
25	1	purchase_return	1	10.00	\N	\N	3	\N	2026-03-19 01:30:23.111576	0	1
26	1	sale	88	15.00	\N	24	\N	\N	2026-03-19 01:50:01.443584	0	1
27	3	sale	30	40.00	\N	25	\N	\N	2026-03-19 01:58:49.982351	0	3
28	5	sale	38	50.00	\N	26	\N	\N	2026-03-19 02:00:53.092546	0	5
29	2	sale	1	250.00	\N	27	\N	\N	2026-03-19 02:05:00.440968	0	2
30	4	sale	1	20.00	\N	27	\N	\N	2026-03-19 02:05:00.440968	0	4
31	1	purchase	1000	10.09	5	\N	\N	\N	2026-03-19 02:09:08.581868	0	1
32	1	purchase_return	1000	10.09	\N	\N	4	\N	2026-03-19 02:10:52.336793	0	1
33	5	purchase	500	35.00	6	\N	\N	\N	2026-03-19 05:14:35.702167	0	5
34	1	purchase	1	10.09	6	\N	\N	\N	2026-03-19 05:14:35.702167	0	1
35	5	purchase_return	200	35.00	\N	\N	5	\N	2026-03-19 05:15:33.360354	0	5
36	1	purchase_return	1	10.09	\N	\N	5	\N	2026-03-19 05:15:33.360354	0	1
37	2	adjustment	19	18.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	2
38	3	adjustment	36	30.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	3
39	4	adjustment	42	15.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	4
40	5	adjustment	-160	35.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	5
41	1	adjustment	218	10.09	\N	\N	\N	\N	2026-03-19 07:05:45.061347	2	1
42	9	adjustment	35	85.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	9
43	1	adjustment	8	10.25	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	6
44	10	adjustment	4	14.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	5	10
45	11	adjustment	28	34.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	11
46	7	adjustment	7	180.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	8
47	6	adjustment	24	22.00	\N	\N	\N	\N	2026-03-19 07:05:45.061347	0	7
48	11	purchase	1	34.00	7	\N	\N	\N	2026-03-20 03:13:36.265377	0	11
49	11	purchase	1	34.00	8	\N	\N	\N	2026-03-20 03:14:30.769781	0	11
50	1	sale	0	15.50	\N	28	\N	\N	2026-03-20 04:34:51.508672	1	6
51	1	sale	1	15.25	\N	29	\N	\N	2026-03-20 04:55:32.701801	0	1
52	1	purchase	1	10.25	9	\N	\N	\N	2026-03-20 10:09:57.942956	0	12
53	1	purchase	1	10.25	10	\N	\N	\N	2026-03-20 10:49:38.667582	0	13
54	1	purchase_return	1	10.25	\N	\N	6	\N	2026-03-20 11:03:36.957681	0	13
55	1	sale	0	15.25	\N	30	\N	\N	2026-03-20 18:17:53.026767	1	1
56	1	purchase	1	10.25	11	\N	\N	\N	2026-03-22 01:20:58.724236	0	14
57	1	purchase_return	1	10.25	\N	\N	7	\N	2026-03-22 01:22:50.456176	0	14
58	1	sale	1	15.25	\N	31	\N	\N	2026-03-22 01:23:24.670507	0	1
59	1	sale	2	15.25	\N	32	\N	\N	2026-03-22 01:23:52.233464	0	1
60	6	sale	4	30.00	\N	33	\N	\N	2026-03-22 05:05:23.335591	2	7
61	5	sale	8	50.00	\N	33	\N	\N	2026-03-22 05:05:23.335591	0	5
63	5	sale	10	50.00	\N	34	\N	\N	2026-03-22 05:56:53.952238	0	5
64	7	sale	7	240.00	\N	34	\N	\N	2026-03-22 05:56:53.952238	0	8
65	10	sale	4	22.00	\N	34	\N	\N	2026-03-22 05:56:53.952238	0	10
66	2	sale	4	25.00	\N	34	\N	\N	2026-03-22 05:56:53.952238	0	2
68	1	sale	0	15.25	\N	35	\N	\N	2026-03-22 07:41:32.116683	1	1
69	1	sale	0	15.25	\N	36	\N	\N	2026-03-22 07:42:03.95198	1	1
70	1	sale	1	15.25	\N	37	\N	\N	2026-03-22 08:24:36.180051	0	1
72	1	sale	0	15.25	\N	39	\N	\N	2026-03-22 08:35:53.920129	1	1
73	1	sale	1	15.25	\N	40	\N	\N	2026-03-22 10:26:13.620765	0	1
74	1	sale	2	15.25	\N	41	\N	\N	2026-03-22 10:26:38.375103	5	1
75	1	sale	1	15.25	\N	42	\N	\N	2026-03-22 10:35:12.008888	0	1
76	1	sale	1	15.25	\N	43	\N	\N	2026-03-22 10:40:17.695627	0	1
77	1	sale	1	15.25	\N	44	\N	\N	2026-03-22 11:02:13.236056	0	1
78	1	sale	1	15.25	\N	45	\N	\N	2026-03-22 11:03:53.487373	0	1
79	1	sale	1	15.25	\N	46	\N	\N	2026-03-22 11:07:22.952199	0	1
80	1	sale	1	15.25	\N	47	\N	\N	2026-03-22 11:14:13.724789	0	1
81	1	sale	1	15.25	\N	48	\N	\N	2026-03-22 11:18:08.743853	0	1
82	1	sale	1	15.25	\N	49	\N	\N	2026-03-22 11:22:24.503983	0	1
83	1	sale	1	15.25	\N	50	\N	\N	2026-03-22 11:24:44.488063	0	1
84	1	sale	1	15.25	\N	51	\N	\N	2026-03-22 11:38:49.477774	0	1
85	1	sale_return	1	15.50	\N	\N	\N	4	2026-03-22 11:39:57.819273	0	\N
86	1	sale_return	1	15.50	\N	\N	\N	5	2026-03-22 11:44:57.477672	0	\N
87	1	sale_return	1	15.50	\N	\N	\N	6	2026-03-22 12:00:24.889467	0	\N
88	9	sale	1	108.00	\N	56	\N	\N	2026-03-22 13:09:16.193964	0	9
89	1	sale	70	15.25	\N	57	\N	\N	2026-03-22 13:40:11.687097	0	1
90	5	sale	19	50.00	\N	57	\N	\N	2026-03-22 13:40:11.687097	0	5
91	1	sale_return	70	15.25	\N	\N	\N	7	2026-03-22 13:58:15.739902	0	1
92	1	sale_return	70	15.25	\N	\N	\N	8	2026-03-22 13:59:04.348619	0	1
93	9	sale_return	1	108.00	\N	\N	\N	9	2026-03-22 14:08:15.569753	0	9
94	1	sale_return	1	15.25	\N	\N	\N	10	2026-03-22 15:17:09.499964	0	1
95	1	sale	1	15.25	\N	58	\N	\N	2026-03-22 15:17:29.791494	0	1
96	1	sale_return	0	15.50	\N	\N	\N	11	2026-03-22 15:23:09.052461	1	6
97	1	purchase	1	10.25	12	\N	\N	\N	2026-03-22 15:29:19.014133	0	15
98	1	purchase	1	10.25	13	\N	\N	\N	2026-03-22 15:30:37.536986	0	16
99	1	sale	1	15.50	\N	59	\N	\N	2026-03-23 04:03:15.174116	0	16
100	1	sale	1	15.50	\N	59	\N	\N	2026-03-23 04:03:15.174116	0	15
101	1	sale	2	15.25	\N	60	\N	\N	2026-03-23 04:04:01.546	0	1
102	4	purchase	10	12.00	14	\N	\N	\N	2026-03-23 08:22:44.954103	0	17
103	4	purchase_return	10	12.00	\N	\N	10	\N	2026-03-23 08:25:30.827801	0	17
104	8	purchase	5	100.00	15	\N	\N	\N	2026-03-23 08:26:41.696044	0	18
105	4	purchase	1	12.00	15	\N	\N	\N	2026-03-23 08:26:41.696044	0	19
106	11	purchase	10	34.00	16	\N	\N	\N	2026-03-23 08:57:44.385093	0	20
107	12	purchase	10	300.00	16	\N	\N	\N	2026-03-23 08:57:44.385093	0	21
108	11	purchase_return	1	34.00	\N	\N	11	\N	2026-03-23 08:58:22.561333	0	20
109	12	purchase_return	1	300.00	\N	\N	11	\N	2026-03-23 08:58:22.561333	0	21
110	12	sale	1	400.00	\N	61	\N	\N	2026-03-23 08:58:53.980216	0	21
111	4	sale	42	20.00	\N	63	\N	\N	2026-03-23 13:49:19.886683	0	\N
112	1	sale	2	15.25	\N	64	\N	\N	2026-03-23 17:32:35.53455	0	1
113	11	sale	1	60.00	\N	65	\N	\N	2026-03-26 08:38:18.179139	1	20
114	1	sale	1	15.25	\N	66	\N	\N	2026-03-26 08:40:31.980088	0	1
115	4	sale	1	20.00	\N	66	\N	\N	2026-03-26 08:40:31.980088	0	4
116	4	sale_return	1	20.00	\N	\N	\N	12	2026-03-26 08:43:05.511385	0	4
117	1	sale_return	1	15.25	\N	\N	\N	12	2026-03-26 08:43:05.511385	0	1
118	1	purchase	50	15.00	17	\N	\N	\N	2026-03-26 08:50:08.30069	0	22
119	1	purchase_return	10	15.00	\N	\N	12	\N	2026-03-26 08:51:06.958708	0	22
120	1	sale	1	16.00	\N	67	\N	\N	2026-03-30 03:57:41.300668	0	22
121	4	sale	4	20.00	\N	67	\N	\N	2026-03-30 03:57:41.300668	0	4
122	4	sale	1	20.00	\N	68	\N	\N	2026-03-30 04:00:06.153109	0	4
123	1	sale	1	16.00	\N	69	\N	\N	2026-03-30 04:00:27.280063	0	22
124	4	sale	3	20.00	\N	69	\N	\N	2026-03-30 04:00:27.280063	0	4
125	1	sale	2	16.00	\N	70	\N	\N	2026-04-02 11:31:58.647222	0	22
126	5	sale	2	50.00	\N	70	\N	\N	2026-04-02 11:31:58.647222	0	5
127	4	sale	1	20.00	\N	71	\N	\N	2026-04-02 11:35:26.903592	0	4
128	4	sale	1	20.00	\N	72	\N	\N	2026-04-02 11:36:11.1626	0	4
129	4	sale_return	1	20.00	\N	\N	\N	13	2026-04-02 11:37:50.674667	0	4
130	8	purchase	50	100.00	18	\N	\N	\N	2026-04-02 11:44:45.56495	0	23
131	1	purchase	100	20.00	18	\N	\N	\N	2026-04-02 11:44:45.56495	0	24
132	21	purchase	80	6.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	33
133	22	purchase	110	7.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	34
134	23	purchase	140	8.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	35
135	24	purchase	170	9.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	36
136	25	purchase	200	10.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	37
137	26	purchase	80	11.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	38
138	27	purchase	110	12.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	39
139	28	purchase	140	13.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	40
140	29	purchase	170	14.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	41
141	30	purchase	200	15.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	42
142	31	purchase	80	16.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	43
143	32	purchase	110	17.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	44
144	33	purchase	140	18.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	45
145	34	purchase	170	19.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	46
146	35	purchase	200	20.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	47
147	36	purchase	80	3.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	48
148	37	purchase	110	4.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	49
149	38	purchase	140	5.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	50
150	39	purchase	170	6.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	51
151	40	purchase	200	7.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	52
152	41	purchase	80	8.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	53
153	42	purchase	110	9.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	54
154	43	purchase	140	10.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	55
155	44	purchase	170	11.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	56
156	45	purchase	200	12.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	57
157	46	purchase	80	13.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	58
158	47	purchase	110	14.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	59
159	48	purchase	140	15.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	60
160	49	purchase	170	16.00	19	\N	\N	\N	2026-06-21 16:00:12.40043	0	61
161	50	purchase	40	17.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	62
162	51	purchase	60	18.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	63
163	52	purchase	80	19.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	64
164	53	purchase	100	20.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	65
165	54	purchase	40	70.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	66
166	55	purchase	60	88.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	67
167	56	purchase	80	106.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	68
168	57	purchase	100	124.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	69
169	58	purchase	40	142.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	70
170	59	purchase	60	160.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	71
171	60	purchase	80	190.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	72
172	61	purchase	100	196.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	73
173	62	purchase	40	214.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	74
174	63	purchase	60	70.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	75
175	64	purchase	80	88.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	76
176	65	purchase	100	106.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	77
177	66	purchase	40	124.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	78
178	67	purchase	60	142.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	79
179	68	purchase	80	160.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	80
180	69	purchase	100	660.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	81
181	70	purchase	40	720.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	82
182	71	purchase	60	780.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	83
183	72	purchase	80	120.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	84
184	73	purchase	100	180.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	85
185	74	purchase	40	240.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	86
186	75	purchase	60	300.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	87
187	76	purchase	80	360.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	88
188	77	purchase	100	420.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	89
189	78	purchase	40	480.00	20	\N	\N	\N	2026-06-21 16:00:12.538351	0	90
190	79	purchase	25	540.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	91
191	80	purchase	40	600.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	92
192	81	purchase	55	660.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	93
193	82	purchase	70	720.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	94
194	83	purchase	25	780.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	95
195	84	purchase	40	190.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	96
196	85	purchase	55	215.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	97
197	86	purchase	70	240.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	98
198	87	purchase	25	265.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	99
199	88	purchase	40	90.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	100
200	89	purchase	55	115.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	101
201	90	purchase	70	140.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	102
202	91	purchase	25	165.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	103
203	92	purchase	40	190.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	104
204	93	purchase	55	215.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	105
205	94	purchase	70	118.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	106
206	95	purchase	25	140.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	107
207	96	purchase	40	162.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	108
208	97	purchase	55	184.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	109
209	98	purchase	70	1770.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	110
210	99	purchase	25	1860.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	111
211	100	purchase	40	150.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	112
212	101	purchase	55	272.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	113
213	102	purchase	70	294.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	114
214	103	purchase	25	316.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	115
215	104	purchase	40	338.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	116
216	105	purchase	55	30.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	117
217	106	purchase	70	52.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	118
218	107	purchase	25	74.00	21	\N	\N	\N	2026-06-21 16:00:12.591262	0	119
219	108	purchase	3	96.00	22	\N	\N	\N	2026-06-21 16:00:12.660156	0	120
220	109	purchase	3	960.00	22	\N	\N	\N	2026-06-21 16:00:12.660156	0	121
221	110	purchase	3	1050.00	22	\N	\N	\N	2026-06-21 16:00:12.660156	0	122
222	111	purchase	3	1140.00	22	\N	\N	\N	2026-06-21 16:00:12.660156	0	123
223	112	purchase	3	184.00	22	\N	\N	\N	2026-06-21 16:00:12.660156	0	124
224	113	purchase	3	206.00	22	\N	\N	\N	2026-06-21 16:00:12.660156	0	125
225	21	purchase	30	6.00	23	\N	\N	\N	2026-06-21 16:00:12.688675	0	126
226	22	purchase	30	7.00	23	\N	\N	\N	2026-06-21 16:00:12.688675	0	127
227	23	purchase	30	8.00	23	\N	\N	\N	2026-06-21 16:00:12.688675	0	128
\.


--
-- Data for Name: menstrual_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menstrual_history (menstrual_history_id, patient_id, menarch_age, cycle_length_days, bleeding_days, menstrual_regular, contraception_history, gynecologic_surgeries, medical_conditions, menopause_status, notes) FROM stdin;
1	6	13	28	5	t	None	\N	\N	\N	Normal cycles
\.


--
-- Data for Name: notification_outbox; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_outbox (notification_id, channel, recipient, template, payload, status, related_entity, error, attempts, created_at, sent_at) FROM stdin;
\.


--
-- Data for Name: nursing_note; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_note (note_id, admission_id, shift, note_dt, author_staff_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: obstetric_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.obstetric_history (obstetric_history_id, patient_id, is_first_pregnancy, married_years, gravida, para, abortions, edd, last_menstrual_cycle, notes) FROM stdin;
1	6	f	4	2	1	0	2026-08-06	2025-11-06	Second pregnancy
\.


--
-- Data for Name: para_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.para_details (para_id, obstetric_history_id, para_number, birth_year, birth_month, gender, delivery_type, alive, birth_weight_grams, complications, notes, gestational_age_weeks) FROM stdin;
1	1	1	2022	5	Female	SVD	t	3200	\N	\N	39
\.


--
-- Data for Name: party; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.party (party_id, name, contact_number, address, created_at, email, gst_number, status) FROM stdin;
1	GSK Pharmaceuticals	021-3234567	West Wharf Rd, Karachi	2026-02-06 11:42:40.173912	\N	\N	t
2	Getz Pharma	021-3864313	Korangi, Karachi	2026-02-06 11:42:40.173912	\N	\N	t
3	Searle Company	021-3506922	Port Qasim, Karachi	2026-02-06 11:42:40.173912	\N	\N	t
4	Abbott Pakistan	021-1112226	Landhi, Karachi	2026-02-06 11:42:40.173912	\N	\N	t
5	Sami Pharmaceuticals	021-3453341	F.B Area, Karachi	2026-02-06 11:42:40.173912	\N	\N	t
6	Sohail Medical Suppliers	03086784845	Cpo 14/11 Majeed S.R.E ,dalmian,national stadium road	2026-03-23 02:52:21.186981	saadadil2264326@gmail.com		t
7	Pakistan Pharma Distributors	021-34556677	Shahrah-e-Faisal, Karachi	2026-06-21 15:57:45.926079	orders@ppd.com.pk	GST-1190-7745	t
8	CarePlus Surgicals	051-2876612	Blue Area, Islamabad	2026-06-21 15:57:45.926079	info@careplus.pk	GST-7781-4420	t
9	Northern Medico Traders	091-2563399	University Road, Peshawar	2026-06-21 15:57:45.926079	contact@northmed.pk	GST-6610-2231	t
10	Indus Healthcare Supply	061-4567880	Cantt, Multan	2026-06-21 15:57:45.926079	supply@indushc.pk	GST-4521-8890	t
11	Vitalis Distribution	042-35990012	Gulberg III, Lahore	2026-06-21 15:57:45.926079	hello@vitalis.pk	GST-9912-3360	t
\.


--
-- Data for Name: party_payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.party_payment (payment_id, party_id, amount, payment_date, payment_method, reference_note, created_at, created_by) FROM stdin;
1	2	9999.00	2026-03-19 02:10:09.644055	Bank Transfer	0264225635	2026-03-19 02:10:09.644055	1
\.


--
-- Data for Name: patient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient (patient_id, patient_name, age, gender, contact_number, cnic, address, created_at) FROM stdin;
1	Alice Johnson	28	Female	03001234567	42101-1234567-1	Karachi	2026-02-06 11:42:40.173912
2	Bob Smith	35	Male	03007654321	42101-7654321-2	Lahore	2026-02-06 11:42:40.173912
3	Charlie Brown	42	Male	03009876543	42101-9876543-3	Islamabad	2026-02-06 11:42:40.173912
5	Eve Adams	25	Female	03001112233	42101-1112233-5	Karachi	2026-02-06 11:42:40.173912
6	Sarah Connor	28	Female	03001234567	42101-1234567-8	123 Sky Net Lane	2026-02-06 15:05:43.193527
4	Diana Prince,	30	Female	03005554444	42101-5555444-4	Rawalpindi	2026-02-06 11:42:40.173912
10	Muhammad Abdul Rehman	22	Male	0325-8985639	42501-9847539-1	Cpo 14/11 Majeed S.R.E ,dalmian,national stadium road	2026-03-23 03:33:39.834023
11	Sadia 	50	Male	0323-4567890	42501-1234567-8	chowk munda .....	2026-03-23 11:52:59.143655
12	Kaniz Fatima	100	Female	0356-7675678	43237-6214567-6	kalochistan	2026-03-23 14:13:36.404595
13	Talha Habib	22	Male	0345-6789087	45678-9087654-6	Bhakkar	2026-03-26 08:13:11.739285
14	w/o Hashim	18	Male	0323-4567890	34567-8909876-5	karacji	2026-03-26 11:49:24.272918
15	W/O Yahya	12	Male	0356-7890567	34567-8908765-4	muzaffargadh	2026-04-02 11:09:51.780633
\.


--
-- Data for Name: patient_allergy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_allergy (allergy_id, patient_id, allergen, reaction, severity, is_active, noted_by, noted_at) FROM stdin;
\.


--
-- Data for Name: patient_vitals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_vitals (vital_id, visit_id, blood_pressure, heart_rate, temperature, weight, height, recorded_at, blood_group, admission_id) FROM stdin;
1	1	120/80	72	99	65	165	2026-02-06 11:42:40.173912	A+	\N
2	2	130/85	80	102	75	175	2026-02-06 11:42:40.173912	B+	\N
3	3	110/70	85	98	82	180	2026-02-06 11:42:40.173912	O-	\N
4	4	115/75	76	99	68	162	2026-02-06 11:42:40.173912	AB+	\N
5	5	100/60	95	99	12	90	2026-02-06 11:42:40.173912	O+	\N
6	6	120/80	72	98	65	165	2026-02-06 15:05:43.193527	O+	\N
7	58	120/80	72	98	80	165	2026-03-23 03:35:41.273251	A+	\N
8	61	120/80	80	100	90	200	2026-03-23 14:14:54.725363	O+	\N
9	68	120/80	72	98	40	165	2026-04-02 11:11:12.807492	A+	\N
\.


--
-- Data for Name: payroll_line_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payroll_line_item (payroll_line_id, payroll_run_id, account_type, person_id, staff_id, doctor_id, salary_model, base_amount, patient_count, per_patient_fee, allowance_total, deduction_total, adjustment_total, gross_amount, net_amount, calc_snapshot, created_at, updated_at) FROM stdin;
49	1	doctor	1	\N	1	per_patient_seen	3000.00	2	1500.00	0.00	0.00	0.00	3000.00	3000.00	{"allowances": [], "period_month": "2026-03", "salary_model": "per_patient_seen"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
50	1	doctor	2	\N	2	per_patient_seen	0.00	0	2000.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "per_patient_seen"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
51	1	doctor	3	\N	3	per_patient_seen	0.00	0	1000.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "per_patient_seen"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
52	1	doctor	4	\N	4	per_patient_seen	0.00	0	1200.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "per_patient_seen"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
53	1	doctor	5	\N	5	per_patient_seen	0.00	0	1800.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "per_patient_seen"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
54	1	staff	1	1	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
55	1	staff	2	2	\N	fixed_monthly	60000.00	0	0.00	0.00	0.00	0.00	60000.00	60000.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
56	1	staff	3	3	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
57	1	staff	4	4	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
58	1	staff	5	5	\N	fixed_monthly	50000.00	0	0.00	0.00	0.00	0.00	50000.00	50000.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
59	1	staff	6	6	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
60	1	staff	7	7	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-03", "salary_model": "fixed_monthly"}	2026-03-24 19:42:58.275064	2026-03-24 19:42:58.275064
61	2	doctor	1	\N	1	per_patient_seen	0.00	0	1500.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "per_patient_seen"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
62	2	doctor	2	\N	2	per_patient_seen	0.00	0	2000.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "per_patient_seen"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
63	2	doctor	3	\N	3	per_patient_seen	0.00	0	1000.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "per_patient_seen"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
64	2	doctor	4	\N	4	per_patient_seen	0.00	0	1200.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "per_patient_seen"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
65	2	doctor	5	\N	5	per_patient_seen	0.00	0	1800.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "per_patient_seen"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
66	2	staff	1	1	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
67	2	staff	2	2	\N	fixed_monthly	60000.00	0	0.00	0.00	0.00	0.00	60000.00	60000.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
68	2	staff	3	3	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
69	2	staff	4	4	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
70	2	staff	5	5	\N	fixed_monthly	50000.00	0	0.00	0.00	0.00	0.00	50000.00	50000.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
71	2	staff	6	6	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
72	2	staff	7	7	\N	fixed_monthly	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	{"allowances": [], "period_month": "2026-04", "salary_model": "fixed_monthly"}	2026-04-02 12:14:01.768279	2026-04-02 12:14:01.768279
\.


--
-- Data for Name: payroll_run; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payroll_run (payroll_run_id, period_month, status, generated_by, finalized_by, generated_at, finalized_at, notes) FROM stdin;
1	2026-03-01	draft	6	\N	2026-03-24 19:42:58.275064	\N	\N
2	2026-04-01	draft	6	\N	2026-04-02 12:14:01.768279	\N	\N
\.


--
-- Data for Name: pharmacy_customer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pharmacy_customer (customer_id, name, phone, email, address, loyalty_points, created_at, last_purchase_date) FROM stdin;
\.


--
-- Data for Name: pharmacy_sale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pharmacy_sale (sale_id, visit_id, bill_id, sale_timestamp, handled_by, total_amount, status, payment_type, payment_reference, paid_amount, due_amount, change_amount, discount_percent, discount_amount, tax_amount, is_prescription_sale, prescription_id, notes, customer_id, settlement_channel, settlement_status, settled_at, settled_by) FROM stdin;
64	\N	\N	2026-03-23 17:32:35.53455	2	31.00	Completed	CASH	TXN-1774287154915-172	50.00	0.00	19.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-23 22:32:36.031	2
67	67	59	2026-03-30 03:57:41.300668	2	96.00	Completed	CASH	TXN-1774843059541-341	100.00	0.00	4.00	0.00	0.00	0.00	t	7	\N	\N	pharmacy	settled	2026-03-30 08:57:41.83	2
70	\N	\N	2026-04-02 11:31:58.647222	2	131.00	Completed	CASH	TXN-1775129516666-805	150.00	0.00	19.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-04-02 16:31:59.173	2
72	\N	\N	2026-04-02 11:36:11.1626	2	20.00	Completed	CASH	TXN-1775129769484-30	50.00	0.00	30.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-04-02 16:36:11.443	2
71	69	61	2026-04-02 11:35:26.903592	2	20.00	Returned	CASH	TXN-1775129725216-189	50.00	0.00	30.00	0.00	0.00	0.00	t	8	\N	\N	pharmacy	settled	2026-04-02 16:35:27.405	2
2	\N	\N	2026-02-06 10:40:55.360756	1	15.00	Completed	CASH	TXN-1770374452467-584	50.00	0.00	35.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-02-06 10:40:55.360756	\N
3	\N	\N	2026-02-10 03:39:00.912221	1	250.00	Completed	CASH	TXN-1770694739052-189	500.00	0.00	250.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-02-10 03:39:00.912221	\N
4	\N	\N	2026-03-03 09:15:26.697036	1	1.50	Completed	CASH	TXN-1772529324468-124	5.00	0.00	3.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 09:15:26.697036	\N
5	\N	\N	2026-03-03 09:16:02.493575	1	1.50	Completed	CASH	TXN-1772529360225-120	5.00	0.00	3.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 09:16:02.493575	\N
6	\N	\N	2026-03-03 09:29:23.166007	1	15.00	Completed	CASH	TXN-1772530161425-128	15.00	0.00	0.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 09:29:23.166007	\N
7	\N	\N	2026-03-03 09:30:06.909347	1	1.50	Completed	CASH	TXN-1772530205124-637	2.00	0.00	0.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 09:30:06.909347	\N
8	\N	\N	2026-03-03 09:31:00.032848	1	12.00	Completed	CASH	TXN-1772530258545-779	15.00	0.00	3.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 09:31:00.032848	\N
9	\N	\N	2026-03-03 10:05:51.187964	1	15.00	Completed	CASH	TXN-1772532348276-290	20.00	0.00	5.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 10:05:51.187964	\N
10	\N	\N	2026-03-03 10:31:02.116343	1	1.50	Completed	CASH	TXN-1772533860051-961	2.00	0.00	0.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 10:31:02.116343	\N
11	\N	\N	2026-03-03 17:57:02.489355	1	15.00	Completed	CASH	TXN-1772560622135-880	50.00	0.00	35.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 17:57:02.489355	\N
12	\N	\N	2026-03-03 18:20:48.95872	1	15.00	Completed	CASH	TXN-1772562046497-96	15.00	0.00	0.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 18:20:48.95872	\N
13	\N	\N	2026-03-03 18:33:03.791011	1	15.00	Completed	CASH	TXN-1772562783465-27	15.00	0.00	0.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-03 18:33:03.791011	\N
14	\N	\N	2026-03-03 18:41:14.075212	1	-15.00	Returned	CASH	TXN-1772563271982-480	15.00	0.00	0.00	0.00	0.00	0.00	f	\N	Return transaction (no original sale reference)	\N	pharmacy	settled	2026-03-03 18:41:14.075212	\N
15	\N	\N	2026-03-03 18:41:51.868192	1	-15.00	Returned	CASH	TXN-1772563309822-707	15.00	0.00	0.00	0.00	0.00	0.00	f	\N	Return transaction (no original sale reference)	\N	pharmacy	settled	2026-03-03 18:41:51.868192	\N
16	\N	\N	2026-03-03 18:42:54.013289	1	-15.00	Returned	CASH	TXN-1772563371879-193	15.00	0.00	0.00	0.00	0.00	0.00	f	\N	Return transaction (no original sale reference)	\N	pharmacy	settled	2026-03-03 18:42:54.013289	\N
18	\N	\N	2026-03-03 18:56:49.827934	1	0.00	Returned	CASH	TXN-1772564206979-47	0.00	0.00	0.00	0.00	0.00	0.00	f	\N	Standalone Return Transaction	\N	pharmacy	settled	2026-03-03 18:56:49.827934	\N
19	\N	\N	2026-03-03 18:57:15.725396	1	0.00	Returned	CASH	TXN-1772564233357-459	0.00	0.00	0.00	0.00	0.00	0.00	f	\N	Standalone Return Transaction	\N	pharmacy	settled	2026-03-03 18:57:15.725396	\N
20	\N	\N	2026-03-04 19:23:15.076058	1	27.64	Completed	CASH	TXN-1772652192836-921	900.00	0.00	872.36	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-04 19:23:15.076058	\N
21	\N	\N	2026-03-04 19:25:44.552936	1	90.00	Completed	CASH	TXN-1772652342850-252	10000.00	0.00	9910.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-04 19:25:44.552936	\N
22	\N	\N	2026-03-05 15:39:05.760392	1	15.00	Completed	CASH	TXN-1772725142579-613	50.00	0.00	35.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-05 15:39:05.760392	\N
23	\N	\N	2026-03-14 03:49:28.16219	1	1.50	Completed	CASH	TXN-1773460166352-685	500.00	0.00	498.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-14 03:49:28.16219	\N
24	\N	\N	2026-03-19 01:50:01.443584	1	1320.00	Completed	CASH	TXN-1773884999965-198	5000.00	0.00	3680.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-19 01:50:01.443584	\N
25	\N	\N	2026-03-19 01:58:49.982351	1	1140.00	Completed	CASH	TXN-1773885528756-783	3000.00	0.00	1860.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-19 01:58:49.982351	\N
26	\N	\N	2026-03-19 02:00:53.092546	1	1520.00	Completed	CASH	TXN-1773885651899-635	2500.00	0.00	980.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-19 02:00:53.092546	\N
27	\N	\N	2026-03-19 02:05:00.440968	1	270.00	Completed	CASH	TXN-1773885899265-632	300.00	0.00	30.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-19 02:05:00.440968	\N
28	\N	\N	2026-03-20 04:34:51.508672	1	1.55	Completed	CASH	TXN-1773981288483-758	2.00	0.00	0.45	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-20 04:34:51.508672	\N
29	\N	\N	2026-03-20 04:55:32.701801	1	15.25	Completed	CASH	TXN-1773982530861-911	20.00	0.00	4.75	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-20 04:55:32.701801	\N
30	\N	\N	2026-03-20 18:17:53.026767	1	1.50	Completed	CASH	TXN-1774030671072-742	5.00	0.00	3.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-20 18:17:53.026767	\N
31	\N	\N	2026-03-22 01:23:24.670507	1	15.50	Completed	CASH	TXN-1774142602610-340	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 01:23:24.670507	\N
32	\N	\N	2026-03-22 01:23:52.233464	1	31.00	Completed	CASH	TXN-1774142632289-163	50.00	0.00	19.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 01:23:52.233464	\N
33	\N	\N	2026-03-22 05:05:23.335591	1	514.00	Completed	CASH	TXN-1774155923108-772	1000.00	0.00	486.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 05:05:23.335591	\N
34	\N	\N	2026-03-22 05:56:53.952238	1	2368.00	Completed	CASH	TXN-1774159011572-680	5000.00	0.00	2632.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 05:56:53.952238	\N
35	\N	\N	2026-03-22 07:41:32.116683	1	1.55	Completed	CASH	TXN-1774165290067-40	5.00	0.00	3.45	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 07:41:32.116683	\N
36	\N	\N	2026-03-22 07:42:03.95198	1	1.55	Completed	CASH	TXN-1774165322670-252	6.00	0.00	4.45	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 07:42:03.95198	\N
37	\N	\N	2026-03-22 08:24:36.180051	1	15.50	Completed	CASH	TXN-1774167874407-684	50.00	0.00	34.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 08:24:36.180051	\N
39	\N	\N	2026-03-22 08:35:53.920129	1	1.55	Completed	CASH	TXN-1774168551541-209	2.00	0.00	0.45	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 08:35:53.920129	\N
40	\N	\N	2026-03-22 10:26:13.620765	1	15.50	Completed	CASH	TXN-1774175171434-261	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 10:26:13.620765	\N
41	\N	\N	2026-03-22 10:26:38.375103	1	37.50	Completed	CASH	TXN-1774175196292-963	50.00	0.00	12.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 10:26:38.375103	\N
42	\N	\N	2026-03-22 10:35:12.008888	1	15.50	Completed	CASH	TXN-1774175709518-331	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 10:35:12.008888	\N
43	\N	\N	2026-03-22 10:40:17.695627	1	15.50	Completed	CASH	TXN-1774176015550-259	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 10:40:17.695627	\N
44	\N	\N	2026-03-22 11:02:13.236056	1	15.50	Completed	CASH	TXN-1774177331372-683	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:02:13.236056	\N
45	\N	\N	2026-03-22 11:03:53.487373	1	15.50	Completed	CASH	TXN-1774177433318-48	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:03:53.487373	\N
46	\N	\N	2026-03-22 11:07:22.952199	1	15.50	Completed	CASH	TXN-1774177642815-838	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:07:22.952199	\N
47	\N	\N	2026-03-22 11:14:13.724789	1	15.50	Completed	CASH	TXN-1774178053454-197	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:14:13.724789	\N
48	\N	\N	2026-03-22 11:18:08.743853	1	15.50	Completed	CASH	TXN-1774178288599-172	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:18:08.743853	\N
49	\N	\N	2026-03-22 11:22:24.503983	1	15.50	Completed	CASH	TXN-1774178544380-979	200.00	0.00	184.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:22:24.503983	\N
50	\N	\N	2026-03-22 11:24:44.488063	1	15.50	Completed	CASH	TXN-1774178684236-59	50.00	0.00	34.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:24:44.488063	\N
52	\N	\N	2026-03-22 11:39:57.819273	1	0.00	Returned	CASH	TXN-1774179596071-565	0.00	0.00	0.00	0.00	0.00	0.00	f	\N	Standalone Return Transaction	\N	pharmacy	settled	2026-03-22 11:39:57.819273	\N
53	\N	\N	2026-03-22 11:44:57.477672	1	0.00	Returned	CASH	TXN-1774179897321-744	0.00	0.00	0.00	0.00	0.00	0.00	f	\N	Standalone Return Transaction	\N	pharmacy	settled	2026-03-22 11:44:57.477672	\N
54	\N	\N	2026-03-22 12:00:24.889467	1	0.00	Returned	CASH	TXN-1774180823049-973	0.00	0.00	0.00	0.00	0.00	0.00	f	\N	Standalone Return Transaction	\N	pharmacy	settled	2026-03-22 12:00:24.889467	\N
57	56	48	2026-03-22 13:40:11.687097	1	2017.50	Returned	CASH	TXN-1774186810153-719	5000.00	0.00	2982.50	0.00	0.00	0.00	t	3	\N	\N	pharmacy	settled	2026-03-22 13:40:11.687097	\N
56	\N	\N	2026-03-22 13:09:16.193964	1	108.00	Returned	CASH	TXN-1774184954883-205	200.00	0.00	92.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 13:09:16.193964	\N
51	\N	\N	2026-03-22 11:38:49.477774	1	13.95	Returned	CASH	TXN-1774179528114-612	200.00	0.00	186.05	10.00	1.55	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 11:38:49.477774	\N
58	\N	\N	2026-03-22 15:17:29.791494	1	15.50	Completed	CASH	TXN-1774192648029-837	20.00	0.00	4.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-22 15:17:29.791494	\N
59	\N	\N	2026-03-23 04:03:15.174116	1	31.00	Completed	CASH	TXN-1774238593770-582	50.00	0.00	19.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-23 04:03:15.174116	\N
60	58	50	2026-03-23 04:04:01.546	1	30.50	Completed	CASH	TXN-1774238641443-741	50.00	0.00	19.50	0.00	0.00	0.00	t	4	\N	\N	pharmacy	settled	2026-03-23 04:04:01.546	\N
61	\N	\N	2026-03-23 08:58:53.980216	1	400.00	Completed	CASH	TXN-1774256330823-375	400.00	0.00	0.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-23 08:58:53.980216	\N
63	60	52	2026-03-23 13:49:19.886683	2	840.00	Completed	CASH	TXN-1774273755776-119	1000.00	0.00	160.00	0.00	0.00	0.00	t	5	\N	\N	pharmacy	settled	2026-03-23 13:49:19.886683	\N
65	\N	\N	2026-03-26 08:38:18.179139	2	66.00	Completed	CASH	TXN-1774514294651-390	100.00	0.00	34.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-26 13:38:18.525	2
66	65	57	2026-03-26 08:40:31.980088	2	35.25	Returned	CASH	TXN-1774514430160-128	50.00	0.00	14.75	0.00	0.00	0.00	t	6	\N	\N	pharmacy	settled	2026-03-26 13:40:32.698	2
68	\N	\N	2026-03-30 04:00:06.153109	2	20.00	Completed	CASH	TXN-1774843204952-259	50.00	0.00	30.00	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-30 09:00:06.323	2
69	\N	\N	2026-03-30 04:00:27.280063	2	75.50	Completed	CASH	TXN-1774843225857-928	100.00	0.00	24.50	0.00	0.00	0.00	f	\N	\N	\N	pharmacy	settled	2026-03-30 09:00:27.933	2
\.


--
-- Data for Name: pharmacy_sale_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pharmacy_sale_detail (pharmacy_sale_detail_id, sale_id, medicine_id, quantity, unit_sale_price, line_total, discount_percent, discount_amount, sub_unit_sale_price, sub_quantity, batch_id, prescription_medicine_id, reason_code, reason_note, handled_by, created_at) FROM stdin;
1	2	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
2	3	7	1	250.00	250.00	0.00	0.00	250.00	0	\N	\N	\N	\N	\N	2026-03-19 13:36:12.159678
3	4	1	0	15.00	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
4	5	1	0	15.00	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
5	6	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
6	7	1	0	15.00	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
7	8	1	0	15.00	12.00	0.00	0.00	1.50	8	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
8	9	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
9	10	1	0	15.00	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
10	11	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
11	12	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
12	13	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
13	14	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
14	15	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
15	16	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
16	20	1	1	15.00	27.65	3.00	0.85	1.50	9	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
17	21	5	1	50.00	90.00	0.00	0.00	5.00	8	5	\N	\N	\N	\N	2026-03-19 13:36:12.159678
18	22	1	1	15.00	15.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
19	23	1	0	15.00	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
20	24	1	88	15.00	1320.00	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-19 13:36:12.159678
21	25	3	30	40.00	1140.00	5.00	60.00	4.00	0	3	\N	\N	\N	\N	2026-03-19 13:36:12.159678
22	26	5	38	50.00	1520.00	20.00	380.00	5.00	0	5	\N	\N	\N	\N	2026-03-19 13:36:12.159678
23	27	2	1	250.00	250.00	0.00	0.00	2.50	0	2	\N	\N	\N	\N	2026-03-19 13:36:12.159678
24	27	4	1	20.00	20.00	0.00	0.00	2.00	0	4	\N	\N	\N	\N	2026-03-19 13:36:12.159678
25	28	1	0	15.50	1.55	0.00	0.00	1.55	1	6	\N	\N	\N	\N	2026-03-20 04:34:51.508672
26	29	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-20 04:55:32.701801
27	30	1	0	15.25	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-20 18:17:53.026767
28	31	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 01:23:24.670507
29	32	1	2	15.25	30.50	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 01:23:52.233464
30	33	6	4	30.00	126.00	0.00	0.00	3.00	2	7	\N	\N	\N	\N	2026-03-22 05:05:23.335591
31	33	5	8	50.00	388.00	3.00	12.00	5.00	0	5	\N	\N	\N	\N	2026-03-22 05:05:23.335591
32	34	5	10	50.00	500.00	0.00	0.00	5.00	0	5	\N	\N	\N	\N	2026-03-22 05:56:53.952238
33	34	7	7	240.00	1680.00	0.00	0.00	240.00	0	8	\N	\N	\N	\N	2026-03-22 05:56:53.952238
34	34	10	4	22.00	88.00	0.00	0.00	2.20	0	10	\N	\N	\N	\N	2026-03-22 05:56:53.952238
35	34	2	4	25.00	100.00	0.00	0.00	2.50	0	2	\N	\N	\N	\N	2026-03-22 05:56:53.952238
36	35	1	0	15.25	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-22 07:41:32.116683
37	36	1	0	15.25	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-22 07:42:03.95198
38	37	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 08:24:36.180051
40	39	1	0	15.25	1.50	0.00	0.00	1.50	1	1	\N	\N	\N	\N	2026-03-22 08:35:53.920129
41	40	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 10:26:13.620765
42	41	1	2	15.25	38.00	0.00	0.00	1.50	5	1	\N	\N	\N	\N	2026-03-22 10:26:38.375103
43	42	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 10:35:12.008888
44	43	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 10:40:17.695627
45	44	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:02:13.236056
46	45	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:03:53.487373
47	46	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:07:22.952199
48	47	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:14:13.724789
49	48	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:18:08.743853
50	49	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:22:24.503983
51	50	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:24:44.488063
52	51	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 11:38:49.477774
53	56	9	1	108.00	108.00	0.00	0.00	18.00	0	9	\N	\N	\N	\N	2026-03-22 13:09:16.193964
54	57	1	70	15.25	1067.50	0.00	0.00	1.50	0	1	6	\N	\N	\N	2026-03-22 13:40:11.687097
55	57	5	19	50.00	950.00	0.00	0.00	5.00	0	5	7	\N	\N	\N	2026-03-22 13:40:11.687097
56	58	1	1	15.25	15.25	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-22 15:17:29.791494
57	59	1	1	15.50	15.50	0.00	0.00	1.55	0	16	\N	\N	\N	\N	2026-03-23 04:03:15.174116
58	59	1	1	15.50	15.50	0.00	0.00	1.55	0	15	\N	\N	\N	\N	2026-03-23 04:03:15.174116
59	60	1	2	15.25	30.50	0.00	0.00	1.50	0	1	8	\N	\N	\N	2026-03-23 04:04:01.546
60	61	12	1	400.00	400.00	0.00	0.00	400.00	0	21	\N	\N	\N	\N	2026-03-23 08:58:53.980216
61	63	4	42	20.00	840.00	0.00	0.00	2.00	0	\N	9	purchased_from_other_store	i gave the quantity i have	2	2026-03-23 13:49:19.886683
62	64	1	2	15.25	30.50	0.00	0.00	1.50	0	1	\N	\N	\N	\N	2026-03-23 17:32:35.53455
63	65	11	1	60.00	66.00	0.00	0.00	6.00	1	20	\N	\N	\N	\N	2026-03-26 08:38:18.179139
64	66	1	1	15.25	15.25	0.00	0.00	1.50	0	1	10	\N	\N	\N	2026-03-26 08:40:31.980088
65	66	4	1	20.00	20.00	0.00	0.00	2.00	0	4	11	\N	\N	\N	2026-03-26 08:40:31.980088
66	67	1	1	16.00	16.00	0.00	0.00	1.60	0	22	12	\N	\N	\N	2026-03-30 03:57:41.300668
67	67	4	4	20.00	80.00	0.00	0.00	2.00	0	4	13	\N	\N	\N	2026-03-30 03:57:41.300668
68	68	4	1	20.00	20.00	0.00	0.00	2.00	0	4	\N	\N	\N	\N	2026-03-30 04:00:06.153109
69	69	1	1	16.00	16.00	0.00	0.00	1.60	0	22	\N	\N	\N	\N	2026-03-30 04:00:27.280063
70	69	4	3	20.00	60.00	0.00	0.00	2.00	0	4	\N	\N	\N	\N	2026-03-30 04:00:27.280063
71	70	1	2	16.00	32.00	0.00	0.00	1.60	0	22	\N	\N	\N	\N	2026-04-02 11:31:58.647222
72	70	5	2	50.00	100.00	0.00	0.00	5.00	0	5	\N	\N	\N	\N	2026-04-02 11:31:58.647222
73	71	4	1	20.00	20.00	0.00	0.00	2.00	0	4	14	\N	\N	\N	2026-04-02 11:35:26.903592
74	72	4	1	20.00	20.00	0.00	0.00	2.00	0	4	\N	\N	\N	\N	2026-04-02 11:36:11.1626
\.


--
-- Data for Name: pos_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pos_audit_log (log_id, staff_id, action_type, sale_id, description, ip_address, user_agent, created_at) FROM stdin;
1	1	SALE_COMPLETED	2	Completed sale TXN-1770374452467-584 with 1 items	\N	\N	2026-02-06 10:40:55.360756
2	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-02-06 10:41:01.056832
3	1	SALE_COMPLETED	3	Completed sale TXN-1770694739052-189 with 1 items	\N	\N	2026-02-10 03:39:00.912221
4	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-02-10 03:39:04.868681
5	1	SALE_COMPLETED	4	Completed sale TXN-1772529324468-124 with 1 items	\N	\N	2026-03-03 09:15:26.697036
6	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 09:15:31.677138
7	1	SALE_COMPLETED	5	Completed sale TXN-1772529360225-120 with 1 items	\N	\N	2026-03-03 09:16:02.493575
8	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 09:16:06.601451
9	1	SALE_COMPLETED	6	Completed sale TXN-1772530161425-128 with 1 items	\N	\N	2026-03-03 09:29:23.166007
10	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 09:29:27.557328
11	1	SALE_COMPLETED	7	Completed sale TXN-1772530205124-637 with 1 items	\N	\N	2026-03-03 09:30:06.909347
12	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 09:30:10.890818
13	1	SALE_COMPLETED	8	Completed sale TXN-1772530258545-779 with 1 items	\N	\N	2026-03-03 09:31:00.032848
14	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 09:31:02.996987
15	1	SALE_COMPLETED	9	Completed sale TXN-1772532348276-290 with 1 items	\N	\N	2026-03-03 10:05:51.187964
16	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 10:05:56.498197
17	1	SALE_COMPLETED	10	Completed sale TXN-1772533860051-961 with 1 items	\N	\N	2026-03-03 10:31:02.116343
18	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 10:31:05.86574
19	1	SALE_COMPLETED	11	Completed sale TXN-1772560622135-880 with 1 items	\N	\N	2026-03-03 17:57:02.489355
20	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 17:57:08.768631
21	1	SALE_COMPLETED	12	Completed sale TXN-1772562046497-96 with 1 items	\N	\N	2026-03-03 18:20:48.95872
22	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:20:53.758536
23	1	SALE_COMPLETED	13	Completed sale TXN-1772562783465-27 with 1 items	\N	\N	2026-03-03 18:33:03.791011
24	1	RECEIPT_PRINTED	13	Receipt printed for sale TXN-1772562783465-27	\N	\N	2026-03-03 18:33:09.836508
25	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:33:10.254196
26	1	RETURN_COMPLETED	14	Standalone return TXN-1772563271982-480 with 1 items	\N	\N	2026-03-03 18:41:14.075212
27	1	RECEIPT_PRINTED	14	Receipt printed for sale TXN-1772563271982-480	\N	\N	2026-03-03 18:41:18.678547
28	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:41:19.161508
29	1	RETURN_COMPLETED	15	Standalone return TXN-1772563309822-707 with 1 items	\N	\N	2026-03-03 18:41:51.868192
30	1	RECEIPT_PRINTED	15	Receipt printed for sale TXN-1772563309822-707	\N	\N	2026-03-03 18:41:55.035398
31	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:41:55.294004
32	1	RETURN_COMPLETED	16	Standalone return TXN-1772563371879-193 with 1 items	\N	\N	2026-03-03 18:42:54.013289
33	1	RECEIPT_PRINTED	16	Receipt printed for sale TXN-1772563371879-193	\N	\N	2026-03-03 18:42:57.287427
34	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:42:57.534054
35	1	SALE_RETURNED	18	Return processed for standalone return with 1 items.	\N	\N	2026-03-03 18:56:49.827934
36	1	RECEIPT_PRINTED	18	Receipt printed for sale TXN-1772564206979-47	\N	\N	2026-03-03 18:56:54.955851
37	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:56:55.285619
38	1	SALE_RETURNED	19	Return processed for standalone return with 1 items.	\N	\N	2026-03-03 18:57:15.725396
39	1	RECEIPT_PRINTED	19	Receipt printed for sale TXN-1772564233357-459	\N	\N	2026-03-03 18:57:19.513907
40	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-03 18:57:19.766704
41	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-7819 (ID: 3) created with 2 items.	\N	\N	2026-03-03 20:32:57.241573
42	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-7820 (ID: 4) created with 1 items.	\N	\N	2026-03-04 18:24:51.307636
43	1	SALE_COMPLETED	20	Completed sale TXN-1772652192836-921 with 1 items	\N	\N	2026-03-04 19:23:15.076058
44	1	RECEIPT_PRINTED	20	Receipt printed for sale TXN-1772652192836-921	\N	\N	2026-03-04 19:23:17.640477
45	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-04 19:23:18.282111
46	1	RECEIPT_PRINTED	20	Receipt printed for sale TXN-1772652192836-921	\N	\N	2026-03-04 19:23:50.690186
47	1	SALE_COMPLETED	21	Completed sale TXN-1772652342850-252 with 1 items	\N	\N	2026-03-04 19:25:44.552936
48	1	RECEIPT_PRINTED	21	Receipt printed for sale TXN-1772652342850-252	\N	\N	2026-03-04 19:25:46.293589
49	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-04 19:25:46.555533
50	1	SALE_COMPLETED	22	Completed sale TXN-1772725142579-613 with 1 items	\N	\N	2026-03-05 15:39:05.760392
51	1	RECEIPT_PRINTED	22	Receipt printed for sale TXN-1772725142579-613	\N	\N	2026-03-05 15:39:07.968151
52	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-05 15:39:08.675528
53	1	SALE_COMPLETED	23	Completed sale TXN-1773460166352-685 with 1 items	\N	\N	2026-03-14 03:49:28.16219
54	1	RECEIPT_PRINTED	23	Receipt printed for sale TXN-1773460166352-685	\N	\N	2026-03-14 03:49:30.344375
55	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-14 03:49:31.205364
56	1	SALE_COMPLETED	24	Completed sale TXN-1773884999965-198 with 1 items	\N	\N	2026-03-19 01:50:01.443584
57	1	RECEIPT_PRINTED	24	Receipt printed for sale TXN-1773884999965-198	\N	\N	2026-03-19 01:50:03.60221
58	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-19 01:50:04.344562
59	1	SALE_COMPLETED	25	Completed sale TXN-1773885528756-783 with 1 items	\N	\N	2026-03-19 01:58:49.982351
60	1	RECEIPT_PRINTED	25	Receipt printed for sale TXN-1773885528756-783	\N	\N	2026-03-19 01:58:51.759631
61	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-19 01:58:52.272961
62	1	SALE_COMPLETED	26	Completed sale TXN-1773885651899-635 with 1 items	\N	\N	2026-03-19 02:00:53.092546
63	1	RECEIPT_PRINTED	26	Receipt printed for sale TXN-1773885651899-635	\N	\N	2026-03-19 02:00:54.829135
64	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-19 02:00:55.35293
65	1	SALE_COMPLETED	27	Completed sale TXN-1773885899265-632 with 2 items	\N	\N	2026-03-19 02:05:00.440968
66	1	RECEIPT_PRINTED	27	Receipt printed for sale TXN-1773885899265-632	\N	\N	2026-03-19 02:05:02.443891
67	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-19 02:05:02.949306
68	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-7821 (ID: 5) created with 1 items.	\N	\N	2026-03-19 02:09:08.581868
69	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-7822 (ID: 6) created with 2 items.	\N	\N	2026-03-19 05:14:35.702167
70	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-7823 (ID: 7) created with 1 items.	\N	\N	2026-03-20 03:13:36.265377
71	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-7824 (ID: 8) created with 1 items.	\N	\N	2026-03-20 03:14:30.769781
72	1	SALE_COMPLETED	28	Completed sale TXN-1773981288483-758 with 1 billable item(s)	\N	\N	2026-03-20 04:34:51.508672
73	1	RECEIPT_PRINTED	28	Receipt printed for sale TXN-1773981288483-758	\N	\N	2026-03-20 04:34:53.978778
74	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-20 04:34:54.58748
75	1	RECEIPT_PRINTED	28	Receipt printed for sale TXN-1773981288483-758	\N	\N	2026-03-20 04:34:57.944278
76	1	RECEIPT_PRINTED	28	Receipt printed for sale TXN-1773981288483-758	\N	\N	2026-03-20 04:35:11.886233
77	1	SALE_COMPLETED	29	Completed sale TXN-1773982530861-911 with 1 billable item(s)	\N	\N	2026-03-20 04:55:32.701801
78	1	RECEIPT_PRINTED	29	Receipt printed for sale TXN-1773982530861-911	\N	\N	2026-03-20 04:55:36.499344
79	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-20 04:55:36.800379
80	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007825 (ID: 9) created.	\N	\N	2026-03-20 10:09:57.942956
81	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007826 (ID: 10) created.	\N	\N	2026-03-20 10:49:38.667582
82	1	SALE_COMPLETED	30	Completed sale TXN-1774030671072-742 with 1 items	\N	\N	2026-03-20 18:17:53.026767
83	1	RECEIPT_PRINTED	30	Receipt printed for sale TXN-1774030671072-742	\N	\N	2026-03-20 18:17:55.098096
84	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-20 18:17:55.903753
85	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007827 (ID: 11) created.	\N	\N	2026-03-22 01:20:58.724236
86	1	SALE_COMPLETED	31	Completed sale TXN-1774142602610-340 with 1 billable item(s)	\N	\N	2026-03-22 01:23:24.670507
87	1	RECEIPT_PRINTED	31	Receipt printed for sale TXN-1774142602610-340	\N	\N	2026-03-22 01:23:27.328643
88	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 01:23:27.945127
89	1	SALE_COMPLETED	32	Completed sale TXN-1774142632289-163 with 1 billable item(s)	\N	\N	2026-03-22 01:23:52.233464
90	1	RECEIPT_PRINTED	32	Receipt printed for sale TXN-1774142632289-163	\N	\N	2026-03-22 01:23:54.346947
91	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 01:23:54.60162
92	1	SALE_COMPLETED	33	Completed sale TXN-1774155923108-772 with 2 billable item(s)	\N	\N	2026-03-22 05:05:23.335591
93	1	RECEIPT_PRINTED	33	Receipt printed for sale TXN-1774155923108-772	\N	\N	2026-03-22 05:05:26.008165
94	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 05:05:26.265261
95	1	RECEIPT_PRINTED	33	Receipt printed for sale TXN-1774155923108-772	\N	\N	2026-03-22 05:05:30.997317
96	1	SALE_COMPLETED	34	Completed sale TXN-1774159011572-680 with 4 billable item(s)	\N	\N	2026-03-22 05:56:53.952238
97	1	RECEIPT_PRINTED	34	Receipt printed for sale TXN-1774159011572-680	\N	\N	2026-03-22 05:56:58.145362
98	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 05:56:59.048398
99	1	SALE_COMPLETED	35	Completed sale TXN-1774165290067-40 with 1 billable item(s)	\N	\N	2026-03-22 07:41:32.116683
100	1	RECEIPT_PRINTED	35	Receipt printed for sale TXN-1774165290067-40	\N	\N	2026-03-22 07:41:35.37659
101	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 07:41:35.639005
102	1	SALE_COMPLETED	36	Completed sale TXN-1774165322670-252 with 1 billable item(s)	\N	\N	2026-03-22 07:42:03.95198
103	1	RECEIPT_PRINTED	36	Receipt printed for sale TXN-1774165322670-252	\N	\N	2026-03-22 07:42:07.03395
104	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 07:42:07.270531
105	1	SALE_COMPLETED	37	Completed sale TXN-1774167874407-684 with 1 billable item(s)	\N	\N	2026-03-22 08:24:36.180051
106	1	RECEIPT_PRINTED	37	Receipt printed for sale TXN-1774167874407-684	\N	\N	2026-03-22 08:24:38.29396
107	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 08:24:38.630378
109	1	SALE_COMPLETED	39	Completed sale TXN-1774168551541-209 with 1 billable item(s)	\N	\N	2026-03-22 08:35:53.920129
110	1	RECEIPT_PRINTED	39	Receipt printed for sale TXN-1774168551541-209	\N	\N	2026-03-22 08:35:58.070091
111	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 08:35:58.341061
112	1	SALE_COMPLETED	40	Completed sale TXN-1774175171434-261 with 1 billable item(s)	\N	\N	2026-03-22 10:26:13.620765
113	1	RECEIPT_PRINTED	40	Receipt printed for sale TXN-1774175171434-261	\N	\N	2026-03-22 10:26:17.499632
114	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 10:26:17.885922
115	1	SALE_COMPLETED	41	Completed sale TXN-1774175196292-963 with 1 billable item(s)	\N	\N	2026-03-22 10:26:38.375103
116	1	SALE_COMPLETED	42	Completed sale TXN-1774175709518-331 with 1 billable item(s)	\N	\N	2026-03-22 10:35:12.008888
117	1	RECEIPT_PRINTED	42	Receipt printed for sale TXN-1774175709518-331	\N	\N	2026-03-22 10:35:14.684739
118	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 10:35:15.058715
119	1	SALE_COMPLETED	43	Completed sale TXN-1774176015550-259 with 1 billable item(s)	\N	\N	2026-03-22 10:40:17.695627
120	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 10:40:19.668004
121	1	SALE_COMPLETED	44	Completed sale TXN-1774177331372-683 with 1 billable item(s)	\N	\N	2026-03-22 11:02:13.236056
122	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:02:14.864073
123	1	SALE_COMPLETED	45	Completed sale TXN-1774177433318-48 with 1 billable item(s)	\N	\N	2026-03-22 11:03:53.487373
124	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:03:54.891703
125	1	SALE_COMPLETED	46	Completed sale TXN-1774177642815-838 with 1 billable item(s)	\N	\N	2026-03-22 11:07:22.952199
126	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:07:24.166335
127	1	SALE_COMPLETED	47	Completed sale TXN-1774178053454-197 with 1 billable item(s)	\N	\N	2026-03-22 11:14:13.724789
128	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:14:15.25517
129	1	RECEIPT_CONFIG_UPDATED	\N	Updated receipt config 1	\N	\N	2026-03-22 11:17:56.747913
130	1	SALE_COMPLETED	48	Completed sale TXN-1774178288599-172 with 1 billable item(s)	\N	\N	2026-03-22 11:18:08.743853
131	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:18:10.207649
132	1	SALE_COMPLETED	49	Completed sale TXN-1774178544380-979 with 1 billable item(s)	\N	\N	2026-03-22 11:22:24.503983
133	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:22:25.830595
134	1	SALE_COMPLETED	50	Completed sale TXN-1774178684236-59 with 1 billable item(s)	\N	\N	2026-03-22 11:24:44.488063
135	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:24:46.059807
136	1	SALE_COMPLETED	51	Completed sale TXN-1774179528114-612 with 1 billable item(s)	\N	\N	2026-03-22 11:38:49.477774
137	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:38:50.875614
138	1	SALE_RETURNED	52	Return processed for standalone return with 1 items.	\N	\N	2026-03-22 11:39:57.819273
139	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:39:59.081571
140	1	SALE_RETURNED	53	Return processed for standalone return with 1 items.	\N	\N	2026-03-22 11:44:57.477672
141	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 11:44:58.730975
142	1	SALE_RETURNED	54	Return processed for standalone return with 1 items.	\N	\N	2026-03-22 12:00:24.889467
143	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 12:00:27.367401
144	1	SALE_COMPLETED	56	Completed sale TXN-1774184954883-205 with 1 billable item(s)	\N	\N	2026-03-22 13:09:16.193964
145	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 13:09:17.417754
146	1	SALE_COMPLETED	57	Completed sale TXN-1774186810153-719 with 2 billable item(s)	\N	\N	2026-03-22 13:40:11.687097
147	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 13:40:15.96381
148	1	SALE_RETURNED	57	Return processed for sale #57 with 1 items.	\N	\N	2026-03-22 13:58:15.739902
149	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 13:58:18.55731
150	1	SALE_RETURNED	57	Return processed for sale #57 with 1 items.	\N	\N	2026-03-22 13:59:04.348619
151	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 13:59:08.127854
152	1	SALE_RETURNED	56	Return processed for sale #56 with 1 items.	\N	\N	2026-03-22 14:08:15.569753
153	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 14:08:18.320158
154	1	SALE_RETURNED	51	Return processed for sale #51 with 1 items.	\N	\N	2026-03-22 15:17:09.499964
155	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 15:17:12.691611
156	1	SALE_COMPLETED	58	Completed sale TXN-1774192648029-837 with 1 billable item(s)	\N	\N	2026-03-22 15:17:29.791494
157	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 15:17:33.110158
158	1	SALE_RETURNED	28	Return processed for sale #28 with 1 items.	\N	\N	2026-03-22 15:23:09.052461
159	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-22 15:23:11.907892
160	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007828 (ID: 12) created.	\N	\N	2026-03-22 15:29:19.014133
161	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007829 (ID: 13) created.	\N	\N	2026-03-22 15:30:37.536986
162	1	SALE_COMPLETED	59	Completed sale TXN-1774238593770-582 with 1 billable item(s)	\N	\N	2026-03-23 04:03:15.174116
163	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-23 04:03:18.029032
164	1	SALE_COMPLETED	60	Completed sale TXN-1774238641443-741 with 1 billable item(s)	\N	\N	2026-03-23 04:04:01.546
165	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-23 04:04:05.132849
166	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007830 (ID: 14) created.	\N	\N	2026-03-23 08:22:44.954103
167	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007831 (ID: 15) created.	\N	\N	2026-03-23 08:26:41.696044
168	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007832 (ID: 16) created.	\N	\N	2026-03-23 08:57:44.385093
169	1	SALE_COMPLETED	61	Completed sale TXN-1774256330823-375 with 1 billable item(s)	\N	\N	2026-03-23 08:58:53.980216
170	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-23 08:58:57.22792
171	2	SALE_COMPLETED	63	Completed sale TXN-1774273755776-119 with 1 billable item(s)	\N	\N	2026-03-23 13:49:19.886683
172	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-23 13:49:22.804072
173	2	SALE_COMPLETED	64	Completed sale TXN-1774287154915-172 with 1 billable item(s)	\N	\N	2026-03-23 17:32:35.53455
174	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-23 17:32:38.264871
175	2	SALE_COMPLETED	65	Completed sale TXN-1774514294651-390 with 1 billable item(s)	\N	\N	2026-03-26 08:38:18.179139
176	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-26 08:38:20.67354
177	2	SALE_COMPLETED	66	Completed sale TXN-1774514430160-128 with 2 billable item(s)	\N	\N	2026-03-26 08:40:31.980088
178	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-26 08:40:34.990398
179	1	SALE_RETURNED	66	Return processed for sale #66 with 2 items.	\N	\N	2026-03-26 08:43:05.511385
180	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-26 08:43:07.475744
181	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007833 (ID: 17) created.	\N	\N	2026-03-26 08:50:08.30069
182	2	SALE_COMPLETED	67	Completed sale TXN-1774843059541-341 with 2 billable item(s)	\N	\N	2026-03-30 03:57:41.300668
183	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-30 03:57:45.632634
184	2	SALE_COMPLETED	68	Completed sale TXN-1774843204952-259 with 1 billable item(s)	\N	\N	2026-03-30 04:00:06.153109
185	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-30 04:00:08.372586
186	2	SALE_COMPLETED	69	Completed sale TXN-1774843225857-928 with 2 billable item(s)	\N	\N	2026-03-30 04:00:27.280063
187	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-03-30 04:00:30.19691
188	2	SALE_COMPLETED	70	Completed sale TXN-1775129516666-805 with 2 billable item(s)	\N	\N	2026-04-02 11:31:58.647222
189	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-04-02 11:32:00.537167
190	2	SALE_COMPLETED	71	Completed sale TXN-1775129725216-189 with 1 billable item(s)	\N	\N	2026-04-02 11:35:26.903592
191	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-04-02 11:35:29.040043
192	2	SALE_COMPLETED	72	Completed sale TXN-1775129769484-30 with 1 billable item(s)	\N	\N	2026-04-02 11:36:11.1626
193	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-04-02 11:36:12.361124
194	1	SALE_RETURNED	71	Return processed for sale #71 with 1 items.	\N	\N	2026-04-02 11:37:50.674667
195	1	CASH_DRAWER_OPENED	\N	Cash drawer manually opened	\N	\N	2026-04-02 11:37:52.215447
196	1	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007834 (ID: 18) created.	\N	\N	2026-04-02 11:44:45.56495
197	2	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007835 (ID: 19) created.	\N	\N	2026-06-21 16:00:12.40043
198	2	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007836 (ID: 20) created.	\N	\N	2026-06-21 16:00:12.538351
199	2	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007837 (ID: 21) created.	\N	\N	2026-06-21 16:00:12.591262
200	2	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007838 (ID: 22) created.	\N	\N	2026-06-21 16:00:12.660156
201	2	PURCHASE_CREATED	\N	Medicine purchase invoice #INV-007839 (ID: 23) created.	\N	\N	2026-06-21 16:00:12.688675
\.


--
-- Data for Name: pos_held_transaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pos_held_transaction (hold_id, staff_id, customer_name, customer_phone, hold_timestamp, retrieved_timestamp, total_amount, status, notes) FROM stdin;
2	1	\N	\N	2026-03-22 07:20:55.972174	\N	1.55	retrieved	Held by Current User
1	1	\N	\N	2026-02-08 13:33:16.308122	\N	37.50	retrieved	Held by Current User
3	1	\N	\N	2026-03-22 10:34:57.371969	\N	15.50	retrieved	Held by Current User
4	1	\N	\N	2026-03-22 11:45:08.651666	\N	15.50	held	Held by Current User
5	1	\N	\N	2026-03-22 11:46:47.15344	\N	20.00	held	Held by Current User
6	1	\N	\N	2026-03-22 12:00:43.433564	\N	15.50	held	[MODE:RETURN] Held by Current User
7	1	\N	\N	2026-03-22 15:15:47.058962	\N	62.00	held	[MODE:SALE] Held by Current User
9	1	\N	\N	2026-03-23 04:36:17.264084	2026-03-23 04:42:02.471092	30.50	cancelled	[MODE:RETURN] Held by Current User
8	1	\N	\N	2026-03-23 04:11:03.057428	2026-03-23 04:43:53.524931	30.50	cancelled	[MODE:RETURN] Held by Current User
10	1	Muhammad Abdul Rehman	\N	2026-03-23 04:45:48.448867	\N	30.50	held	[MODE:RETURN] [PATIENT_ID:10] [VISIT_ID:58] [CUSTOMER_ID:10] [CUSTOMER_NAME:Muhammad%20Abdul%20Rehman] Held by Current User
11	1	\N	\N	2026-03-23 17:32:20.853679	\N	31.00	held	[MODE:SALE] Held by Current User
12	1	\N	\N	2026-03-26 08:43:58.370532	\N	15.50	held	[MODE:SALE] Held by Current User
13	1	\N	\N	2026-03-30 03:59:35.503929	\N	75.50	held	[MODE:SALE] Held by Current User
14	1	\N	\N	2026-04-02 11:35:50.999819	\N	15.50	held	[MODE:SALE] Held by Current User
\.


--
-- Data for Name: pos_held_transaction_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pos_held_transaction_detail (detail_id, hold_id, medicine_id, qty, sub_qty, unit_price, discount_percent, line_total) FROM stdin;
1	1	1	0	25	15.00	0.00	37.50
2	2	1	0	1	15.50	0.00	1.55
3	3	1	1	0	15.50	0.00	15.50
4	4	1	1	0	15.50	0.00	15.50
5	5	4	1	0	20.00	0.00	20.00
6	6	1	1	0	15.50	0.00	15.50
7	7	1	4	0	15.50	0.00	62.00
8	8	1	2	0	15.25	0.00	30.50
9	9	1	2	0	15.25	0.00	30.50
10	10	1	2	0	15.25	0.00	30.50
11	11	1	2	0	15.50	0.00	31.00
12	12	1	1	0	15.50	0.00	15.50
13	13	1	1	0	15.50	0.00	15.50
14	13	4	3	0	20.00	0.00	60.00
15	14	1	1	0	15.50	0.00	15.50
\.


--
-- Data for Name: pos_receipt_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pos_receipt_config (config_id, clinic_name, clinic_address, clinic_phone, clinic_email, tax_registration_number, receipt_header, receipt_footer, logo_url, printer_name, paper_size, is_active, created_at) FROM stdin;
1	Dr Fauzia Ishaq Clinic	35HM+388, Sadaat Colony, Muzaffargarh	034567654321	\N	\N	Welcome to our Clinic	Get Well Soon	\N	\N	80mm	t	2026-02-06 11:42:40.173912
\.


--
-- Data for Name: pos_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pos_session (session_id, staff_id, opening_time, closing_time, opening_balance, closing_balance, expected_balance, cash_sales_total, card_sales_total, total_sales_count, notes, status) FROM stdin;
1	4	2026-02-06 11:42:40.173912	\N	5000.00	\N	\N	0.00	0.00	0	\N	open
\.


--
-- Data for Name: prescription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescription (prescription_id, visit_id, doctor_id, created_at) FROM stdin;
1	51	1	2026-03-19 03:54:50.025099
2	57	1	2026-03-22 03:52:40.77545
3	56	1	2026-03-22 03:54:32.913888
4	58	1	2026-03-23 03:55:20.525912
5	60	2	2026-03-23 13:02:50.09533
6	65	2	2026-03-26 08:24:01.618048
7	67	2	2026-03-30 03:53:46.490897
8	69	2	2026-04-02 11:18:36.768291
\.


--
-- Data for Name: prescription_fulfillment_action; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescription_fulfillment_action (fulfillment_action_id, prescription_medicine_id, prescription_id, visit_id, patient_id, available_quantity_at_action, action_type, reason_code, reason_note, override_sale_price, override_quantity, handled_by, handled_at, created_at) FROM stdin;
1	9	5	60	10	42	override_billed_external_source	purchased_from_other_store	i gave the quantity i have	20.00	42	2	2026-03-23 13:49:19.886683	2026-03-23 13:49:19.886683
\.


--
-- Data for Name: prescription_medicines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescription_medicines (prescription_medicine_id, prescription_id, medicine_id, duration, instructions, dispensed_by, frequency, prescribed_quantity, dispensed_quantity, dispensed_at, created_at, updated_at, prescribed_sub_quantity, dispensed_sub_quantity, available_quantity_snapshot, availability_status, availability_note, dosage) FROM stdin;
1	1	1	5 days		\N	BD	1	0	2026-03-19 03:54:50.025099	2026-03-19 03:54:50.025099	2026-03-19 03:54:50.025099	0	0	0	unknown	\N	\N
2	1	6	5 days		\N	BD	1	0	2026-03-19 03:55:39.723918	2026-03-19 03:55:39.723918	2026-03-19 03:55:39.723918	0	0	0	unknown	\N	\N
3	1	8	5 days		\N	BD	1	0	2026-03-19 03:55:39.723918	2026-03-19 03:55:39.723918	2026-03-19 03:55:39.723918	0	0	0	unknown	\N	\N
4	2	1	5 days		\N	BD	10	0	2026-03-22 03:52:40.77545	2026-03-22 03:52:40.77545	2026-03-22 03:52:40.77545	0	0	124	available	\N	500 mg
5	2	5	5 days		\N	BD	10	0	2026-03-22 03:52:48.102623	2026-03-22 03:52:48.102623	2026-03-22 03:52:48.102623	0	0	100	available	\N	500 mg
6	3	1	5 weeks		1	BD	70	70	2026-03-22 13:40:11.687097	2026-03-22 03:54:32.913888	2026-03-22 13:40:11.687097	0	0	40	available	\N	500 mg
7	3	5	5 days		1	BD	19	19	2026-03-22 13:40:11.687097	2026-03-22 03:54:44.898549	2026-03-22 13:40:11.687097	0	0	63	available	\N	500 mg
8	4	1	5 days		1	BD	2	2	2026-03-23 04:04:01.546	2026-03-23 03:55:20.525912	2026-03-23 04:04:01.546	0	0	178	available	\N	500 mg
9	5	4	5 days		2	BD	43	42	2026-03-23 13:49:19.886683	2026-03-23 13:02:50.09533	2026-03-23 13:49:19.886683	0	0	42	override_fulfilled	Only 42 unit(s) available at prescribing time	400 mg
10	6	1	5 days		2	BD	1	1	2026-03-26 08:40:31.980088	2026-03-26 08:24:01.618048	2026-03-26 08:40:31.980088	0	0	175	available	\N	500 mg
11	6	4	5 days		2	BD	1	1	2026-03-26 08:40:31.980088	2026-03-26 08:24:01.618048	2026-03-26 08:40:31.980088	0	0	41	available	\N	400 mg
12	7	1	5 days		2	BD	1	1	2026-03-30 03:57:41.300668	2026-03-30 03:53:46.490897	2026-03-30 03:57:41.300668	0	0	215	available	\N	500 mg
13	7	4	5 days		2	BD	4	4	2026-03-30 03:57:41.300668	2026-03-30 03:53:46.490897	2026-03-30 03:57:41.300668	0	0	38	available	\N	400 mg
14	8	4	5 days		2	OD	1	1	2026-04-02 11:35:26.903592	2026-04-02 11:18:36.768291	2026-04-02 11:35:26.903592	0	0	33	available	\N	400 mg
\.


--
-- Data for Name: purchase_return; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_return (return_id, purchase_id, reason, return_timestamp, created_by) FROM stdin;
3	4	dsfds	2026-03-19 01:30:23.111576	1
4	5	damaged	2026-03-19 02:10:52.336793	1
5	6	jhgvvjhkj	2026-03-19 05:15:33.360354	1
6	10	sds	2026-03-20 11:03:36.957681	1
7	11	n	2026-03-22 01:22:50.456176	1
10	14	expired	2026-03-23 08:25:30.827801	1
11	16	requiremnr fulfilled	2026-03-23 08:58:22.561333	1
12	17	rejdfjdfdjspo	2026-03-26 08:51:06.958708	1
\.


--
-- Data for Name: purchase_return_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_return_detail (id, return_id, medicine_id, quantity, sub_quantity, returned_unit_price, returned_sub_unit_price, batch_id) FROM stdin;
3	3	1	1	0	10.00	\N	1
4	4	1	1000	0	10.09	\N	1
5	5	5	200	0	35.00	\N	5
6	5	1	1	0	10.09	\N	1
7	6	1	1	0	10.25	\N	13
8	7	1	1	0	10.25	\N	14
11	10	4	10	0	12.00	\N	17
12	11	11	1	0	34.00	\N	20
13	11	12	1	0	300.00	\N	21
14	12	1	10	0	15.00	\N	22
\.


--
-- Data for Name: room; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.room (room_id, ward_id, room_number, room_class, default_daily_rate, is_active, created_at) FROM stdin;
5	6	SCN-R1	\N	2000	t	2026-06-20 14:56:52.295345
\.


--
-- Data for Name: sale_return; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_return (return_id, sale_id, reason, return_timestamp, created_by, refund_amount, refund_method) FROM stdin;
2	18	Customer return	2026-03-03 18:56:49.827934	1	15.00	CASH
3	19	Customer return	2026-03-03 18:57:15.725396	1	15.00	CASH
4	52	Customer return	2026-03-22 11:39:57.819273	1	15.50	CASH
5	53	Customer return	2026-03-22 11:44:57.477672	1	15.50	CASH
6	54	Customer return	2026-03-22 12:00:24.889467	1	15.50	CASH
7	57	Customer return	2026-03-22 13:58:15.739902	1	1067.50	CASH
8	57	Customer return	2026-03-22 13:59:04.348619	1	1067.50	CASH
9	56	Customer return	2026-03-22 14:08:15.569753	1	108.00	CASH
10	51	Customer return	2026-03-22 15:17:09.499964	1	15.25	CASH
11	28	Customer return	2026-03-22 15:23:09.052461	1	1.55	CASH
12	66	Customer return	2026-03-26 08:43:05.511385	1	35.25	CASH
13	71	Customer return	2026-04-02 11:37:50.674667	1	20.00	CASH
\.


--
-- Data for Name: sale_return_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_return_detail (id, return_id, medicine_id, returned_quantity, returned_unit_price, batch_id, returned_sub_quantity, returned_sub_unit_price) FROM stdin;
2	2	1	1	15.00	1	0	1.50
3	3	1	1	15.00	1	0	1.50
4	4	1	1	15.50	\N	0	1.55
5	5	1	1	15.50	\N	0	1.55
6	6	1	1	15.50	\N	0	1.55
7	7	1	70	15.25	1	0	1.50
8	8	1	70	15.25	1	0	1.50
9	9	9	1	108.00	9	0	18.00
10	10	1	1	15.25	1	0	1.50
11	11	1	0	15.50	6	1	1.55
12	12	4	1	20.00	4	0	2.00
13	12	1	1	15.25	1	0	1.50
14	13	4	1	20.00	4	0	2.00
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff (staff_id, user_code, password, name, role, education, contact_number, email, created_at, employment_status, joined_at, exited_at, failed_login_attempts, last_failed_login_at, account_locked_until, last_login_at, password_changed_at, password_reset_token, password_reset_expires_at, mfa_enabled, session_version, photo_url, gender, dob, emergency_contact_name, emergency_contact_number, address_line_1, address_line_2, city, state, postal_code, national_id, license_id, department, designation, employment_type, facility_code, branch_code, work_location, reporting_manager_staff_id, staff_tags) FROM stdin;
5	STF005	password123	Hina Shah	Nurse	BSc Nursing	03001110005	hina.shah@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	\N	2026-03-24 05:21:48.998992	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
4	STF004	scrypt$7f06b69c3ab5868ff1945c83d04b86ed$795b3ec49b2aaaac74e9b91344b91d8e7edafc04a0f7f948fdfeef7cfbbab7d5212e7e547357f634423169f70f64442a9b95f8feea4297254cf6183ab1fff98c	Imran Ali	Cashier	BBA	03001110004	imran.ali@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	2026-06-21 08:07:30.905201	2026-03-30 03:29:00.018338	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
3	STF003	scrypt$eb4752af1faeb0824e502820b2a25bbd$8d852273ab610ae2c8691e371d562fbd72a511f9398d21a8ec57b2997637d4138fb3062c3bc802e8c745e34e21fed6988f97e7090a50961a6d1e4d590560fa04	Ayesha Malik	Lab_Technician	BS Lab Tech	03001110003	ayesha.malik@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	2026-06-21 13:24:32.877468	2026-06-21 13:24:32.912967	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
7	ADM001	scrypt$b40abe367b8c49d709c84b4da6f9bcc9$d28491b39a2821cb9bfff7985b21af1c9a2fe4d4e79e256fd90a6a624d1df258e62b8a32c30fd2aadb7d1953603767a23c84ec947579cd5086859110ab678159	Muhammad Abdul Rehman	Admin	\N	+923086784845	saadadil2264326@gmail.com	2026-03-24 06:10:25.038712	active	\N	\N	0	\N	\N	2026-06-20 11:19:49.958282	2026-03-24 06:10:25.038712	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Administration	Admin Officer	\N			\N	\N	{}
6	STF006	scrypt$759f7a9c9952178c444fb940f7075568$5b6a182d6c9f72cf75bf19f41bf7b025aaa51fff24d755cce82e778b2cef670592a62b8342ede6ec0787e32cb533242628c4da48eecc2dcd4c6f863433e99dc5	Bilal Raza	Admin	MBA	03001110006	admin@hms.com	2026-02-06 11:42:40.173912	active	\N	\N	0	2026-03-26 14:32:24.140598	\N	2026-06-21 14:37:54.257361	2026-03-24 05:28:27.424444	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
9	SCN_RECEP	scrypt$0b26c9f7e258cf4cd1cafdf6839ae8a2$f61b246c2211d3b4bad0eb1d13c91888e1a58fba7d96b291db400b300412df0358d48af119c9f92ea84339221e7da6d29802c0c42ec24b097279552ce19f0fe0	Scenario Receptionist	Receptionist	\N	\N	\N	2026-06-20 11:22:27.000971	active	\N	\N	0	\N	\N	2026-06-20 20:50:11.390276	2026-06-20 20:50:11.424796	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
8	SCN_ADMIN	scrypt$95ef05f76b6878d37cca0ff8e4d1b658$d568ea77b1a1619dd1908c9fb95273ac7308cea6203862a1b804fab7a3c3f03b912a9107f30c83a570e21fdfd88de7f25d362d8871f1a05a22a21a013f6e467f	Scenario Admin	Admin	\N	\N	\N	2026-06-20 11:22:26.991936	active	\N	\N	0	\N	\N	2026-06-20 20:50:11.439788	2026-06-20 20:50:11.47722	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
2	STF002	scrypt$6eb079bf20ad0c4d036bb87ff4e8d8cf$e284ae4c6b2af7df11477722b100684cb37506482d43052955e5027a094ec3b5452caca4a49133b68bc8994875b70f4d90de08a58f579b300ad178a065633778	Naveed Khan	Pharmacist	BPharm	03001110002	naveed.khan@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	2026-06-21 03:33:00.998721	2026-03-25 06:41:56.611343	\N	\N	f	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
1	STF001	scrypt$94ccea5e1b95ac674d3c34dbd2f890e4$d70e958daf09c609feb56c4a5fb056510f1617cd0da06c04a77f1e859917a9af0c1ad84b927c5d5e9b537ade0b8ddf774efedc5a315ce489ca7afc81d41b5349	Sara Ahmed	Receptionist	BA	03001110001	sara.ahmed@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	2026-04-02 10:42:27.545288	\N	2026-06-21 08:06:32.693131	2026-03-24 05:55:16.816767	\N	\N	f	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
\.


--
-- Data for Name: staff_attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_attendance (attendance_id, staff_id, date, check_in_time, check_out_time, status, marked_by, admin_id, shift_code, check_in_source, check_out_source, late_minutes, early_leave_minutes, overtime_minutes, break_minutes, attendance_notes, roster_id, derived_status, is_unscheduled, is_on_time, policy_snapshot) FROM stdin;
d9d5b4fa-dbc3-4d8e-bf49-40a68ae6709d	1	2026-03-23	2026-03-23 19:54:34.684333	\N	Present	System Trigger	\N	\N	\N	\N	0	0	0	0	\N	\N	unscheduled	t	f	\N
7cee4756-5cc8-4bc2-9da1-16878e6423ab	6	2026-03-24	2026-03-24 13:50:34.022	\N	Present	Admin	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
2804e3c0-2e98-47f1-bb9f-8f543eb22148	6	2026-03-25	2026-03-25 04:51:08.59	\N	Present	Admin	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
704eeeb6-bc2c-4c5b-bf45-a408dfa1e5b7	1	2026-03-25	2026-03-25 06:04:29.004	\N	Present	Receptionist	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
0932deb2-f171-40e9-9573-98b2ad273f0f	2	2026-03-25	2026-03-25 06:44:51.644	\N	Present	Pharmacist	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
2b651459-c0cd-45c9-8d78-0eada112e64a	6	2026-03-26	2026-03-26 14:31:55.163	2026-03-26 14:32:00.616	Present	Admin	\N	\N	self	self	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
fc1c64c7-7897-414f-ade8-f5d4ea1738ae	1	2026-03-30	2026-03-30 03:47:06.516	\N	Present	Receptionist	\N	SHF111	self	\N	0	0	0	0	\N	91	on_time	f	t	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
1e12d143-bc3d-4eec-a786-9387046c9cc9	1	2026-04-19	2026-04-19 09:51:01.626	\N	Present	Receptionist	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
3c2ca877-84bb-43fe-b621-34da3ee762b3	6	2026-04-20	2026-04-20 06:30:54.625	\N	Present	Admin	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
b94eefc0-0055-442c-8e38-80456050520f	1	2026-06-21	2026-06-21 03:07:10.591	\N	Present	Receptionist	\N	\N	self	\N	0	0	0	0	\N	\N	unscheduled	t	f	{"timezone": "Asia/Karachi", "grace_minutes": 15, "half_day_minutes": 240, "overtime_minutes": 30, "early_leave_minutes": 30}
\.


--
-- Data for Name: staff_leave_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_leave_approvals (approval_id, leave_request_id, level_no, approver_staff_id, approval_status, note, acted_at) FROM stdin;
\.


--
-- Data for Name: staff_leave_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_leave_balances (balance_id, staff_id, leave_type_id, period_year, opening_balance, accrued, consumed, adjusted, updated_at, account_type, person_id, doctor_id) FROM stdin;
\.


--
-- Data for Name: staff_leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_leave_requests (leave_request_id, staff_id, leave_type_id, from_date, to_date, is_half_day, requested_hours, reason, attachment_url, request_status, requested_at, final_approver, final_decision_at, decision_note, account_type, person_id, doctor_id) FROM stdin;
1	\N	3	2026-03-24	2026-03-24	f	\N	\N	\N	pending	2026-03-24 16:17:19.302296	\N	\N	\N	doctor	1	1
\.


--
-- Data for Name: staff_leave_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_leave_types (leave_type_id, leave_code, leave_name, default_annual_quota, is_paid, requires_attachment, active) FROM stdin;
1	CASUAL	Casual Leave	12.00	t	f	t
2	SICK	Sick Leave	10.00	t	t	t
3	ANNUAL	Annual Leave	20.00	t	f	t
4	MATERNITY	Maternity Leave	90.00	t	t	t
5	EMERGENCY	Emergency Leave	6.00	t	f	t
6	UNPAID	Unpaid Leave	\N	f	f	t
\.


--
-- Data for Name: staff_permission_audit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_permission_audit (event_id, policy_id, actor_staff_id, event_type, before_json, after_json, created_at) FROM stdin;
1	1	6	created	\N	{"action": "view", "module": "staff_directory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "1", "expires_at": null, "granted_at": "2026-03-24T00:54:18.341Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:18.558729
2	2	6	created	\N	{"action": "create", "module": "staff_directory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "2", "expires_at": null, "granted_at": "2026-03-24T00:54:18.950Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:19.142171
3	3	6	created	\N	{"action": "edit", "module": "staff_directory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "3", "expires_at": null, "granted_at": "2026-03-24T00:54:19.535Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:19.728944
4	4	6	created	\N	{"action": "delete", "module": "staff_directory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "4", "expires_at": null, "granted_at": "2026-03-24T00:54:20.116Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:20.309727
5	5	6	created	\N	{"action": "approve", "module": "staff_directory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "5", "expires_at": null, "granted_at": "2026-03-24T00:54:20.691Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:20.883986
6	6	6	created	\N	{"action": "export", "module": "staff_directory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "6", "expires_at": null, "granted_at": "2026-03-24T00:54:21.266Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:21.45825
7	7	6	created	\N	{"action": "view", "module": "access_roles", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "7", "expires_at": null, "granted_at": "2026-03-24T00:54:21.842Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:22.035719
8	8	6	created	\N	{"action": "create", "module": "access_roles", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "8", "expires_at": null, "granted_at": "2026-03-24T00:54:22.421Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:22.614791
9	9	6	created	\N	{"action": "edit", "module": "access_roles", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "9", "expires_at": null, "granted_at": "2026-03-24T00:54:23.005Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:23.199284
10	10	6	created	\N	{"action": "delete", "module": "access_roles", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "10", "expires_at": null, "granted_at": "2026-03-24T00:54:23.581Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:23.773792
11	11	6	created	\N	{"action": "approve", "module": "access_roles", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "11", "expires_at": null, "granted_at": "2026-03-24T00:54:24.163Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:24.364281
12	12	6	created	\N	{"action": "export", "module": "access_roles", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "12", "expires_at": null, "granted_at": "2026-03-24T00:54:24.751Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:24.943865
13	13	6	created	\N	{"action": "view", "module": "security_sessions", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "13", "expires_at": null, "granted_at": "2026-03-24T00:54:25.327Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:25.519542
14	14	6	created	\N	{"action": "create", "module": "security_sessions", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "14", "expires_at": null, "granted_at": "2026-03-24T00:54:25.902Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:26.096256
15	15	6	created	\N	{"action": "edit", "module": "security_sessions", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "15", "expires_at": null, "granted_at": "2026-03-24T00:54:26.480Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:26.672858
16	16	6	created	\N	{"action": "delete", "module": "security_sessions", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "16", "expires_at": null, "granted_at": "2026-03-24T00:54:27.056Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:27.248842
17	17	6	created	\N	{"action": "approve", "module": "security_sessions", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "17", "expires_at": null, "granted_at": "2026-03-24T00:54:27.641Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:27.839549
18	18	6	created	\N	{"action": "export", "module": "security_sessions", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "18", "expires_at": null, "granted_at": "2026-03-24T00:54:28.230Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:28.423843
19	19	6	created	\N	{"action": "view", "module": "attendance", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "19", "expires_at": null, "granted_at": "2026-03-24T00:54:28.806Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:28.998808
20	20	6	created	\N	{"action": "create", "module": "attendance", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "20", "expires_at": null, "granted_at": "2026-03-24T00:54:29.386Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:29.579354
21	21	6	created	\N	{"action": "edit", "module": "attendance", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "21", "expires_at": null, "granted_at": "2026-03-24T00:54:29.962Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:30.154592
22	22	6	created	\N	{"action": "delete", "module": "attendance", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "22", "expires_at": null, "granted_at": "2026-03-24T00:54:30.544Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:30.736438
23	23	6	created	\N	{"action": "approve", "module": "attendance", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "23", "expires_at": null, "granted_at": "2026-03-24T00:54:31.120Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:31.312612
24	24	6	created	\N	{"action": "export", "module": "attendance", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "24", "expires_at": null, "granted_at": "2026-03-24T00:54:31.702Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:31.894627
25	25	6	created	\N	{"action": "view", "module": "roster", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "25", "expires_at": null, "granted_at": "2026-03-24T00:54:32.475Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:32.680393
26	26	6	created	\N	{"action": "create", "module": "roster", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "26", "expires_at": null, "granted_at": "2026-03-24T00:54:33.083Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:33.295151
27	27	6	created	\N	{"action": "edit", "module": "roster", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "27", "expires_at": null, "granted_at": "2026-03-24T00:54:33.703Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:33.908712
28	28	6	created	\N	{"action": "delete", "module": "roster", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "28", "expires_at": null, "granted_at": "2026-03-24T00:54:34.298Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:34.491162
29	29	6	created	\N	{"action": "approve", "module": "roster", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "29", "expires_at": null, "granted_at": "2026-03-24T00:54:34.875Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:35.068209
30	30	6	created	\N	{"action": "export", "module": "roster", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "30", "expires_at": null, "granted_at": "2026-03-24T00:54:35.451Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:35.642986
31	31	6	created	\N	{"action": "view", "module": "leave", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "31", "expires_at": null, "granted_at": "2026-03-24T00:54:36.025Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:36.21803
32	32	6	created	\N	{"action": "create", "module": "leave", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "32", "expires_at": null, "granted_at": "2026-03-24T00:54:36.601Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:36.793697
33	33	6	created	\N	{"action": "edit", "module": "leave", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "33", "expires_at": null, "granted_at": "2026-03-24T00:54:37.176Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:37.369267
34	34	6	created	\N	{"action": "delete", "module": "leave", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "34", "expires_at": null, "granted_at": "2026-03-24T00:54:37.757Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:38.076448
35	35	6	created	\N	{"action": "approve", "module": "leave", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "35", "expires_at": null, "granted_at": "2026-03-24T00:54:38.464Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:38.661458
36	36	6	created	\N	{"action": "export", "module": "leave", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "36", "expires_at": null, "granted_at": "2026-03-24T00:54:39.051Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:39.244502
37	37	6	created	\N	{"action": "view", "module": "approvals", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "37", "expires_at": null, "granted_at": "2026-03-24T00:54:39.629Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:39.82492
38	38	6	created	\N	{"action": "create", "module": "approvals", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "38", "expires_at": null, "granted_at": "2026-03-24T00:54:40.215Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:40.410563
39	39	6	created	\N	{"action": "edit", "module": "approvals", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "39", "expires_at": null, "granted_at": "2026-03-24T00:54:40.975Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:41.175795
40	40	6	created	\N	{"action": "delete", "module": "approvals", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "40", "expires_at": null, "granted_at": "2026-03-24T00:54:41.561Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:41.856749
41	41	6	created	\N	{"action": "approve", "module": "approvals", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "41", "expires_at": null, "granted_at": "2026-03-24T00:54:42.242Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:42.43517
42	42	6	created	\N	{"action": "export", "module": "approvals", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "42", "expires_at": null, "granted_at": "2026-03-24T00:54:42.820Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:43.012612
43	43	6	created	\N	{"action": "view", "module": "credentialing", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "43", "expires_at": null, "granted_at": "2026-03-24T00:54:43.397Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:43.589462
44	44	6	created	\N	{"action": "create", "module": "credentialing", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "44", "expires_at": null, "granted_at": "2026-03-24T00:54:43.971Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:44.16368
45	45	6	created	\N	{"action": "edit", "module": "credentialing", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "45", "expires_at": null, "granted_at": "2026-03-24T00:54:44.546Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:44.741631
46	46	6	created	\N	{"action": "delete", "module": "credentialing", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "46", "expires_at": null, "granted_at": "2026-03-24T00:54:45.127Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:45.319462
47	47	6	created	\N	{"action": "approve", "module": "credentialing", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "47", "expires_at": null, "granted_at": "2026-03-24T00:54:45.703Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:45.895825
48	48	6	created	\N	{"action": "export", "module": "credentialing", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "48", "expires_at": null, "granted_at": "2026-03-24T00:54:46.278Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:46.471159
49	49	6	created	\N	{"action": "view", "module": "documents", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "49", "expires_at": null, "granted_at": "2026-03-24T00:54:46.854Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:47.04664
50	50	6	created	\N	{"action": "create", "module": "documents", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "50", "expires_at": null, "granted_at": "2026-03-24T00:54:47.429Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:47.620929
51	51	6	created	\N	{"action": "edit", "module": "documents", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "51", "expires_at": null, "granted_at": "2026-03-24T00:54:48.003Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:48.202253
52	52	6	created	\N	{"action": "delete", "module": "documents", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "52", "expires_at": null, "granted_at": "2026-03-24T00:54:48.584Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:48.776653
53	53	6	created	\N	{"action": "approve", "module": "documents", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "53", "expires_at": null, "granted_at": "2026-03-24T00:54:49.159Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:49.351466
54	54	6	created	\N	{"action": "export", "module": "documents", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "54", "expires_at": null, "granted_at": "2026-03-24T00:54:49.733Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:49.929103
55	55	6	created	\N	{"action": "view", "module": "analytics", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "55", "expires_at": null, "granted_at": "2026-03-24T00:54:50.311Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:50.504258
56	56	6	created	\N	{"action": "create", "module": "analytics", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "56", "expires_at": null, "granted_at": "2026-03-24T00:54:50.897Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:51.089782
57	57	6	created	\N	{"action": "edit", "module": "analytics", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "57", "expires_at": null, "granted_at": "2026-03-24T00:54:51.474Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:51.705686
58	58	6	created	\N	{"action": "delete", "module": "analytics", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "58", "expires_at": null, "granted_at": "2026-03-24T00:54:52.091Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:52.284024
59	59	6	created	\N	{"action": "approve", "module": "analytics", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "59", "expires_at": null, "granted_at": "2026-03-24T00:54:52.672Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:52.873427
60	60	6	created	\N	{"action": "export", "module": "analytics", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "60", "expires_at": null, "granted_at": "2026-03-24T00:54:53.263Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:53.458475
61	61	6	created	\N	{"action": "view", "module": "inventory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "61", "expires_at": null, "granted_at": "2026-03-24T00:54:53.844Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:54.040234
62	62	6	created	\N	{"action": "create", "module": "inventory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "62", "expires_at": null, "granted_at": "2026-03-24T00:54:54.436Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:54.631481
63	63	6	created	\N	{"action": "edit", "module": "inventory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "63", "expires_at": null, "granted_at": "2026-03-24T00:54:55.018Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:55.211962
64	64	6	created	\N	{"action": "delete", "module": "inventory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "64", "expires_at": null, "granted_at": "2026-03-24T00:54:55.606Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:55.802732
65	65	6	created	\N	{"action": "approve", "module": "inventory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "65", "expires_at": null, "granted_at": "2026-03-24T00:54:56.195Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:56.388551
66	66	6	created	\N	{"action": "export", "module": "inventory", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "66", "expires_at": null, "granted_at": "2026-03-24T00:54:56.777Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:56.971935
67	67	6	created	\N	{"action": "view", "module": "financials", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "67", "expires_at": null, "granted_at": "2026-03-24T00:54:57.361Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:57.558832
68	68	6	created	\N	{"action": "create", "module": "financials", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "68", "expires_at": null, "granted_at": "2026-03-24T00:54:57.943Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:58.136144
69	69	6	created	\N	{"action": "edit", "module": "financials", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "69", "expires_at": null, "granted_at": "2026-03-24T00:54:58.522Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:58.721524
70	70	6	created	\N	{"action": "delete", "module": "financials", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "70", "expires_at": null, "granted_at": "2026-03-24T00:54:59.107Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:59.303119
71	71	6	created	\N	{"action": "approve", "module": "financials", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "71", "expires_at": null, "granted_at": "2026-03-24T00:54:59.690Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:54:59.887562
72	72	6	created	\N	{"action": "export", "module": "financials", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "72", "expires_at": null, "granted_at": "2026-03-24T00:55:00.289Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:00.486877
73	73	6	created	\N	{"action": "view", "module": "settings", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "73", "expires_at": null, "granted_at": "2026-03-24T00:55:00.871Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:01.06515
74	74	6	created	\N	{"action": "create", "module": "settings", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "74", "expires_at": null, "granted_at": "2026-03-24T00:55:01.452Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:01.648081
75	75	6	created	\N	{"action": "edit", "module": "settings", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "75", "expires_at": null, "granted_at": "2026-03-24T00:55:02.045Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:02.246347
76	76	6	created	\N	{"action": "delete", "module": "settings", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "76", "expires_at": null, "granted_at": "2026-03-24T00:55:02.639Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:02.834824
77	77	6	created	\N	{"action": "approve", "module": "settings", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "77", "expires_at": null, "granted_at": "2026-03-24T00:55:03.228Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:03.425962
78	78	6	created	\N	{"action": "export", "module": "settings", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "78", "expires_at": null, "granted_at": "2026-03-24T00:55:03.817Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:04.020913
79	79	6	created	\N	{"action": "view", "module": "audit", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "79", "expires_at": null, "granted_at": "2026-03-24T00:55:04.412Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:04.607622
80	80	6	created	\N	{"action": "create", "module": "audit", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "80", "expires_at": null, "granted_at": "2026-03-24T00:55:05.238Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:05.431627
81	81	6	created	\N	{"action": "edit", "module": "audit", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "81", "expires_at": null, "granted_at": "2026-03-24T00:55:05.815Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:06.008317
82	82	6	created	\N	{"action": "delete", "module": "audit", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "82", "expires_at": null, "granted_at": "2026-03-24T00:55:06.584Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:06.782567
83	83	6	created	\N	{"action": "approve", "module": "audit", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "83", "expires_at": null, "granted_at": "2026-03-24T00:55:07.167Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:07.360441
84	84	6	created	\N	{"action": "export", "module": "audit", "allowed": false, "role_id": null, "staff_id": 1, "policy_id": "84", "expires_at": null, "granted_at": "2026-03-24T00:55:07.745Z", "granted_by": 6, "scope_type": "global", "scope_value": null}	2026-03-24 05:55:07.938402
\.


--
-- Data for Name: staff_permission_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_permission_policies (policy_id, staff_id, role_id, module, action, allowed, scope_type, scope_value, granted_by, granted_at, expires_at) FROM stdin;
1	1	\N	staff_directory	view	f	global	\N	6	2026-03-24 05:54:18.341947	\N
2	1	\N	staff_directory	create	f	global	\N	6	2026-03-24 05:54:18.950156	\N
3	1	\N	staff_directory	edit	f	global	\N	6	2026-03-24 05:54:19.535471	\N
4	1	\N	staff_directory	delete	f	global	\N	6	2026-03-24 05:54:20.11649	\N
5	1	\N	staff_directory	approve	f	global	\N	6	2026-03-24 05:54:20.691989	\N
6	1	\N	staff_directory	export	f	global	\N	6	2026-03-24 05:54:21.266513	\N
7	1	\N	access_roles	view	f	global	\N	6	2026-03-24 05:54:21.842519	\N
8	1	\N	access_roles	create	f	global	\N	6	2026-03-24 05:54:22.421025	\N
9	1	\N	access_roles	edit	f	global	\N	6	2026-03-24 05:54:23.005803	\N
10	1	\N	access_roles	delete	f	global	\N	6	2026-03-24 05:54:23.581809	\N
11	1	\N	access_roles	approve	f	global	\N	6	2026-03-24 05:54:24.163056	\N
12	1	\N	access_roles	export	f	global	\N	6	2026-03-24 05:54:24.751069	\N
13	1	\N	security_sessions	view	f	global	\N	6	2026-03-24 05:54:25.327536	\N
14	1	\N	security_sessions	create	f	global	\N	6	2026-03-24 05:54:25.902996	\N
15	1	\N	security_sessions	edit	f	global	\N	6	2026-03-24 05:54:26.480562	\N
16	1	\N	security_sessions	delete	f	global	\N	6	2026-03-24 05:54:27.05685	\N
17	1	\N	security_sessions	approve	f	global	\N	6	2026-03-24 05:54:27.641828	\N
18	1	\N	security_sessions	export	f	global	\N	6	2026-03-24 05:54:28.230091	\N
19	1	\N	attendance	view	f	global	\N	6	2026-03-24 05:54:28.806562	\N
20	1	\N	attendance	create	f	global	\N	6	2026-03-24 05:54:29.386356	\N
21	1	\N	attendance	edit	f	global	\N	6	2026-03-24 05:54:29.962626	\N
22	1	\N	attendance	delete	f	global	\N	6	2026-03-24 05:54:30.544069	\N
23	1	\N	attendance	approve	f	global	\N	6	2026-03-24 05:54:31.120802	\N
24	1	\N	attendance	export	f	global	\N	6	2026-03-24 05:54:31.702608	\N
25	1	\N	roster	view	f	global	\N	6	2026-03-24 05:54:32.475513	\N
26	1	\N	roster	create	f	global	\N	6	2026-03-24 05:54:33.08371	\N
27	1	\N	roster	edit	f	global	\N	6	2026-03-24 05:54:33.703733	\N
28	1	\N	roster	delete	f	global	\N	6	2026-03-24 05:54:34.298661	\N
29	1	\N	roster	approve	f	global	\N	6	2026-03-24 05:54:34.875722	\N
30	1	\N	roster	export	f	global	\N	6	2026-03-24 05:54:35.451222	\N
31	1	\N	leave	view	f	global	\N	6	2026-03-24 05:54:36.025957	\N
32	1	\N	leave	create	f	global	\N	6	2026-03-24 05:54:36.601535	\N
33	1	\N	leave	edit	f	global	\N	6	2026-03-24 05:54:37.17673	\N
34	1	\N	leave	delete	f	global	\N	6	2026-03-24 05:54:37.757243	\N
35	1	\N	leave	approve	f	global	\N	6	2026-03-24 05:54:38.464739	\N
36	1	\N	leave	export	f	global	\N	6	2026-03-24 05:54:39.051249	\N
37	1	\N	approvals	view	f	global	\N	6	2026-03-24 05:54:39.62972	\N
38	1	\N	approvals	create	f	global	\N	6	2026-03-24 05:54:40.215883	\N
39	1	\N	approvals	edit	f	global	\N	6	2026-03-24 05:54:40.975035	\N
40	1	\N	approvals	delete	f	global	\N	6	2026-03-24 05:54:41.561772	\N
41	1	\N	approvals	approve	f	global	\N	6	2026-03-24 05:54:42.242564	\N
42	1	\N	approvals	export	f	global	\N	6	2026-03-24 05:54:42.82014	\N
43	1	\N	credentialing	view	f	global	\N	6	2026-03-24 05:54:43.397429	\N
44	1	\N	credentialing	create	f	global	\N	6	2026-03-24 05:54:43.971611	\N
45	1	\N	credentialing	edit	f	global	\N	6	2026-03-24 05:54:44.54669	\N
46	1	\N	credentialing	delete	f	global	\N	6	2026-03-24 05:54:45.12743	\N
47	1	\N	credentialing	approve	f	global	\N	6	2026-03-24 05:54:45.703908	\N
48	1	\N	credentialing	export	f	global	\N	6	2026-03-24 05:54:46.278879	\N
49	1	\N	documents	view	f	global	\N	6	2026-03-24 05:54:46.854636	\N
50	1	\N	documents	create	f	global	\N	6	2026-03-24 05:54:47.429123	\N
51	1	\N	documents	edit	f	global	\N	6	2026-03-24 05:54:48.003901	\N
52	1	\N	documents	delete	f	global	\N	6	2026-03-24 05:54:48.584954	\N
53	1	\N	documents	approve	f	global	\N	6	2026-03-24 05:54:49.159443	\N
54	1	\N	documents	export	f	global	\N	6	2026-03-24 05:54:49.733678	\N
55	1	\N	analytics	view	f	global	\N	6	2026-03-24 05:54:50.311944	\N
56	1	\N	analytics	create	f	global	\N	6	2026-03-24 05:54:50.897463	\N
57	1	\N	analytics	edit	f	global	\N	6	2026-03-24 05:54:51.474669	\N
58	1	\N	analytics	delete	f	global	\N	6	2026-03-24 05:54:52.091198	\N
59	1	\N	analytics	approve	f	global	\N	6	2026-03-24 05:54:52.672675	\N
60	1	\N	analytics	export	f	global	\N	6	2026-03-24 05:54:53.263322	\N
61	1	\N	inventory	view	f	global	\N	6	2026-03-24 05:54:53.844495	\N
62	1	\N	inventory	create	f	global	\N	6	2026-03-24 05:54:54.436482	\N
63	1	\N	inventory	edit	f	global	\N	6	2026-03-24 05:54:55.018232	\N
64	1	\N	inventory	delete	f	global	\N	6	2026-03-24 05:54:55.606247	\N
65	1	\N	inventory	approve	f	global	\N	6	2026-03-24 05:54:56.195216	\N
66	1	\N	inventory	export	f	global	\N	6	2026-03-24 05:54:56.777232	\N
67	1	\N	financials	view	f	global	\N	6	2026-03-24 05:54:57.361993	\N
68	1	\N	financials	create	f	global	\N	6	2026-03-24 05:54:57.943053	\N
69	1	\N	financials	edit	f	global	\N	6	2026-03-24 05:54:58.522513	\N
70	1	\N	financials	delete	f	global	\N	6	2026-03-24 05:54:59.107036	\N
71	1	\N	financials	approve	f	global	\N	6	2026-03-24 05:54:59.690395	\N
72	1	\N	financials	export	f	global	\N	6	2026-03-24 05:55:00.289119	\N
73	1	\N	settings	view	f	global	\N	6	2026-03-24 05:55:00.871765	\N
74	1	\N	settings	create	f	global	\N	6	2026-03-24 05:55:01.452617	\N
75	1	\N	settings	edit	f	global	\N	6	2026-03-24 05:55:02.045883	\N
76	1	\N	settings	delete	f	global	\N	6	2026-03-24 05:55:02.639622	\N
77	1	\N	settings	approve	f	global	\N	6	2026-03-24 05:55:03.228043	\N
78	1	\N	settings	export	f	global	\N	6	2026-03-24 05:55:03.817824	\N
79	1	\N	audit	view	f	global	\N	6	2026-03-24 05:55:04.412852	\N
80	1	\N	audit	create	f	global	\N	6	2026-03-24 05:55:05.238394	\N
81	1	\N	audit	edit	f	global	\N	6	2026-03-24 05:55:05.815429	\N
82	1	\N	audit	delete	f	global	\N	6	2026-03-24 05:55:06.584466	\N
83	1	\N	audit	approve	f	global	\N	6	2026-03-24 05:55:07.167462	\N
84	1	\N	audit	export	f	global	\N	6	2026-03-24 05:55:07.74536	\N
\.


--
-- Data for Name: staff_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_permissions (permission_id, staff_id, module, can_read, can_write, can_delete) FROM stdin;
\.


--
-- Data for Name: staff_role_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_role_assignments (assignment_id, staff_id, role_id, is_primary, effective_from, effective_to, assigned_by, assignment_note) FROM stdin;
\.


--
-- Data for Name: staff_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_roles (role_id, role_code, role_name, is_system, created_at) FROM stdin;
1	SUPER_ADMIN	Super Admin	t	2026-03-24 05:21:48.998992
2	ADMIN	Admin	t	2026-03-24 05:21:48.998992
3	DOCTOR	Doctor	t	2026-03-24 05:21:48.998992
4	NURSE	Nurse	t	2026-03-24 05:21:48.998992
5	LAB_TECHNICIAN	Lab Technician	t	2026-03-24 05:21:48.998992
6	PHARMACIST	Pharmacist	t	2026-03-24 05:21:48.998992
7	RECEPTIONIST	Receptionist	t	2026-03-24 05:21:48.998992
8	CASHIER	Cashier	t	2026-03-24 05:21:48.998992
9	FRONT_DESK	Front Desk	t	2026-03-24 05:21:48.998992
10	BILLING	Billing	t	2026-03-24 05:21:48.998992
11	TECHNICIAN	Technician	t	2026-03-24 05:21:48.998992
12	HOUSEKEEPING	Housekeeping	t	2026-03-24 05:21:48.998992
\.


--
-- Data for Name: staff_roster_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_roster_assignments (roster_id, staff_id, shift_template_id, roster_date, department, ward, unit, on_call, standby, assignment_status, assigned_by, created_at, account_type, person_id, doctor_id) FROM stdin;
14	\N	2	2026-04-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:22.766791	doctor	1	1
15	\N	2	2026-04-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:22.95015	doctor	1	1
3	\N	2	2026-03-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:20.466955	doctor	1	1
4	\N	2	2026-03-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:20.718283	doctor	1	1
5	\N	2	2026-03-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:20.920335	doctor	1	1
16	\N	2	2026-04-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:23.126046	doctor	1	1
6	\N	2	2026-03-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:21.127792	doctor	1	1
7	\N	2	2026-03-31	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:21.330274	doctor	1	1
8	\N	2	2026-04-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:21.542291	doctor	1	1
9	\N	2	2026-04-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:21.739282	doctor	1	1
17	\N	2	2026-04-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:23.481143	doctor	1	1
10	\N	2	2026-04-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:21.945992	doctor	1	1
11	\N	2	2026-04-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:22.15326	doctor	1	1
12	\N	2	2026-04-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:22.362625	doctor	1	1
13	\N	2	2026-04-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:22.558812	doctor	1	1
25	\N	2	2026-04-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:25.120759	doctor	1	1
18	\N	2	2026-04-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:23.663656	doctor	1	1
19	\N	2	2026-04-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:23.891687	doctor	1	1
20	\N	2	2026-04-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:24.096231	doctor	1	1
21	\N	2	2026-04-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:24.301356	doctor	1	1
26	\N	2	2026-04-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:25.325519	doctor	1	1
22	\N	2	2026-04-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:24.505092	doctor	1	1
23	\N	2	2026-04-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:24.680592	doctor	1	1
24	\N	2	2026-04-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:24.915688	doctor	1	1
1	\N	1	2026-03-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:03:38.848493	doctor	1	1
27	\N	2	2026-04-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:25.53145	doctor	1	1
28	\N	2	2026-04-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:25.734757	doctor	1	1
29	\N	2	2026-04-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:25.939692	doctor	1	1
30	\N	2	2026-05-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:26.143766	doctor	1	1
31	\N	2	2026-05-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:26.348932	doctor	1	1
32	\N	2	2026-05-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:26.554392	doctor	1	1
33	\N	2	2026-05-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:26.758734	doctor	1	1
34	\N	2	2026-05-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:26.963892	doctor	1	1
35	\N	2	2026-05-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:27.167957	doctor	1	1
36	\N	2	2026-05-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:27.343699	doctor	1	1
37	\N	2	2026-05-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:27.577925	doctor	1	1
38	\N	2	2026-05-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:27.78252	doctor	1	1
39	\N	2	2026-05-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:27.986933	doctor	1	1
40	\N	2	2026-05-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:28.191703	doctor	1	1
41	\N	2	2026-05-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:28.396584	doctor	1	1
42	\N	2	2026-05-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:28.601002	doctor	1	1
88	1	1	2026-03-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:09.78027	staff	1	\N
89	1	1	2026-03-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:10.176346	staff	1	\N
90	1	1	2026-03-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:10.380185	staff	1	\N
91	1	1	2026-03-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:10.570448	staff	1	\N
92	1	1	2026-03-31	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:10.762885	staff	1	\N
93	1	1	2026-04-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:11.096159	staff	1	\N
94	1	1	2026-04-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:11.301239	staff	1	\N
95	1	1	2026-04-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:11.504979	staff	1	\N
96	1	1	2026-04-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:11.709254	staff	1	\N
97	1	1	2026-04-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:11.914152	staff	1	\N
98	1	1	2026-04-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:12.119463	staff	1	\N
99	1	1	2026-04-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:12.323888	staff	1	\N
43	\N	2	2026-05-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:28.806179	doctor	1	1
44	\N	2	2026-05-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:29.010858	doctor	1	1
45	\N	2	2026-05-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-24 15:35:29.215431	doctor	1	1
1393	3	4	2026-04-02	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1394	3	4	2026-04-03	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1395	3	4	2026-04-04	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1396	3	4	2026-04-06	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1397	3	4	2026-04-07	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1398	3	4	2026-04-08	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1399	3	4	2026-04-09	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1400	3	4	2026-04-10	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1401	3	4	2026-04-11	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1402	3	4	2026-04-13	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1403	3	4	2026-04-14	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1404	3	4	2026-04-15	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1405	3	4	2026-04-16	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1406	3	4	2026-04-17	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1407	3	4	2026-04-18	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1408	3	4	2026-04-20	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1409	3	4	2026-04-21	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1410	3	4	2026-04-22	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
100	1	1	2026-04-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:12.533174	staff	1	\N
101	1	1	2026-04-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:12.736184	staff	1	\N
102	1	1	2026-04-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:12.929688	staff	1	\N
103	1	1	2026-04-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:13.251739	staff	1	\N
104	1	1	2026-04-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:13.450716	staff	1	\N
105	1	1	2026-04-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:13.655099	staff	1	\N
106	1	1	2026-04-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:13.859854	staff	1	\N
107	1	1	2026-04-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:14.064806	staff	1	\N
108	1	1	2026-04-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:14.269462	staff	1	\N
109	1	1	2026-04-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:14.475031	staff	1	\N
110	1	1	2026-04-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:14.679982	staff	1	\N
111	1	1	2026-04-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:14.883695	staff	1	\N
112	1	1	2026-04-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:15.088951	staff	1	\N
113	1	1	2026-04-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:15.2938	staff	1	\N
114	1	1	2026-04-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:15.498256	staff	1	\N
115	1	1	2026-05-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:15.703241	staff	1	\N
116	1	1	2026-05-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:15.908308	staff	1	\N
117	1	1	2026-05-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:16.112609	staff	1	\N
118	1	1	2026-05-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:16.318002	staff	1	\N
119	1	1	2026-05-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:16.52226	staff	1	\N
120	1	1	2026-05-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:16.727552	staff	1	\N
121	1	1	2026-05-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:16.931762	staff	1	\N
122	1	1	2026-05-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:17.136565	staff	1	\N
123	1	1	2026-05-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:17.341785	staff	1	\N
124	1	1	2026-05-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:17.546021	staff	1	\N
125	1	1	2026-05-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:17.751128	staff	1	\N
126	1	1	2026-05-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:17.955809	staff	1	\N
127	1	1	2026-05-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:18.161059	staff	1	\N
128	1	1	2026-05-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:18.365774	staff	1	\N
129	1	1	2026-05-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:18.557078	staff	1	\N
130	1	1	2026-05-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:18.74678	staff	1	\N
131	1	1	2026-05-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:19.082683	staff	1	\N
132	1	1	2026-05-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:19.272462	staff	1	\N
133	1	1	2026-05-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:19.461778	staff	1	\N
134	1	1	2026-05-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:19.651016	staff	1	\N
135	1	1	2026-05-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:19.840345	staff	1	\N
136	1	1	2026-06-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:20.209103	staff	1	\N
137	1	1	2026-06-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:20.414067	staff	1	\N
138	1	1	2026-06-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:20.618067	staff	1	\N
139	1	1	2026-06-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:20.822812	staff	1	\N
140	1	1	2026-06-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:21.027831	staff	1	\N
141	1	1	2026-06-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:21.216655	staff	1	\N
142	1	1	2026-06-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:21.437319	staff	1	\N
143	1	1	2026-06-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:21.64231	staff	1	\N
144	1	1	2026-06-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:21.84787	staff	1	\N
145	1	1	2026-06-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:22.051974	staff	1	\N
146	1	1	2026-06-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:22.256727	staff	1	\N
147	1	1	2026-06-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:22.461146	staff	1	\N
148	1	1	2026-06-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:22.666331	staff	1	\N
149	1	1	2026-06-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:22.871093	staff	1	\N
150	1	1	2026-06-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:23.060047	staff	1	\N
151	1	1	2026-06-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:23.249902	staff	1	\N
152	1	1	2026-06-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:23.588022	staff	1	\N
153	1	1	2026-06-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:23.792865	staff	1	\N
154	1	1	2026-06-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:23.998105	staff	1	\N
155	1	1	2026-06-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:24.202485	staff	1	\N
156	1	1	2026-06-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:24.407847	staff	1	\N
157	1	1	2026-06-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:24.611828	staff	1	\N
158	1	1	2026-07-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:24.81661	staff	1	\N
159	1	1	2026-07-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:25.021625	staff	1	\N
160	1	1	2026-07-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:25.228383	staff	1	\N
161	1	1	2026-07-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:25.432289	staff	1	\N
162	1	1	2026-07-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:25.63576	staff	1	\N
163	1	1	2026-07-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:25.841467	staff	1	\N
164	1	1	2026-07-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:26.046402	staff	1	\N
165	1	1	2026-07-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:26.251597	staff	1	\N
166	1	1	2026-07-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:26.456182	staff	1	\N
167	1	1	2026-07-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:26.645427	staff	1	\N
168	1	1	2026-07-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:26.879473	staff	1	\N
169	1	1	2026-07-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:27.171925	staff	1	\N
170	1	1	2026-07-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:27.376865	staff	1	\N
171	1	1	2026-07-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:27.582441	staff	1	\N
172	1	1	2026-07-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:27.786913	staff	1	\N
173	1	1	2026-07-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:27.991688	staff	1	\N
174	1	1	2026-07-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:28.196863	staff	1	\N
175	1	1	2026-07-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:28.401398	staff	1	\N
176	1	1	2026-07-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:28.605608	staff	1	\N
177	1	1	2026-07-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:28.811093	staff	1	\N
178	1	1	2026-07-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:29.015303	staff	1	\N
179	1	1	2026-07-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:29.204439	staff	1	\N
180	1	1	2026-07-31	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:29.533464	staff	1	\N
181	1	1	2026-08-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:29.732286	staff	1	\N
182	1	1	2026-08-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:29.921162	staff	1	\N
183	1	1	2026-08-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:30.117933	staff	1	\N
184	1	1	2026-08-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:30.448987	staff	1	\N
185	1	1	2026-08-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:30.653449	staff	1	\N
186	1	1	2026-08-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:30.858691	staff	1	\N
187	1	1	2026-08-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:31.062929	staff	1	\N
188	1	1	2026-08-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:31.267654	staff	1	\N
189	1	1	2026-08-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:31.472544	staff	1	\N
190	1	1	2026-08-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:31.677541	staff	1	\N
191	1	1	2026-08-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:31.882425	staff	1	\N
192	1	1	2026-08-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:32.088263	staff	1	\N
193	1	1	2026-08-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:32.292454	staff	1	\N
194	1	1	2026-08-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:32.497558	staff	1	\N
195	1	1	2026-08-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:32.701877	staff	1	\N
196	1	1	2026-08-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:32.906466	staff	1	\N
197	1	1	2026-08-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:33.111294	staff	1	\N
198	1	1	2026-08-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:33.317052	staff	1	\N
199	1	1	2026-08-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:33.521	staff	1	\N
200	1	1	2026-08-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:33.726029	staff	1	\N
201	1	1	2026-08-31	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:34.033837	staff	1	\N
202	1	1	2026-09-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:34.237439	staff	1	\N
203	1	1	2026-09-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:34.442181	staff	1	\N
204	1	1	2026-09-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:34.64748	staff	1	\N
205	1	1	2026-09-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:34.851759	staff	1	\N
206	1	1	2026-09-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:35.040976	staff	1	\N
207	1	1	2026-09-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:35.23671	staff	1	\N
208	1	1	2026-09-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:35.568756	staff	1	\N
209	1	1	2026-09-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:35.774729	staff	1	\N
210	1	1	2026-09-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:35.978466	staff	1	\N
211	1	1	2026-09-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:36.168156	staff	1	\N
212	1	1	2026-09-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:36.388664	staff	1	\N
213	1	1	2026-09-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:36.592049	staff	1	\N
214	1	1	2026-09-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:36.780453	staff	1	\N
215	1	1	2026-09-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:37.002565	staff	1	\N
216	1	1	2026-09-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:37.20729	staff	1	\N
217	1	1	2026-09-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:37.396669	staff	1	\N
218	1	1	2026-09-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:37.720305	staff	1	\N
219	1	1	2026-09-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:37.923371	staff	1	\N
220	1	1	2026-09-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:38.128204	staff	1	\N
221	1	1	2026-09-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:38.333003	staff	1	\N
222	1	1	2026-09-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:38.539296	staff	1	\N
223	1	1	2026-09-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:38.747002	staff	1	\N
224	1	1	2026-10-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:38.947613	staff	1	\N
225	1	1	2026-10-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:39.155298	staff	1	\N
226	1	1	2026-10-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:39.34348	staff	1	\N
227	1	1	2026-10-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:39.561703	staff	1	\N
228	1	1	2026-10-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:39.869555	staff	1	\N
229	1	1	2026-10-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:40.074768	staff	1	\N
230	1	1	2026-10-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:40.278988	staff	1	\N
231	1	1	2026-10-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:40.470134	staff	1	\N
232	1	1	2026-10-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:40.688765	staff	1	\N
233	1	1	2026-10-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:40.895775	staff	1	\N
234	1	1	2026-10-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:41.100622	staff	1	\N
235	1	1	2026-10-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:41.303998	staff	1	\N
236	1	1	2026-10-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:41.508241	staff	1	\N
237	1	1	2026-10-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:41.713004	staff	1	\N
238	1	1	2026-10-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:41.91785	staff	1	\N
239	1	1	2026-10-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:42.122354	staff	1	\N
240	1	1	2026-10-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:42.430633	staff	1	\N
241	1	1	2026-10-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:42.637622	staff	1	\N
242	1	1	2026-10-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:42.826799	staff	1	\N
243	1	1	2026-10-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:43.015554	staff	1	\N
244	1	1	2026-10-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:43.351853	staff	1	\N
245	1	1	2026-10-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:43.557339	staff	1	\N
246	1	1	2026-11-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:43.760676	staff	1	\N
247	1	1	2026-11-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:43.965609	staff	1	\N
248	1	1	2026-11-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:44.170925	staff	1	\N
249	1	1	2026-11-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:44.377877	staff	1	\N
250	1	1	2026-11-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:44.582113	staff	1	\N
251	1	1	2026-11-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:44.786296	staff	1	\N
252	1	1	2026-11-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:44.990376	staff	1	\N
253	1	1	2026-11-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:45.195162	staff	1	\N
254	1	1	2026-11-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:45.399795	staff	1	\N
255	1	1	2026-11-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:45.604271	staff	1	\N
256	1	1	2026-11-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:45.808839	staff	1	\N
257	1	1	2026-11-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:46.014169	staff	1	\N
258	1	1	2026-11-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:46.21873	staff	1	\N
259	1	1	2026-11-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:46.424502	staff	1	\N
260	1	1	2026-11-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:46.628734	staff	1	\N
261	1	1	2026-11-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:46.833629	staff	1	\N
262	1	1	2026-11-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:47.037894	staff	1	\N
263	1	1	2026-11-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:47.242472	staff	1	\N
264	1	1	2026-11-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:47.447716	staff	1	\N
265	1	1	2026-11-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:47.637107	staff	1	\N
266	1	1	2026-11-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:47.826115	staff	1	\N
267	1	1	2026-12-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:48.01527	staff	1	\N
268	1	1	2026-12-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:48.204666	staff	1	\N
269	1	1	2026-12-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:48.393847	staff	1	\N
270	1	1	2026-12-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:48.612631	staff	1	\N
271	1	1	2026-12-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:48.801635	staff	1	\N
272	1	1	2026-12-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:48.990643	staff	1	\N
273	1	1	2026-12-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:49.180771	staff	1	\N
274	1	1	2026-12-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:49.393	staff	1	\N
275	1	1	2026-12-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:49.596956	staff	1	\N
276	1	1	2026-12-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:49.785133	staff	1	\N
277	1	1	2026-12-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:49.97448	staff	1	\N
278	1	1	2026-12-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:50.28389	staff	1	\N
279	1	1	2026-12-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:50.473061	staff	1	\N
280	1	1	2026-12-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:50.662486	staff	1	\N
281	1	1	2026-12-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:50.850963	staff	1	\N
282	1	1	2026-12-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:51.1187	staff	1	\N
283	1	1	2026-12-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:51.307035	staff	1	\N
284	1	1	2026-12-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:51.496908	staff	1	\N
285	1	1	2026-12-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:51.795483	staff	1	\N
286	1	1	2026-12-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:51.98486	staff	1	\N
287	1	1	2026-12-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:52.173926	staff	1	\N
288	1	1	2026-12-30	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:52.363483	staff	1	\N
289	1	1	2026-12-31	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:52.568885	staff	1	\N
290	1	1	2027-01-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:52.756825	staff	1	\N
291	1	1	2027-01-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:52.945826	staff	1	\N
292	1	1	2027-01-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:53.285246	staff	1	\N
293	1	1	2027-01-06	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:53.474743	staff	1	\N
294	1	1	2027-01-07	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:53.663553	staff	1	\N
295	1	1	2027-01-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:53.852975	staff	1	\N
296	1	1	2027-01-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:54.043536	staff	1	\N
297	1	1	2027-01-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:54.233427	staff	1	\N
298	1	1	2027-01-13	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:54.423699	staff	1	\N
299	1	1	2027-01-14	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:54.612177	staff	1	\N
300	1	1	2027-01-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:54.800856	staff	1	\N
301	1	1	2027-01-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:54.989199	staff	1	\N
302	1	1	2027-01-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:55.185707	staff	1	\N
303	1	1	2027-01-20	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:55.373943	staff	1	\N
304	1	1	2027-01-21	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:55.562739	staff	1	\N
305	1	1	2027-01-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:55.750952	staff	1	\N
306	1	1	2027-01-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:55.939774	staff	1	\N
307	1	1	2027-01-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:56.129451	staff	1	\N
308	1	1	2027-01-27	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:56.318199	staff	1	\N
309	1	1	2027-01-28	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:56.506337	staff	1	\N
310	1	1	2027-01-29	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:56.694917	staff	1	\N
311	1	1	2027-02-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:56.883012	staff	1	\N
312	1	1	2027-02-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:57.072227	staff	1	\N
313	1	1	2027-02-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:57.260712	staff	1	\N
314	1	1	2027-02-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:57.537024	staff	1	\N
315	1	1	2027-02-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:57.727741	staff	1	\N
316	1	1	2027-02-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:57.919548	staff	1	\N
317	1	1	2027-02-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:58.110844	staff	1	\N
318	1	1	2027-02-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:58.299476	staff	1	\N
319	1	1	2027-02-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:58.487521	staff	1	\N
320	1	1	2027-02-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:58.676653	staff	1	\N
321	1	1	2027-02-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:59.018814	staff	1	\N
322	1	1	2027-02-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:59.223117	staff	1	\N
323	1	1	2027-02-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:59.413085	staff	1	\N
324	1	1	2027-02-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:59.735525	staff	1	\N
325	1	1	2027-02-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:03:59.924034	staff	1	\N
326	1	1	2027-02-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:00.112852	staff	1	\N
327	1	1	2027-02-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:00.300833	staff	1	\N
328	1	1	2027-02-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:00.489065	staff	1	\N
329	1	1	2027-02-25	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:00.677223	staff	1	\N
330	1	1	2027-02-26	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:00.8657	staff	1	\N
331	1	1	2027-03-01	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:01.054029	staff	1	\N
332	1	1	2027-03-02	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:01.243074	staff	1	\N
333	1	1	2027-03-03	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:01.431339	staff	1	\N
334	1	1	2027-03-04	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:01.783027	staff	1	\N
335	1	1	2027-03-05	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:01.987354	staff	1	\N
336	1	1	2027-03-08	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:02.29504	staff	1	\N
337	1	1	2027-03-09	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:02.49936	staff	1	\N
338	1	1	2027-03-10	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:02.704452	staff	1	\N
339	1	1	2027-03-11	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:02.892789	staff	1	\N
340	1	1	2027-03-12	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:03.081074	staff	1	\N
341	1	1	2027-03-15	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:03.270454	staff	1	\N
342	1	1	2027-03-16	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:03.459397	staff	1	\N
343	1	1	2027-03-17	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:03.698652	staff	1	\N
344	1	1	2027-03-18	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:03.945095	staff	1	\N
345	1	1	2027-03-19	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:04.134098	staff	1	\N
346	1	1	2027-03-22	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:04.322343	staff	1	\N
347	1	1	2027-03-23	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:04.549374	staff	1	\N
348	1	1	2027-03-24	\N	\N	\N	f	f	scheduled	6	2026-03-25 11:04:04.737585	staff	1	\N
392	\N	2	2026-05-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:28.303224	doctor	1	1
393	\N	2	2026-05-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:28.50799	doctor	1	1
394	\N	2	2026-05-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:28.815944	doctor	1	1
395	\N	2	2026-05-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:29.019734	doctor	1	1
396	\N	2	2026-05-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:29.216174	doctor	1	1
397	\N	2	2026-06-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:29.469481	doctor	1	1
398	\N	2	2026-06-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:29.6657	doctor	1	1
399	\N	2	2026-06-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:30.044333	doctor	1	1
400	\N	2	2026-06-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:30.248707	doctor	1	1
401	\N	2	2026-06-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:30.453647	doctor	1	1
402	\N	2	2026-06-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:30.651276	doctor	1	1
403	\N	2	2026-06-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:30.967101	doctor	1	1
404	\N	2	2026-06-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:31.17053	doctor	1	1
405	\N	2	2026-06-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:31.375374	doctor	1	1
406	\N	2	2026-06-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:31.684768	doctor	1	1
407	\N	2	2026-06-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:31.887004	doctor	1	1
408	\N	2	2026-06-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:32.09247	doctor	1	1
409	\N	2	2026-06-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:32.296774	doctor	1	1
410	\N	2	2026-06-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:32.501806	doctor	1	1
411	\N	2	2026-06-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:32.707716	doctor	1	1
412	\N	2	2026-06-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:32.912031	doctor	1	1
413	\N	2	2026-06-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:33.108009	doctor	1	1
414	\N	2	2026-06-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:33.423528	doctor	1	1
415	\N	2	2026-06-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:33.62043	doctor	1	1
416	\N	2	2026-06-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:33.834818	doctor	1	1
417	\N	2	2026-06-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:34.03864	doctor	1	1
418	\N	2	2026-06-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:34.243601	doctor	1	1
419	\N	2	2026-07-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:34.440228	doctor	1	1
420	\N	2	2026-07-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:34.756013	doctor	1	1
421	\N	2	2026-07-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:34.953317	doctor	1	1
422	\N	2	2026-07-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:35.165028	doctor	1	1
423	\N	2	2026-07-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:35.472045	doctor	1	1
424	\N	2	2026-07-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:35.676834	doctor	1	1
425	\N	2	2026-07-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:35.88118	doctor	1	1
426	\N	2	2026-07-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:36.086077	doctor	1	1
427	\N	2	2026-07-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:36.291761	doctor	1	1
428	\N	2	2026-07-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:36.488252	doctor	1	1
429	\N	2	2026-07-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:36.68466	doctor	1	1
430	\N	2	2026-07-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:36.881452	doctor	1	1
431	\N	2	2026-07-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:37.08364	doctor	1	1
432	\N	2	2026-07-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:37.417769	doctor	1	1
433	\N	2	2026-07-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:37.621843	doctor	1	1
434	\N	2	2026-07-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:37.929578	doctor	1	1
435	\N	2	2026-07-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:38.133801	doctor	1	1
436	\N	2	2026-07-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:38.338524	doctor	1	1
437	\N	2	2026-07-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:38.543354	doctor	1	1
438	\N	2	2026-07-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:38.739618	doctor	1	1
439	\N	2	2026-07-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:39.055717	doctor	1	1
440	\N	2	2026-07-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:39.26082	doctor	1	1
441	\N	2	2026-07-31	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:39.4597	doctor	1	1
442	\N	2	2026-08-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:39.658304	doctor	1	1
443	\N	2	2026-08-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:39.855072	doctor	1	1
444	\N	2	2026-08-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:40.057753	doctor	1	1
445	\N	2	2026-08-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:40.254057	doctor	1	1
446	\N	2	2026-08-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:40.456061	doctor	1	1
447	\N	2	2026-08-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:40.694034	doctor	1	1
448	\N	2	2026-08-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:40.899076	doctor	1	1
449	\N	2	2026-08-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:41.10746	doctor	1	1
450	\N	2	2026-08-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:41.308194	doctor	1	1
451	\N	2	2026-08-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:41.505329	doctor	1	1
452	\N	2	2026-08-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:41.717768	doctor	1	1
453	\N	2	2026-08-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:41.923255	doctor	1	1
454	\N	2	2026-08-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:42.127447	doctor	1	1
455	\N	2	2026-08-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:42.323544	doctor	1	1
456	\N	2	2026-08-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:42.642076	doctor	1	1
457	\N	2	2026-08-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:42.844561	doctor	1	1
458	\N	2	2026-08-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:43.049839	doctor	1	1
459	\N	2	2026-08-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:43.254261	doctor	1	1
460	\N	2	2026-08-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:43.45862	doctor	1	1
461	\N	2	2026-08-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:43.66335	doctor	1	1
462	\N	2	2026-08-31	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:43.867832	doctor	1	1
463	\N	2	2026-09-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:44.176015	doctor	1	1
464	\N	2	2026-09-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:44.379836	doctor	1	1
465	\N	2	2026-09-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:44.687863	doctor	1	1
466	\N	2	2026-09-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:44.892074	doctor	1	1
467	\N	2	2026-09-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:45.097825	doctor	1	1
468	\N	2	2026-09-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:45.404656	doctor	1	1
469	\N	2	2026-09-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:45.61007	doctor	1	1
470	\N	2	2026-09-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:45.814873	doctor	1	1
471	\N	2	2026-09-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:46.018573	doctor	1	1
472	\N	2	2026-09-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:46.225184	doctor	1	1
473	\N	2	2026-09-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:46.428108	doctor	1	1
474	\N	2	2026-09-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:46.735578	doctor	1	1
475	\N	2	2026-09-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:46.93171	doctor	1	1
476	\N	2	2026-09-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:47.248374	doctor	1	1
477	\N	2	2026-09-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:47.445031	doctor	1	1
478	\N	2	2026-09-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:47.761665	doctor	1	1
479	\N	2	2026-09-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:47.963883	doctor	1	1
480	\N	2	2026-09-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:48.272391	doctor	1	1
481	\N	2	2026-09-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:48.468345	doctor	1	1
482	\N	2	2026-09-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:48.79153	doctor	1	1
483	\N	2	2026-09-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:48.98838	doctor	1	1
484	\N	2	2026-09-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:49.193124	doctor	1	1
485	\N	2	2026-10-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:49.398558	doctor	1	1
486	\N	2	2026-10-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:49.60287	doctor	1	1
487	\N	2	2026-10-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:49.799062	doctor	1	1
488	\N	2	2026-10-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:49.995352	doctor	1	1
489	\N	2	2026-10-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:50.319575	doctor	1	1
490	\N	2	2026-10-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:50.524113	doctor	1	1
491	\N	2	2026-10-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:50.72918	doctor	1	1
492	\N	2	2026-10-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:50.93392	doctor	1	1
493	\N	2	2026-10-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:51.142356	doctor	1	1
494	\N	2	2026-10-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:51.343126	doctor	1	1
495	\N	2	2026-10-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:51.651121	doctor	1	1
496	\N	2	2026-10-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:51.855155	doctor	1	1
497	\N	2	2026-10-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:52.162723	doctor	1	1
498	\N	2	2026-10-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:52.367386	doctor	1	1
499	\N	2	2026-10-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:52.572218	doctor	1	1
500	\N	2	2026-10-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:52.776889	doctor	1	1
501	\N	2	2026-10-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:52.982594	doctor	1	1
502	\N	2	2026-10-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:53.186373	doctor	1	1
503	\N	2	2026-10-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:53.496601	doctor	1	1
504	\N	2	2026-10-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:53.70179	doctor	1	1
505	\N	2	2026-10-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:54.006831	doctor	1	1
506	\N	2	2026-10-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:54.212863	doctor	1	1
507	\N	2	2026-11-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:54.425148	doctor	1	1
508	\N	2	2026-11-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:54.825446	doctor	1	1
509	\N	2	2026-11-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:55.02989	doctor	1	1
510	\N	2	2026-11-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:55.234498	doctor	1	1
511	\N	2	2026-11-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:55.543239	doctor	1	1
512	\N	2	2026-11-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:55.747233	doctor	1	1
513	\N	2	2026-11-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:55.95128	doctor	1	1
514	\N	2	2026-11-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:56.261317	doctor	1	1
515	\N	2	2026-11-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:56.46344	doctor	1	1
516	\N	2	2026-11-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:56.669456	doctor	1	1
517	\N	2	2026-11-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:56.874865	doctor	1	1
518	\N	2	2026-11-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:57.07862	doctor	1	1
519	\N	2	2026-11-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:57.283109	doctor	1	1
520	\N	2	2026-11-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:57.489767	doctor	1	1
521	\N	2	2026-11-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:57.687614	doctor	1	1
522	\N	2	2026-11-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:58.001022	doctor	1	1
523	\N	2	2026-11-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:58.197529	doctor	1	1
524	\N	2	2026-11-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:58.511898	doctor	1	1
525	\N	2	2026-11-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:58.716873	doctor	1	1
526	\N	2	2026-11-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:58.920898	doctor	1	1
527	\N	2	2026-11-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:59.127091	doctor	1	1
528	\N	2	2026-12-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:59.333157	doctor	1	1
529	\N	2	2026-12-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:59.536403	doctor	1	1
530	\N	2	2026-12-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:59.740746	doctor	1	1
531	\N	2	2026-12-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:05:59.937468	doctor	1	1
532	\N	2	2026-12-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:00.253182	doctor	1	1
533	\N	2	2026-12-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:00.457251	doctor	1	1
534	\N	2	2026-12-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:00.764911	doctor	1	1
535	\N	2	2026-12-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:00.970258	doctor	1	1
536	\N	2	2026-12-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:01.174895	doctor	1	1
537	\N	2	2026-12-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:01.379148	doctor	1	1
538	\N	2	2026-12-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:01.583642	doctor	1	1
539	\N	2	2026-12-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:01.780155	doctor	1	1
540	\N	2	2026-12-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:02.096917	doctor	1	1
541	\N	2	2026-12-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:02.300146	doctor	1	1
542	\N	2	2026-12-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:02.505789	doctor	1	1
543	\N	2	2026-12-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:02.709833	doctor	1	1
544	\N	2	2026-12-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:02.914424	doctor	1	1
545	\N	2	2026-12-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:03.119509	doctor	1	1
546	\N	2	2026-12-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:03.324917	doctor	1	1
547	\N	2	2026-12-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:03.529487	doctor	1	1
548	\N	2	2026-12-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:03.733708	doctor	1	1
549	\N	2	2026-12-30	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:03.938371	doctor	1	1
550	\N	2	2026-12-31	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:04.134435	doctor	1	1
551	\N	2	2027-01-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:04.348582	doctor	1	1
552	\N	2	2027-01-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:04.560911	doctor	1	1
553	\N	2	2027-01-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:04.964106	doctor	1	1
554	\N	2	2027-01-06	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:05.167423	doctor	1	1
555	\N	2	2027-01-07	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:05.372862	doctor	1	1
556	\N	2	2027-01-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:05.577505	doctor	1	1
557	\N	2	2027-01-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:05.774021	doctor	1	1
558	\N	2	2027-01-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:06.089422	doctor	1	1
559	\N	2	2027-01-13	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:06.295133	doctor	1	1
560	\N	2	2027-01-14	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:06.492347	doctor	1	1
561	\N	2	2027-01-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:06.689681	doctor	1	1
562	\N	2	2027-01-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:06.886467	doctor	1	1
563	\N	2	2027-01-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:07.083404	doctor	1	1
564	\N	2	2027-01-20	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:07.279726	doctor	1	1
565	\N	2	2027-01-21	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:07.476205	doctor	1	1
566	\N	2	2027-01-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:07.674911	doctor	1	1
567	\N	2	2027-01-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:07.871549	doctor	1	1
568	\N	2	2027-01-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:08.073314	doctor	1	1
569	\N	2	2027-01-27	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:08.270692	doctor	1	1
570	\N	2	2027-01-28	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:08.467831	doctor	1	1
571	\N	2	2027-01-29	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:08.663921	doctor	1	1
572	\N	2	2027-02-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:08.861452	doctor	1	1
573	\N	2	2027-02-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:09.059103	doctor	1	1
574	\N	2	2027-02-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:09.255895	doctor	1	1
575	\N	2	2027-02-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:09.451941	doctor	1	1
576	\N	2	2027-02-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:09.722337	doctor	1	1
577	\N	2	2027-02-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:09.925437	doctor	1	1
578	\N	2	2027-02-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:10.233638	doctor	1	1
579	\N	2	2027-02-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:10.46196	doctor	1	1
580	\N	2	2027-02-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:10.658816	doctor	1	1
581	\N	2	2027-02-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:10.854896	doctor	1	1
582	\N	2	2027-02-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:11.137476	doctor	1	1
583	\N	2	2027-02-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:11.517183	doctor	1	1
584	\N	2	2027-02-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:11.721401	doctor	1	1
585	\N	2	2027-02-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:11.928186	doctor	1	1
586	\N	2	2027-02-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:12.133504	doctor	1	1
587	\N	2	2027-02-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:12.337161	doctor	1	1
588	\N	2	2027-02-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:12.540445	doctor	1	1
589	\N	2	2027-02-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:12.74549	doctor	1	1
590	\N	2	2027-02-25	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:12.941788	doctor	1	1
591	\N	2	2027-02-26	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:13.155435	doctor	1	1
592	\N	2	2027-03-01	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:13.360254	doctor	1	1
593	\N	2	2027-03-02	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:13.565997	doctor	1	1
594	\N	2	2027-03-03	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:13.769185	doctor	1	1
595	\N	2	2027-03-04	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:13.973765	doctor	1	1
596	\N	2	2027-03-05	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:14.28114	doctor	1	1
597	\N	2	2027-03-08	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:14.486257	doctor	1	1
598	\N	2	2027-03-09	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:14.682202	doctor	1	1
599	\N	2	2027-03-10	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:14.895658	doctor	1	1
600	\N	2	2027-03-11	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:15.100546	doctor	1	1
601	\N	2	2027-03-12	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:15.304915	doctor	1	1
602	\N	2	2027-03-15	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:15.612487	doctor	1	1
603	\N	2	2027-03-16	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:15.816979	doctor	1	1
604	\N	2	2027-03-17	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:16.124444	doctor	1	1
605	\N	2	2027-03-18	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:16.534183	doctor	1	1
606	\N	2	2027-03-19	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:16.739597	doctor	1	1
607	\N	2	2027-03-22	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:16.945752	doctor	1	1
608	\N	2	2027-03-23	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:17.143438	doctor	1	1
609	\N	2	2027-03-24	Gynecology	\N	\N	f	f	scheduled	6	2026-03-25 11:06:17.455763	doctor	1	1
610	\N	3	2026-03-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
611	\N	3	2026-03-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
612	\N	3	2026-03-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
613	\N	3	2026-03-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
614	\N	3	2026-03-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
615	\N	3	2026-04-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
616	\N	3	2026-04-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
617	\N	3	2026-04-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
618	\N	3	2026-04-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
619	\N	3	2026-04-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
620	\N	3	2026-04-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
621	\N	3	2026-04-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
622	\N	3	2026-04-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
623	\N	3	2026-04-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
624	\N	3	2026-04-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
625	\N	3	2026-04-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
626	\N	3	2026-04-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
627	\N	3	2026-04-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
628	\N	3	2026-04-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
629	\N	3	2026-04-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
630	\N	3	2026-04-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
631	\N	3	2026-04-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
632	\N	3	2026-04-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
633	\N	3	2026-04-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
634	\N	3	2026-04-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
635	\N	3	2026-04-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
636	\N	3	2026-04-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
637	\N	3	2026-05-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
638	\N	3	2026-05-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
639	\N	3	2026-05-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
640	\N	3	2026-05-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
641	\N	3	2026-05-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
642	\N	3	2026-05-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
643	\N	3	2026-05-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
644	\N	3	2026-05-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
645	\N	3	2026-05-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
646	\N	3	2026-05-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
647	\N	3	2026-05-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
648	\N	3	2026-05-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
649	\N	3	2026-05-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
650	\N	3	2026-05-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
651	\N	3	2026-05-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
652	\N	3	2026-05-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
653	\N	3	2026-05-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
654	\N	3	2026-05-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
655	\N	3	2026-05-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
656	\N	3	2026-05-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
657	\N	3	2026-05-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
658	\N	3	2026-06-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
659	\N	3	2026-06-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
660	\N	3	2026-06-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
661	\N	3	2026-06-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
662	\N	3	2026-06-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
663	\N	3	2026-06-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
664	\N	3	2026-06-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
665	\N	3	2026-06-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
666	\N	3	2026-06-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
667	\N	3	2026-06-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
668	\N	3	2026-06-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
669	\N	3	2026-06-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
670	\N	3	2026-06-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
671	\N	3	2026-06-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
672	\N	3	2026-06-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
673	\N	3	2026-06-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
674	\N	3	2026-06-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
675	\N	3	2026-06-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
676	\N	3	2026-06-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
677	\N	3	2026-06-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
678	\N	3	2026-06-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
679	\N	3	2026-06-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
680	\N	3	2026-07-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
681	\N	3	2026-07-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
682	\N	3	2026-07-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
683	\N	3	2026-07-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
684	\N	3	2026-07-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
685	\N	3	2026-07-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
686	\N	3	2026-07-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
687	\N	3	2026-07-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
688	\N	3	2026-07-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
689	\N	3	2026-07-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
690	\N	3	2026-07-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
691	\N	3	2026-07-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
692	\N	3	2026-07-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
693	\N	3	2026-07-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
694	\N	3	2026-07-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
695	\N	3	2026-07-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
696	\N	3	2026-07-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
697	\N	3	2026-07-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
698	\N	3	2026-07-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
699	\N	3	2026-07-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
700	\N	3	2026-07-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
701	\N	3	2026-07-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
702	\N	3	2026-07-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
703	\N	3	2026-08-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
704	\N	3	2026-08-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
705	\N	3	2026-08-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
706	\N	3	2026-08-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
707	\N	3	2026-08-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
708	\N	3	2026-08-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
709	\N	3	2026-08-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
710	\N	3	2026-08-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
711	\N	3	2026-08-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
712	\N	3	2026-08-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
713	\N	3	2026-08-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
714	\N	3	2026-08-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
715	\N	3	2026-08-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
716	\N	3	2026-08-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
717	\N	3	2026-08-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
718	\N	3	2026-08-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
719	\N	3	2026-08-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
720	\N	3	2026-08-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
721	\N	3	2026-08-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
722	\N	3	2026-08-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
723	\N	3	2026-08-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
724	\N	3	2026-09-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
725	\N	3	2026-09-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
726	\N	3	2026-09-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
727	\N	3	2026-09-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
728	\N	3	2026-09-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
729	\N	3	2026-09-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
730	\N	3	2026-09-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
731	\N	3	2026-09-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
732	\N	3	2026-09-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
733	\N	3	2026-09-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
734	\N	3	2026-09-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
735	\N	3	2026-09-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
736	\N	3	2026-09-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
737	\N	3	2026-09-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
738	\N	3	2026-09-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
739	\N	3	2026-09-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
740	\N	3	2026-09-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
741	\N	3	2026-09-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
742	\N	3	2026-09-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
743	\N	3	2026-09-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
744	\N	3	2026-09-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
745	\N	3	2026-09-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
746	\N	3	2026-10-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
747	\N	3	2026-10-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
748	\N	3	2026-10-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
749	\N	3	2026-10-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
750	\N	3	2026-10-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
751	\N	3	2026-10-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
752	\N	3	2026-10-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
753	\N	3	2026-10-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
754	\N	3	2026-10-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
755	\N	3	2026-10-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
756	\N	3	2026-10-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
757	\N	3	2026-10-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
758	\N	3	2026-10-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
759	\N	3	2026-10-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
760	\N	3	2026-10-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
761	\N	3	2026-10-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
762	\N	3	2026-10-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
763	\N	3	2026-10-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
764	\N	3	2026-10-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
765	\N	3	2026-10-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
766	\N	3	2026-10-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
767	\N	3	2026-10-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
768	\N	3	2026-11-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
769	\N	3	2026-11-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
770	\N	3	2026-11-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
771	\N	3	2026-11-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
772	\N	3	2026-11-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
773	\N	3	2026-11-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
774	\N	3	2026-11-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
775	\N	3	2026-11-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
776	\N	3	2026-11-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
777	\N	3	2026-11-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
778	\N	3	2026-11-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
779	\N	3	2026-11-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
780	\N	3	2026-11-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
781	\N	3	2026-11-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
782	\N	3	2026-11-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
783	\N	3	2026-11-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
784	\N	3	2026-11-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
785	\N	3	2026-11-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
786	\N	3	2026-11-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
787	\N	3	2026-11-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
788	\N	3	2026-11-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
789	\N	3	2026-12-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
790	\N	3	2026-12-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
791	\N	3	2026-12-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
792	\N	3	2026-12-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
793	\N	3	2026-12-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
794	\N	3	2026-12-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
795	\N	3	2026-12-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
796	\N	3	2026-12-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
797	\N	3	2026-12-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
798	\N	3	2026-12-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
799	\N	3	2026-12-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
800	\N	3	2026-12-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
801	\N	3	2026-12-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
802	\N	3	2026-12-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
803	\N	3	2026-12-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
804	\N	3	2026-12-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
805	\N	3	2026-12-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
806	\N	3	2026-12-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
807	\N	3	2026-12-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
808	\N	3	2026-12-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
809	\N	3	2026-12-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
810	\N	3	2026-12-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
811	\N	3	2026-12-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
812	\N	3	2027-01-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
813	\N	3	2027-01-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
814	\N	3	2027-01-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
815	\N	3	2027-01-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
816	\N	3	2027-01-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
817	\N	3	2027-01-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
818	\N	3	2027-01-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
819	\N	3	2027-01-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
820	\N	3	2027-01-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
821	\N	3	2027-01-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
822	\N	3	2027-01-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
823	\N	3	2027-01-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
824	\N	3	2027-01-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
825	\N	3	2027-01-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
826	\N	3	2027-01-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
827	\N	3	2027-01-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
828	\N	3	2027-01-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
829	\N	3	2027-01-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
830	\N	3	2027-01-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
831	\N	3	2027-01-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
832	\N	3	2027-01-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
833	\N	3	2027-02-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
834	\N	3	2027-02-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
835	\N	3	2027-02-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
836	\N	3	2027-02-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
837	\N	3	2027-02-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
838	\N	3	2027-02-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
839	\N	3	2027-02-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
840	\N	3	2027-02-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
841	\N	3	2027-02-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
842	\N	3	2027-02-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
843	\N	3	2027-02-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
844	\N	3	2027-02-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
845	\N	3	2027-02-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
846	\N	3	2027-02-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
847	\N	3	2027-02-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
848	\N	3	2027-02-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
849	\N	3	2027-02-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
850	\N	3	2027-02-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
851	\N	3	2027-02-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
852	\N	3	2027-02-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
853	\N	3	2027-03-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
854	\N	3	2027-03-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
855	\N	3	2027-03-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
856	\N	3	2027-03-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
857	\N	3	2027-03-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
858	\N	3	2027-03-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
859	\N	3	2027-03-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
860	\N	3	2027-03-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
861	\N	3	2027-03-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
862	\N	3	2027-03-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
863	\N	3	2027-03-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
864	\N	3	2027-03-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
865	\N	3	2027-03-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
866	\N	3	2027-03-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
867	\N	3	2027-03-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
868	\N	3	2027-03-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
869	\N	3	2027-03-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
870	\N	3	2027-03-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:49:36.397791	doctor	2	2
871	2	1	2026-03-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
872	2	1	2026-03-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
873	2	1	2026-03-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
874	2	1	2026-03-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
875	2	1	2026-03-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
876	2	1	2026-04-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
877	2	1	2026-04-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
878	2	1	2026-04-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
879	2	1	2026-04-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
880	2	1	2026-04-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
881	2	1	2026-04-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
882	2	1	2026-04-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
883	2	1	2026-04-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
884	2	1	2026-04-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
885	2	1	2026-04-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
886	2	1	2026-04-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
887	2	1	2026-04-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
888	2	1	2026-04-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
889	2	1	2026-04-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
890	2	1	2026-04-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
891	2	1	2026-04-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
892	2	1	2026-04-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
893	2	1	2026-04-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
894	2	1	2026-04-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
895	2	1	2026-04-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
896	2	1	2026-04-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
897	2	1	2026-04-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
898	2	1	2026-05-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
899	2	1	2026-05-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
900	2	1	2026-05-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
901	2	1	2026-05-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
902	2	1	2026-05-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
903	2	1	2026-05-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
904	2	1	2026-05-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
905	2	1	2026-05-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
906	2	1	2026-05-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
907	2	1	2026-05-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
908	2	1	2026-05-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
909	2	1	2026-05-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
910	2	1	2026-05-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
911	2	1	2026-05-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
912	2	1	2026-05-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
913	2	1	2026-05-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
914	2	1	2026-05-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
915	2	1	2026-05-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
916	2	1	2026-05-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
917	2	1	2026-05-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
918	2	1	2026-05-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
919	2	1	2026-06-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
920	2	1	2026-06-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
921	2	1	2026-06-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
922	2	1	2026-06-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
923	2	1	2026-06-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
924	2	1	2026-06-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
925	2	1	2026-06-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
926	2	1	2026-06-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
927	2	1	2026-06-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
928	2	1	2026-06-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
929	2	1	2026-06-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
930	2	1	2026-06-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
931	2	1	2026-06-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
932	2	1	2026-06-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
933	2	1	2026-06-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
934	2	1	2026-06-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
935	2	1	2026-06-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
936	2	1	2026-06-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
937	2	1	2026-06-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
938	2	1	2026-06-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
939	2	1	2026-06-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
940	2	1	2026-06-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
941	2	1	2026-07-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
942	2	1	2026-07-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
943	2	1	2026-07-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
944	2	1	2026-07-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
945	2	1	2026-07-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
946	2	1	2026-07-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
947	2	1	2026-07-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
948	2	1	2026-07-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
949	2	1	2026-07-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
950	2	1	2026-07-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
951	2	1	2026-07-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
952	2	1	2026-07-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
953	2	1	2026-07-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
954	2	1	2026-07-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
955	2	1	2026-07-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
956	2	1	2026-07-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
957	2	1	2026-07-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
958	2	1	2026-07-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
959	2	1	2026-07-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
960	2	1	2026-07-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
961	2	1	2026-07-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
962	2	1	2026-07-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
963	2	1	2026-07-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
964	2	1	2026-08-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
965	2	1	2026-08-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
966	2	1	2026-08-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
967	2	1	2026-08-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
968	2	1	2026-08-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
969	2	1	2026-08-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
970	2	1	2026-08-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
971	2	1	2026-08-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
972	2	1	2026-08-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
973	2	1	2026-08-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
974	2	1	2026-08-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
975	2	1	2026-08-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
976	2	1	2026-08-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
977	2	1	2026-08-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
978	2	1	2026-08-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
979	2	1	2026-08-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
980	2	1	2026-08-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
981	2	1	2026-08-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
982	2	1	2026-08-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
983	2	1	2026-08-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
984	2	1	2026-08-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
985	2	1	2026-09-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
986	2	1	2026-09-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
987	2	1	2026-09-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
988	2	1	2026-09-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
989	2	1	2026-09-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
990	2	1	2026-09-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
991	2	1	2026-09-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
992	2	1	2026-09-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
993	2	1	2026-09-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
994	2	1	2026-09-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
995	2	1	2026-09-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
996	2	1	2026-09-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
997	2	1	2026-09-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
998	2	1	2026-09-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
999	2	1	2026-09-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1000	2	1	2026-09-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1001	2	1	2026-09-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1002	2	1	2026-09-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1003	2	1	2026-09-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1004	2	1	2026-09-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1005	2	1	2026-09-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1006	2	1	2026-09-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1007	2	1	2026-10-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1008	2	1	2026-10-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1009	2	1	2026-10-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1010	2	1	2026-10-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1011	2	1	2026-10-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1012	2	1	2026-10-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1013	2	1	2026-10-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1014	2	1	2026-10-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1015	2	1	2026-10-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1016	2	1	2026-10-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1017	2	1	2026-10-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1018	2	1	2026-10-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1019	2	1	2026-10-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1020	2	1	2026-10-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1021	2	1	2026-10-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1022	2	1	2026-10-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1023	2	1	2026-10-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1024	2	1	2026-10-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1025	2	1	2026-10-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1026	2	1	2026-10-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1027	2	1	2026-10-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1028	2	1	2026-10-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1029	2	1	2026-11-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1030	2	1	2026-11-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1031	2	1	2026-11-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1032	2	1	2026-11-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1033	2	1	2026-11-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1034	2	1	2026-11-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1035	2	1	2026-11-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1036	2	1	2026-11-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1037	2	1	2026-11-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1038	2	1	2026-11-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1039	2	1	2026-11-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1040	2	1	2026-11-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1041	2	1	2026-11-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1042	2	1	2026-11-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1043	2	1	2026-11-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1044	2	1	2026-11-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1045	2	1	2026-11-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1046	2	1	2026-11-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1047	2	1	2026-11-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1048	2	1	2026-11-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1049	2	1	2026-11-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1050	2	1	2026-12-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1051	2	1	2026-12-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1052	2	1	2026-12-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1053	2	1	2026-12-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1054	2	1	2026-12-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1055	2	1	2026-12-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1056	2	1	2026-12-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1057	2	1	2026-12-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1058	2	1	2026-12-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1059	2	1	2026-12-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1060	2	1	2026-12-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1061	2	1	2026-12-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1062	2	1	2026-12-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1063	2	1	2026-12-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1064	2	1	2026-12-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1065	2	1	2026-12-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1066	2	1	2026-12-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1067	2	1	2026-12-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1068	2	1	2026-12-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1069	2	1	2026-12-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1070	2	1	2026-12-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1071	2	1	2026-12-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1072	2	1	2026-12-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1073	2	1	2027-01-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1074	2	1	2027-01-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1075	2	1	2027-01-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1076	2	1	2027-01-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1077	2	1	2027-01-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1078	2	1	2027-01-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1079	2	1	2027-01-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1080	2	1	2027-01-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1081	2	1	2027-01-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1082	2	1	2027-01-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1083	2	1	2027-01-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1084	2	1	2027-01-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1085	2	1	2027-01-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1086	2	1	2027-01-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1087	2	1	2027-01-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1088	2	1	2027-01-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1089	2	1	2027-01-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1090	2	1	2027-01-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1091	2	1	2027-01-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1092	2	1	2027-01-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1093	2	1	2027-01-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1094	2	1	2027-02-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1095	2	1	2027-02-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1096	2	1	2027-02-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1097	2	1	2027-02-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1098	2	1	2027-02-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1099	2	1	2027-02-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1100	2	1	2027-02-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1101	2	1	2027-02-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1102	2	1	2027-02-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1103	2	1	2027-02-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1104	2	1	2027-02-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1105	2	1	2027-02-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1106	2	1	2027-02-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1107	2	1	2027-02-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1108	2	1	2027-02-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1109	2	1	2027-02-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1110	2	1	2027-02-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1111	2	1	2027-02-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1112	2	1	2027-02-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1113	2	1	2027-02-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1114	2	1	2027-03-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1115	2	1	2027-03-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1116	2	1	2027-03-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1117	2	1	2027-03-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1118	2	1	2027-03-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1119	2	1	2027-03-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1120	2	1	2027-03-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1121	2	1	2027-03-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1122	2	1	2027-03-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1123	2	1	2027-03-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1124	2	1	2027-03-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1125	2	1	2027-03-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1126	2	1	2027-03-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1127	2	1	2027-03-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1128	2	1	2027-03-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1129	2	1	2027-03-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1130	2	1	2027-03-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1131	2	1	2027-03-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:16.819011	staff	2	\N
1132	4	1	2026-03-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1133	4	1	2026-03-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1134	4	1	2026-03-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1135	4	1	2026-03-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1136	4	1	2026-03-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1137	4	1	2026-04-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1138	4	1	2026-04-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1139	4	1	2026-04-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1140	4	1	2026-04-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1141	4	1	2026-04-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1142	4	1	2026-04-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1143	4	1	2026-04-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1144	4	1	2026-04-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1145	4	1	2026-04-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1146	4	1	2026-04-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1147	4	1	2026-04-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1148	4	1	2026-04-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1149	4	1	2026-04-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1150	4	1	2026-04-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1151	4	1	2026-04-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1152	4	1	2026-04-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1153	4	1	2026-04-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1154	4	1	2026-04-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1155	4	1	2026-04-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1156	4	1	2026-04-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1157	4	1	2026-04-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1158	4	1	2026-04-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1159	4	1	2026-05-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1160	4	1	2026-05-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1161	4	1	2026-05-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1162	4	1	2026-05-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1163	4	1	2026-05-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1164	4	1	2026-05-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1165	4	1	2026-05-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1166	4	1	2026-05-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1167	4	1	2026-05-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1168	4	1	2026-05-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1169	4	1	2026-05-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1170	4	1	2026-05-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1171	4	1	2026-05-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1172	4	1	2026-05-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1173	4	1	2026-05-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1174	4	1	2026-05-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1175	4	1	2026-05-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1176	4	1	2026-05-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1177	4	1	2026-05-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1178	4	1	2026-05-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1179	4	1	2026-05-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1180	4	1	2026-06-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1181	4	1	2026-06-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1182	4	1	2026-06-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1183	4	1	2026-06-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1184	4	1	2026-06-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1185	4	1	2026-06-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1186	4	1	2026-06-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1187	4	1	2026-06-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1188	4	1	2026-06-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1189	4	1	2026-06-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1190	4	1	2026-06-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1191	4	1	2026-06-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1192	4	1	2026-06-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1193	4	1	2026-06-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1194	4	1	2026-06-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1195	4	1	2026-06-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1196	4	1	2026-06-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1197	4	1	2026-06-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1198	4	1	2026-06-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1199	4	1	2026-06-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1200	4	1	2026-06-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1201	4	1	2026-06-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1202	4	1	2026-07-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1203	4	1	2026-07-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1204	4	1	2026-07-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1205	4	1	2026-07-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1206	4	1	2026-07-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1207	4	1	2026-07-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1208	4	1	2026-07-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1209	4	1	2026-07-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1210	4	1	2026-07-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1211	4	1	2026-07-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1212	4	1	2026-07-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1213	4	1	2026-07-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1214	4	1	2026-07-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1215	4	1	2026-07-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1216	4	1	2026-07-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1217	4	1	2026-07-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1218	4	1	2026-07-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1219	4	1	2026-07-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1220	4	1	2026-07-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1221	4	1	2026-07-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1222	4	1	2026-07-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1223	4	1	2026-07-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1224	4	1	2026-07-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1225	4	1	2026-08-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1226	4	1	2026-08-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1227	4	1	2026-08-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1228	4	1	2026-08-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1229	4	1	2026-08-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1230	4	1	2026-08-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1231	4	1	2026-08-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1232	4	1	2026-08-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1233	4	1	2026-08-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1234	4	1	2026-08-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1235	4	1	2026-08-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1236	4	1	2026-08-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1237	4	1	2026-08-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1238	4	1	2026-08-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1239	4	1	2026-08-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1240	4	1	2026-08-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1241	4	1	2026-08-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1242	4	1	2026-08-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1243	4	1	2026-08-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1244	4	1	2026-08-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1245	4	1	2026-08-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1246	4	1	2026-09-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1247	4	1	2026-09-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1248	4	1	2026-09-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1249	4	1	2026-09-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1250	4	1	2026-09-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1251	4	1	2026-09-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1252	4	1	2026-09-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1253	4	1	2026-09-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1254	4	1	2026-09-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1255	4	1	2026-09-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1256	4	1	2026-09-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1257	4	1	2026-09-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1258	4	1	2026-09-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1259	4	1	2026-09-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1260	4	1	2026-09-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1261	4	1	2026-09-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1262	4	1	2026-09-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1263	4	1	2026-09-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1264	4	1	2026-09-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1265	4	1	2026-09-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1266	4	1	2026-09-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1267	4	1	2026-09-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1268	4	1	2026-10-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1269	4	1	2026-10-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1270	4	1	2026-10-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1271	4	1	2026-10-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1272	4	1	2026-10-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1273	4	1	2026-10-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1274	4	1	2026-10-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1275	4	1	2026-10-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1276	4	1	2026-10-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1277	4	1	2026-10-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1278	4	1	2026-10-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1279	4	1	2026-10-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1280	4	1	2026-10-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1281	4	1	2026-10-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1282	4	1	2026-10-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1283	4	1	2026-10-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1284	4	1	2026-10-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1285	4	1	2026-10-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1286	4	1	2026-10-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1287	4	1	2026-10-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1288	4	1	2026-10-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1289	4	1	2026-10-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1290	4	1	2026-11-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1291	4	1	2026-11-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1292	4	1	2026-11-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1293	4	1	2026-11-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1294	4	1	2026-11-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1295	4	1	2026-11-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1296	4	1	2026-11-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1297	4	1	2026-11-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1298	4	1	2026-11-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1299	4	1	2026-11-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1300	4	1	2026-11-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1301	4	1	2026-11-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1302	4	1	2026-11-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1303	4	1	2026-11-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1304	4	1	2026-11-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1305	4	1	2026-11-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1306	4	1	2026-11-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1307	4	1	2026-11-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1308	4	1	2026-11-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1309	4	1	2026-11-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1310	4	1	2026-11-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1311	4	1	2026-12-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1312	4	1	2026-12-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1313	4	1	2026-12-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1314	4	1	2026-12-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1315	4	1	2026-12-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1316	4	1	2026-12-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1317	4	1	2026-12-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1318	4	1	2026-12-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1319	4	1	2026-12-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1320	4	1	2026-12-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1321	4	1	2026-12-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1322	4	1	2026-12-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1323	4	1	2026-12-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1324	4	1	2026-12-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1325	4	1	2026-12-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1326	4	1	2026-12-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1327	4	1	2026-12-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1328	4	1	2026-12-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1329	4	1	2026-12-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1330	4	1	2026-12-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1331	4	1	2026-12-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1332	4	1	2026-12-30	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1333	4	1	2026-12-31	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1334	4	1	2027-01-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1335	4	1	2027-01-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1336	4	1	2027-01-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1337	4	1	2027-01-06	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1338	4	1	2027-01-07	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1339	4	1	2027-01-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1340	4	1	2027-01-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1341	4	1	2027-01-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1342	4	1	2027-01-13	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1343	4	1	2027-01-14	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1344	4	1	2027-01-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1345	4	1	2027-01-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1346	4	1	2027-01-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1347	4	1	2027-01-20	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1348	4	1	2027-01-21	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1349	4	1	2027-01-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1350	4	1	2027-01-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1351	4	1	2027-01-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1352	4	1	2027-01-27	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1353	4	1	2027-01-28	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1354	4	1	2027-01-29	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1355	4	1	2027-02-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1356	4	1	2027-02-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1357	4	1	2027-02-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1358	4	1	2027-02-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1359	4	1	2027-02-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1360	4	1	2027-02-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1361	4	1	2027-02-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1362	4	1	2027-02-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1363	4	1	2027-02-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1364	4	1	2027-02-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1365	4	1	2027-02-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1366	4	1	2027-02-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1367	4	1	2027-02-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1368	4	1	2027-02-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1369	4	1	2027-02-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1370	4	1	2027-02-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1371	4	1	2027-02-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1372	4	1	2027-02-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1373	4	1	2027-02-25	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1374	4	1	2027-02-26	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1375	4	1	2027-03-01	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1376	4	1	2027-03-02	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1377	4	1	2027-03-03	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1378	4	1	2027-03-04	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1379	4	1	2027-03-05	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1380	4	1	2027-03-08	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1381	4	1	2027-03-09	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1382	4	1	2027-03-10	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1383	4	1	2027-03-11	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1384	4	1	2027-03-12	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1385	4	1	2027-03-15	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1386	4	1	2027-03-16	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1387	4	1	2027-03-17	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1388	4	1	2027-03-18	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1389	4	1	2027-03-19	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1390	4	1	2027-03-22	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1391	4	1	2027-03-23	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1392	4	1	2027-03-24	Cardiology	\N	\N	f	f	scheduled	6	2026-03-25 11:50:59.534628	staff	4	\N
1411	3	4	2026-04-23	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1412	3	4	2026-04-24	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1413	3	4	2026-04-25	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1414	3	4	2026-04-27	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1415	3	4	2026-04-28	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1416	3	4	2026-04-29	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1417	3	4	2026-04-30	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
1418	3	4	2026-05-01	\N	\N	\N	f	f	scheduled	6	2026-04-02 12:04:16.695988	staff	3	\N
\.


--
-- Data for Name: staff_security_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_security_sessions (session_id, staff_id, user_code, role, login_at, last_seen_at, ip_address, user_agent, revoked_at, revoked_reason) FROM stdin;
64dfd720-70ce-433c-a861-4c4c4be8c018	1	STF001	Receptionist	2026-03-24 05:55:16.202481	2026-03-24 05:55:16.202481	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 05:55:47.242551	forced_logout
8e65ea00-3fde-4222-97ab-58d8d943204f	6	STF006	Admin	2026-03-24 05:28:26.866808	2026-03-24 05:28:26.866808	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-24 09:32:00.393513	logout
fd7d2f62-e79d-4acf-9661-2b7cd85faaa1	6	STF006	Admin	2026-03-24 11:52:55.871781	2026-03-24 11:52:55.871781	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
23b88e83-fe16-409f-8a1c-8a2de411f183	6	STF006	Admin	2026-03-24 13:46:55.080462	2026-03-24 13:46:55.080462	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
188183c5-200a-43bd-a203-eef2d7c8b7ee	6	STF006	Admin	2026-03-24 14:31:31.282657	2026-03-24 14:31:31.282657	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
93680161-afa0-443e-8030-2aa6e1cddcb4	6	STF006	Admin	2026-03-25 04:50:44.803093	2026-03-25 04:50:44.803093	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
d30b3e7c-d233-47a2-a367-2e711354e400	1	STF001	Receptionist	2026-03-25 04:56:12.870827	2026-03-25 04:56:12.870827	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 04:56:33.253053	logout
2a96ff5c-3325-4726-9109-bfd2b1193394	1	STF001	Receptionist	2026-03-25 06:00:17.137624	2026-03-25 06:00:17.137624	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 06:00:26.466369	logout
0c7b2f73-9112-4014-bf1f-4b153a378a00	1	STF001	Receptionist	2026-03-25 06:01:28.983677	2026-03-25 06:01:28.983677	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 06:08:13.810399	logout
9f8dd0f6-d8ff-4d52-9e2b-d1b083dcb03f	1	STF001	Receptionist	2026-03-25 06:08:19.1617	2026-03-25 06:08:19.1617	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 06:41:34.482089	logout
a93b3848-04da-43ee-9228-6119d42e8bf2	1	STF001	Receptionist	2026-03-25 06:41:41.858579	2026-03-25 06:41:41.858579	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 06:41:49.25848	logout
5cecef19-140c-4c95-be68-07777df9fc6a	6	STF006	Admin	2026-03-25 16:45:57.284598	2026-03-25 16:45:57.284598	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-25 21:32:33.92979	logout
212b804a-4ea1-4cda-9275-248495ab1612	1	STF001	Receptionist	2026-03-26 08:12:09.540496	2026-03-26 08:12:09.540496	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	\N	\N
50d68cff-302d-4b97-bad7-ea0fd3ecb3fa	6	STF006	Admin	2026-03-26 14:31:10.879519	2026-03-26 14:31:10.879519	223.123.9.68	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-26 14:32:05.1297	logout
9c5a59f6-606c-4c9c-a9c6-a6e90d31a353	6	STF006	Admin	2026-03-26 14:32:29.813755	2026-03-26 14:32:29.813755	223.123.9.68	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-26 14:38:32.341435	logout
e8015e55-49cf-4688-aaf3-bf2b8729d856	4	STF004	Cashier	2026-03-30 03:28:59.351375	2026-03-30 03:28:59.351375	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-30 03:29:30.957283	logout
a0b3a87d-0288-4fb3-bd2b-dab9abe14a30	1	STF001	Receptionist	2026-03-30 03:46:29.47929	2026-03-30 03:46:29.47929	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-30 04:02:24.311396	logout
9dd5f7d2-5ed5-47c0-bddb-649350b97759	1	STF001	Receptionist	2026-04-02 10:52:38.872765	2026-04-02 10:52:38.872765	39.50.152.190	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0	\N	\N
4788604e-3fc1-4ecf-95c9-077877f0d12f	1	STF001	Receptionist	2026-04-02 11:08:28.951043	2026-04-02 11:08:28.951043	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 11:22:55.866215	logout
1454d265-3aec-41da-88d7-748acc26cf9e	2	STF002	Pharmacist	2026-03-25 06:41:56.016792	2026-03-25 06:41:56.016792	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 12:01:33.766198	forced_logout
dbb09129-c31b-4cd7-97b3-fc3c7f605f38	2	STF002	Pharmacist	2026-03-26 08:31:24.649223	2026-03-26 08:31:24.649223	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 12:01:33.766198	forced_logout
eae73e49-77ec-4e35-9ce1-12db47de7396	2	STF002	Pharmacist	2026-03-26 14:38:49.25086	2026-03-26 14:38:49.25086	223.123.9.68	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 12:01:33.766198	forced_logout
38654d74-68a2-42cd-9c56-b1a33ad6a202	2	STF002	Pharmacist	2026-03-30 03:55:30.568925	2026-03-30 03:55:30.568925	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 12:01:33.766198	forced_logout
a5d6bc3a-3e00-49e7-b5bc-43d1e82402bd	2	STF002	Pharmacist	2026-04-02 11:28:51.045733	2026-04-02 11:28:51.045733	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 12:01:33.766198	forced_logout
3c962ec2-8eb1-4ffc-af68-93bae0d86f37	6	STF006	Admin	2026-04-02 11:54:44.941207	2026-04-02 11:54:44.941207	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 12:16:46.192123	logout
1dd4903a-a682-43fb-a264-a179a3077944	4	STF004	Cashier	2026-04-02 12:16:53.543097	2026-04-02 12:16:53.543097	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 15:31:21.378385	logout
f69c2827-7864-4f89-b87a-def0355f9c26	1	STF001	Receptionist	2026-04-19 09:50:06.549534	2026-04-19 09:50:06.549534	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N
024d2c26-f54b-48f3-b2de-31215da67762	1	STF001	Receptionist	2026-04-19 17:03:51.16139	2026-04-19 17:03:51.16139	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-19 17:11:33.99693	logout
6424f380-d0ae-40b8-b464-8b9549b4202b	2	STF002	Pharmacist	2026-04-19 17:11:48.581085	2026-04-19 17:11:48.581085	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-19 17:17:07.705643	logout
5e7708d5-798a-47a4-91ae-45c6bb747c5d	1	STF001	Receptionist	2026-04-19 17:18:02.254443	2026-04-19 17:18:02.254443	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-19 17:18:16.9708	logout
2a85d40a-a373-49a8-a5d8-67022887839b	1	STF001	Receptionist	2026-04-19 17:18:38.812485	2026-04-19 17:18:38.812485	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-19 17:18:50.536937	logout
40edd5dc-dfa1-48d6-a04c-f1ee1674c88d	6	STF006	Admin	2026-04-20 06:30:40.301927	2026-04-20 06:30:40.301927	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N
4a853cc6-dee0-4edb-9770-185cf565118e	1	STF001	Receptionist	2026-04-22 14:40:33.579187	2026-04-22 14:40:33.579187	182.190.129.67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N
553f718c-ae21-495b-a38f-f19f3529256e	1	STF001	Receptionist	2026-05-23 13:25:13.551026	2026-05-23 13:25:13.551026	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	\N	\N
c520ba5f-fd14-495b-bbaf-64fb44990788	1	STF001	Receptionist	2026-06-20 11:18:59.399406	2026-06-20 11:18:59.399406	::1	node	\N	\N
2803badd-7891-4733-9b6f-e5c2a859d580	7	ADM001	Admin	2026-06-20 11:18:59.47038	2026-06-20 11:18:59.47038	::1	node	\N	\N
eb4317c6-b4df-421c-9028-b1272c6b1652	1	STF001	Receptionist	2026-06-20 11:19:49.904147	2026-06-20 11:19:49.904147	::1	node	\N	\N
37f09904-2ac9-4a9a-8283-017199447a04	7	ADM001	Admin	2026-06-20 11:19:49.956644	2026-06-20 11:19:49.956644	::1	node	\N	\N
70c32318-574b-4f40-863d-a4142ae45b7b	9	SCN_RECEP	Receptionist	2026-06-20 11:22:27.016469	2026-06-20 11:22:27.016469	::1	node	\N	\N
adc36651-8c09-4c44-9d67-91bf3790b5ef	8	SCN_ADMIN	Admin	2026-06-20 11:22:27.065275	2026-06-20 11:22:27.065275	::1	node	\N	\N
d7c458be-8d83-49ca-9315-6bcc74dab46f	9	SCN_RECEP	Receptionist	2026-06-20 11:31:12.538095	2026-06-20 11:31:12.538095	::1	node	\N	\N
3e556497-1525-4900-b04c-450a6869d709	8	SCN_ADMIN	Admin	2026-06-20 11:31:12.611531	2026-06-20 11:31:12.611531	::1	node	\N	\N
bf51480a-4941-4749-ac92-6ffe856dc491	9	SCN_RECEP	Receptionist	2026-06-20 13:37:51.526487	2026-06-20 13:37:51.526487	::1	node	\N	\N
4eda2e06-493c-4409-aa38-22152c6feb64	8	SCN_ADMIN	Admin	2026-06-20 13:37:51.596644	2026-06-20 13:37:51.596644	::1	node	\N	\N
395c4006-8454-4fb5-8930-2ea9c59020ea	9	SCN_RECEP	Receptionist	2026-06-20 13:52:26.962926	2026-06-20 13:52:26.962926	::1	node	\N	\N
1c060a61-3244-4be4-9e61-bd9ec516c682	8	SCN_ADMIN	Admin	2026-06-20 13:52:27.020794	2026-06-20 13:52:27.020794	::1	node	\N	\N
d81e30d0-633b-4796-869f-5586f48d2277	9	SCN_RECEP	Receptionist	2026-06-20 14:56:51.544386	2026-06-20 14:56:51.544386	::1	node	\N	\N
90347dcc-c75c-48aa-b42b-e75081534174	8	SCN_ADMIN	Admin	2026-06-20 14:56:51.620171	2026-06-20 14:56:51.620171	::1	node	\N	\N
d9193783-e505-4308-b4e6-1fb2eb60b0a1	1	STF001	Receptionist	2026-06-20 08:34:58.002603	2026-06-20 08:34:58.002603	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-20 14:57:53.388273	logout
0daeb42c-3f1d-4b3f-a4fb-90d4f9b811b3	1	STF001	Receptionist	2026-06-20 14:58:07.143217	2026-06-20 14:58:07.143217	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	\N
1ce8559a-7709-4b6e-b659-de234f180310	9	SCN_RECEP	Receptionist	2026-06-20 14:58:11.553577	2026-06-20 14:58:11.553577	::1	node	\N	\N
b40091c9-590c-425e-be23-80cd9f222226	8	SCN_ADMIN	Admin	2026-06-20 14:58:11.621937	2026-06-20 14:58:11.621937	::1	node	\N	\N
6a09e7f3-2bbb-47eb-86b4-f89c45aa1478	9	SCN_RECEP	Receptionist	2026-06-20 19:01:56.962346	2026-06-20 19:01:56.962346	::1	node	\N	\N
63105166-60b7-4174-9414-af6a9adfaa55	8	SCN_ADMIN	Admin	2026-06-20 19:01:57.057419	2026-06-20 19:01:57.057419	::1	node	\N	\N
c6436695-3d2a-4c99-9495-938b42e25f20	9	SCN_RECEP	Receptionist	2026-06-20 19:43:40.137412	2026-06-20 19:43:40.137412	::1	node	\N	\N
d7b51774-a2f6-4923-85ef-e34688eb751c	8	SCN_ADMIN	Admin	2026-06-20 19:43:40.186066	2026-06-20 19:43:40.186066	::1	node	\N	\N
4008a3a9-82b2-4057-ac35-9cc6111b542e	9	SCN_RECEP	Receptionist	2026-06-20 20:50:11.381016	2026-06-20 20:50:11.381016	::1	node	\N	\N
ba029066-1bfa-4d46-bb0e-9d38b5ecb102	8	SCN_ADMIN	Admin	2026-06-20 20:50:11.43908	2026-06-20 20:50:11.43908	::1	node	\N	\N
6c554d83-2057-4b51-bbf7-a5819ac75c4d	1	STF001	Receptionist	2026-06-21 01:02:54.318659	2026-06-21 01:02:54.318659	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	\N
557d90f2-17ca-4b84-89b1-8a3725cad8f8	1	STF001	Receptionist	2026-06-21 00:53:53.627357	2026-06-21 00:53:53.627357	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 03:32:51.627088	logout
9f33ac22-c871-4b78-aabb-f180f5d5b456	2	STF002	Pharmacist	2026-06-21 03:33:00.995689	2026-06-21 03:33:00.995689	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 08:03:31.719144	logout
54b64f5b-c563-408a-bd36-b5efc1a7b7b7	1	STF001	Receptionist	2026-06-21 08:06:32.682013	2026-06-21 08:06:32.682013	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 08:07:18.307159	logout
1cd7c639-87ee-49f4-8cd7-b50c2b655708	4	STF004	Cashier	2026-06-21 08:07:30.903677	2026-06-21 08:07:30.903677	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 08:08:01.561873	logout
a882e54b-73a7-4fa7-93d8-9a1645c87886	6	STF006	Admin	2026-06-21 08:08:14.78512	2026-06-21 08:08:14.78512	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 13:24:22.272228	logout
23435b68-9c9f-4c0d-87d1-5e437aeb3f63	3	STF003	Lab_Technician	2026-06-21 13:24:32.875535	2026-06-21 13:24:32.875535	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 14:37:37.235882	logout
8f3c6b3c-e8e4-4276-a93b-7d1c780e7f41	6	STF006	Admin	2026-06-21 14:37:54.248389	2026-06-21 14:37:54.248389	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	\N
\.


--
-- Data for Name: staff_shift_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_shift_templates (shift_template_id, shift_code, shift_name, start_time, end_time, is_night_shift, is_split_shift, department, facility_code, branch_code, max_staff, min_staff, created_by, created_at) FROM stdin;
1	SHF111	morning	09:00:00	17:00:00	f	f		\N	\N	\N	\N	6	2026-03-24 15:03:14.022639
2	SHF2222	afternoon	14:00:00	20:00:00	f	f		\N	\N	\N	\N	6	2026-03-24 15:34:18.881159
3	SHF112	Morning	08:00:00	13:00:00	f	f		\N	\N	\N	\N	6	2026-03-25 11:49:15.406633
4	NIGHT001	Night	21:00:00	05:00:00	f	f		\N	\N	\N	\N	6	2026-04-02 12:03:33.615245
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (setting_key, setting_value, description, updated_at, updated_by) FROM stdin;
hospital_name	"HMS Premium Healthcare"	The display name of the institution	2026-03-19 12:31:40.981743	\N
tax_rate	17.0	Standard GST rate applied to bills	2026-03-19 12:31:40.981743	\N
currency	"PKR"	System default currency	2026-03-19 12:31:40.981743	\N
low_stock_global_threshold	10	Default threshold for inventory alerts	2026-03-19 12:31:40.981743	\N
attendance_device_api_key	"HMSDEV_660344a678b8130297905d4baaf9ddf1c5ef1142b11bf0c4"	Shared key for device/kiosk attendance event ingestion	2026-03-24 09:53:41.311667	\N
attendance_timezone	"Asia/Karachi"	Attendance policy timezone.	2026-03-24 17:07:04.584964	6
system_timezone	"Asia/Karachi"	Global HMS timezone used for business-day boundaries and date/time rendering	2026-03-24 19:40:24.243716	6
attendance_grace_minutes	15	Grace period in minutes before late mark starts.	2026-03-24 19:40:24.419832	6
attendance_half_day_minutes	240	Worked minutes threshold for half day.	2026-03-24 19:40:24.632431	6
attendance_overtime_minutes	30	Minimum overtime minutes before overtime status.	2026-03-24 19:40:24.836703	6
attendance_early_leave_minutes	30	Early leave threshold in minutes.	2026-03-24 19:40:25.034496	6
\.


--
-- Data for Name: visit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.visit (visit_id, patient_id, doctor_id, visit_timestamp, visit_type, clinic_number, status, reason, is_deleted) FROM stdin;
2	2	3	2026-02-06 11:42:40.173912	OPD	1002	seen_by_doctor	Fever and Bodyache	f
3	3	5	2026-02-06 11:42:40.173912	Emergency	2001	discharged	Fracture in right arm	f
4	4	1	2026-02-06 11:42:40.173912	OPD	1003	waiting	Prenatal Scan	f
5	5	4	2026-02-06 11:42:40.173912	OPD	1004	waiting	Child Vaccination	f
16	2	3	2026-02-10 03:36:02.81354	OPD	1	waiting	chill	f
17	2	3	2026-02-10 03:36:03.576304	OPD	1	waiting	chill	f
18	2	3	2026-02-10 03:36:04.961547	OPD	1	waiting	chill	f
40	1	5	2026-03-04 19:14:21.472032	OPD	2	waiting	e-c-s	f
1	1	5	2026-02-06 11:42:40.173912	OPD	2	waiting	e-c-s	f
8	1	5	2026-02-07 02:49:45.148122	OPD	2	waiting	e-c-s	f
19	1	5	2026-03-02 04:03:51.94635	OPD	2	waiting	e-c-s	f
20	1	5	2026-03-02 04:03:56.502018	OPD	2	waiting	e-c-s	f
41	6	3	2026-03-04 19:15:36.596375	Emergency	1	waiting	huuojlkjlk	f
43	6	1	2026-03-05 15:37:56.065107	Emergency	1	waiting	illl	f
45	6	1	2026-03-14 06:22:32.437611	Emergency	2	seen_by_doctor	ill	f
48	3	3	2026-03-18 14:30:16.896957	OPD	2	waiting	sick	f
52	1	1	2026-03-19 03:18:04.029654	Emergency	1	waiting	ill	f
51	6	1	2026-03-19 03:17:38.056206	OPD	1	seen_by_doctor	ill	f
55	1	1	2026-03-21 19:37:20.900629	Emergency	1	waiting	ill	f
58	10	1	2026-03-23 03:34:04.300346	Emergency	1	medicines_dispensed	love sick	f
61	12	2	2026-03-23 14:14:14.451358	OPD	2	waiting	Mangi Truti pai ha!	f
63	12	2	2026-03-26 08:14:48.064921	OPD	1	waiting	sick	f
64	1	3	2026-03-26 08:18:22.025351	Emergency	1	waiting	dfsdfsd	f
65	10	2	2026-03-26 08:21:40.897453	OPD	2	medicines_dispensed	sick	f
6	6	4	2026-02-06 15:05:43.193527	OPD	5	waiting	ill	t
7	6	4	2026-02-07 02:49:17.26509	OPD	5	waiting	ill	t
9	6	4	2026-02-08 13:31:31.821703	OPD	5	waiting	ill	t
10	6	4	2026-02-08 13:31:33.069844	OPD	5	waiting	ill	t
11	6	4	2026-02-08 13:31:33.644257	OPD	5	waiting	ill	t
12	6	4	2026-02-08 13:31:34.443731	OPD	5	waiting	ill	t
13	6	4	2026-02-08 13:31:34.629665	OPD	5	waiting	ill	t
14	6	4	2026-02-08 13:31:34.999485	OPD	5	waiting	ill	t
15	6	4	2026-02-10 03:35:14.48805	OPD	5	waiting	ill	t
21	6	4	2026-03-03 03:07:25.507262	OPD	5	waiting	ill	t
22	6	4	2026-03-03 03:07:32.694943	OPD	5	waiting	ill	t
23	6	4	2026-03-03 03:07:34.132147	OPD	5	waiting	ill	t
24	6	4	2026-03-03 03:07:34.347828	OPD	5	waiting	ill	t
25	6	4	2026-03-03 03:07:38.732612	OPD	5	waiting	ill	t
67	10	2	2026-03-30 03:50:04.119438	OPD	1	medicines_dispensed	ill	f
69	10	2	2026-04-02 11:15:41.239087	OPD	1	medicines_dispensed	ill	f
71	11	3	2026-04-19 17:04:58.412822	OPD	2	waiting	sick	f
26	6	4	2026-03-03 03:07:38.844419	OPD	5	waiting	ill	t
27	6	4	2026-03-03 03:07:39.315368	OPD	5	waiting	ill	t
28	6	4	2026-03-03 03:07:40.231408	OPD	5	waiting	ill	t
32	3	2	2026-03-03 03:47:15.581226	OPD	3	waiting	sick	f
33	4	4	2026-03-03 03:47:35.124399	Emergency	4	waiting	ill	f
29	6	4	2026-03-03 03:07:40.590183	OPD	5	waiting	ill	t
30	6	4	2026-03-03 03:28:59.19527	OPD	5	waiting	ill	t
34	6	4	2026-03-03 04:28:42.170997	OPD	5	waiting	ill	t
35	6	1	2026-03-04 04:21:57.382469	OPD	1	waiting	ill	t
36	6	1	2026-03-04 04:22:03.307635	OPD	1	waiting	ill	t
37	6	1	2026-03-04 04:22:03.470579	OPD	1	waiting	ill	t
38	6	1	2026-03-04 04:22:03.943472	OPD	1	waiting	ill	t
39	6	1	2026-03-04 04:22:04.877127	OPD	1	waiting	ill	t
31	1	5	2026-03-03 03:29:49.539267	OPD	2	waiting	e-c-s	f
42	5	2	2026-03-05 08:05:43.39782	OPD	1	waiting	ill	f
44	1	2	2026-03-14 05:06:51.923104	OPD	1	waiting	ill	f
46	6	1	2026-03-18 09:43:42.609083	OPD	1	waiting	ill	f
54	6	1	2026-03-21 13:41:51.219525	OPD	1	waiting	ill	f
57	1	1	2026-03-22 03:52:00.65595	Emergency	1	waiting	ill	f
60	10	2	2026-03-23 13:01:13.424127	OPD	1	medicines_dispensed	again ill	f
62	10	2	2026-03-23 14:59:34.035806	OPD	3	waiting	fever	f
66	11	3	2026-03-30 03:47:48.505228	Emergency	1	waiting	csd	f
68	15	2	2026-04-02 11:10:41.795849	OPD	1	waiting	ill	f
70	10	2	2026-04-19 09:50:39.047189	OPD	1	waiting	ill	f
59	11	1	2026-03-23 11:56:20.451554	Emergency	2	payment_done	ill	f
56	6	1	2026-03-22 03:51:43.413243	OPD	1	payment_done	ill	f
53	2	1	2026-03-19 03:18:27.8888	OPD	2	payment_done	ill	f
47	1	1	2026-03-18 09:44:06.867939	Emergency	1	payment_done	sick	f
\.


--
-- Data for Name: visit_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.visit_status_history (visit_status_id, visit_id, status, updated_by_doctor, updated_by_staff, updated_at) FROM stdin;
1	45	seen_by_doctor	1	\N	2026-03-14 06:26:29.021681
2	45	waiting	1	\N	2026-03-14 06:26:31.725444
3	45	seen_by_doctor	1	\N	2026-03-14 06:26:34.858739
4	47	seen_by_doctor	1	\N	2026-03-18 10:05:13.251616
5	47	waiting	1	\N	2026-03-18 10:07:20.06474
6	51	seen_by_doctor	1	\N	2026-03-19 03:54:13.912993
7	56	dispensing	\N	1	2026-03-22 12:42:53.739254
8	56	seen_by_doctor	\N	1	2026-03-22 12:44:27.716967
9	56	dispensing	\N	1	2026-03-22 13:14:09.844218
10	56	seen_by_doctor	\N	1	2026-03-22 13:14:37.964666
11	56	dispensing	\N	1	2026-03-22 13:39:57.59244
12	56	medicines_dispensed	\N	1	2026-03-22 13:40:11.687097
13	58	seen_by_doctor	1	\N	2026-03-23 03:52:15.889099
14	58	dispensing	\N	1	2026-03-23 03:58:13.76915
15	58	seen_by_doctor	\N	1	2026-03-23 04:02:55.033913
16	58	dispensing	\N	1	2026-03-23 04:03:53.859672
17	58	medicines_dispensed	\N	1	2026-03-23 04:04:01.546
18	60	dispensing	\N	2	2026-03-23 13:45:54.505679
19	60	medicines_dispensed	\N	2	2026-03-23 13:49:19.886683
20	65	seen_by_doctor	2	\N	2026-03-26 08:28:38.076745
21	65	dispensing	\N	2	2026-03-26 08:40:09.68933
22	65	medicines_dispensed	\N	2	2026-03-26 08:40:31.980088
23	67	dispensing	\N	2	2026-03-30 03:56:18.045373
24	67	seen_by_doctor	\N	2	2026-03-30 03:56:29.403293
25	67	dispensing	\N	2	2026-03-30 03:56:48.300306
26	67	medicines_dispensed	\N	2	2026-03-30 03:57:41.300668
27	69	seen_by_doctor	2	\N	2026-04-02 11:19:46.200962
28	69	dispensing	\N	2	2026-04-02 11:34:56.348926
29	69	medicines_dispensed	\N	2	2026-04-02 11:35:26.903592
30	59	payment_done	\N	4	2026-06-21 16:02:53.788277
31	56	payment_done	\N	4	2026-06-21 16:02:53.82685
32	53	payment_done	\N	4	2026-06-21 16:02:53.849002
33	47	payment_done	\N	4	2026-06-21 16:02:53.872638
\.


--
-- Data for Name: ward; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ward (ward_id, name, ward_type, block, floor, is_active, created_at) FROM stdin;
6	SCN Ward	general	\N	\N	t	2026-06-20 14:56:52.291071
\.


--
-- Name: admission_admission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admission_admission_id_seq', 10, true);


--
-- Name: admission_no_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admission_no_seq', 10, true);


--
-- Name: appointment_appointment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointment_appointment_id_seq', 4, true);


--
-- Name: attendance_regularization_requests_regularization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_regularization_requests_regularization_id_seq', 1, false);


--
-- Name: batch_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_seq', 128, true);


--
-- Name: bed_bed_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bed_bed_id_seq', 5, true);


--
-- Name: bed_transfer_transfer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bed_transfer_transfer_id_seq', 6, true);


--
-- Name: bill_bill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_bill_id_seq', 64, true);


--
-- Name: bill_charge_source_bill_charge_source_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_charge_source_bill_charge_source_id_seq', 19, true);


--
-- Name: bill_item_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_item_item_id_seq', 19, true);


--
-- Name: bill_pharmacy_sale_bill_pharmacy_sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_pharmacy_sale_bill_pharmacy_sale_id_seq', 1, false);


--
-- Name: cashier_audit_event_cashier_audit_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_audit_event_cashier_audit_event_id_seq', 7, true);


--
-- Name: cashier_idempotency_cashier_idempotency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_idempotency_cashier_idempotency_id_seq', 7, true);


--
-- Name: cashier_payment_allocation_cashier_payment_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_payment_allocation_cashier_payment_allocation_id_seq', 1, false);


--
-- Name: cashier_payment_txn_cashier_payment_txn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_payment_txn_cashier_payment_txn_id_seq', 7, true);


--
-- Name: cashier_settlement_draft_cashier_settlement_draft_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_settlement_draft_cashier_settlement_draft_id_seq', 1, false);


--
-- Name: cashier_shift_cashier_shift_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_shift_cashier_shift_id_seq', 1, false);


--
-- Name: current_pregnancy_pregnancy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.current_pregnancy_pregnancy_id_seq', 1, true);


--
-- Name: doctor_doctor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.doctor_doctor_id_seq', 6, true);


--
-- Name: doctor_encounter_note_doctor_encounter_note_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.doctor_encounter_note_doctor_encounter_note_id_seq', 27, true);


--
-- Name: doctor_order_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.doctor_order_order_id_seq', 7, true);


--
-- Name: employee_allowance_allowance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_allowance_allowance_id_seq', 1, false);


--
-- Name: employee_compensation_profile_compensation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_compensation_profile_compensation_id_seq', 15, true);


--
-- Name: employee_credential_events_credential_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_credential_events_credential_event_id_seq', 1, false);


--
-- Name: employee_credential_types_credential_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_credential_types_credential_type_id_seq', 4, true);


--
-- Name: employee_credentials_credential_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_credentials_credential_id_seq', 1, false);


--
-- Name: employee_document_requirements_requirement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_document_requirements_requirement_id_seq', 1, false);


--
-- Name: employee_document_reviews_document_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_document_reviews_document_review_id_seq', 1, false);


--
-- Name: employee_document_types_document_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_document_types_document_type_id_seq', 4, true);


--
-- Name: employee_document_versions_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_document_versions_version_id_seq', 1, false);


--
-- Name: employee_documents_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_documents_document_id_seq', 1, false);


--
-- Name: employee_lifecycle_events_lifecycle_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_lifecycle_events_lifecycle_event_id_seq', 1, false);


--
-- Name: employee_lifecycle_runs_lifecycle_run_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_lifecycle_runs_lifecycle_run_id_seq', 1, false);


--
-- Name: employee_lifecycle_tasks_lifecycle_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_lifecycle_tasks_lifecycle_task_id_seq', 1, false);


--
-- Name: employee_lifecycle_template_task_lifecycle_template_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_lifecycle_template_task_lifecycle_template_task_id_seq', 6, true);


--
-- Name: employee_lifecycle_templates_lifecycle_template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_lifecycle_templates_lifecycle_template_id_seq', 2, true);


--
-- Name: fbr_invoice_submission_submission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fbr_invoice_submission_submission_id_seq', 7, true);


--
-- Name: finance_asset_purchase_asset_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.finance_asset_purchase_asset_purchase_id_seq', 1, false);


--
-- Name: finance_expense_entry_expense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.finance_expense_entry_expense_id_seq', 1, false);


--
-- Name: intake_output_io_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.intake_output_io_id_seq', 3, true);


--
-- Name: invoice_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoice_seq', 7839, true);


--
-- Name: ip_advance_advance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ip_advance_advance_id_seq', 7, true);


--
-- Name: ip_charge_charge_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ip_charge_charge_id_seq', 14, true);


--
-- Name: lab_order_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_order_order_id_seq', 19, true);


--
-- Name: lab_result_approvals_approval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_result_approvals_approval_id_seq', 1, false);


--
-- Name: lab_result_result_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_result_result_id_seq', 1, false);


--
-- Name: lab_test_parameters_parameter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_test_parameters_parameter_id_seq', 1, false);


--
-- Name: lab_test_results_result_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_test_results_result_id_seq', 9, true);


--
-- Name: leave_employee_quota_override_override_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_employee_quota_override_override_id_seq', 1, false);


--
-- Name: leave_role_quota_role_quota_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_role_quota_role_quota_id_seq', 72, true);


--
-- Name: medication_administration_mar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medication_administration_mar_id_seq', 7, true);


--
-- Name: medication_order_med_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medication_order_med_order_id_seq', 7, true);


--
-- Name: medicine_batch_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_batch_batch_id_seq', 128, true);


--
-- Name: medicine_category_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_category_category_id_seq', 21, true);


--
-- Name: medicine_form_form_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_form_form_id_seq', 13, true);


--
-- Name: medicine_manufacturer_manufacturer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_manufacturer_manufacturer_id_seq', 27, true);


--
-- Name: medicine_medicine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_medicine_id_seq', 125, true);


--
-- Name: medicine_purchase_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_purchase_detail_id_seq', 117, true);


--
-- Name: medicine_purchase_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_purchase_purchase_id_seq', 23, true);


--
-- Name: medicine_transaction_txn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_transaction_txn_id_seq', 227, true);


--
-- Name: menstrual_history_menstrual_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menstrual_history_menstrual_history_id_seq', 1, true);


--
-- Name: notification_outbox_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_outbox_notification_id_seq', 2, true);


--
-- Name: nursing_note_note_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_note_note_id_seq', 2, true);


--
-- Name: obstetric_history_obstetric_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.obstetric_history_obstetric_history_id_seq', 1, true);


--
-- Name: para_details_para_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.para_details_para_id_seq', 1, true);


--
-- Name: party_party_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.party_party_id_seq', 11, true);


--
-- Name: party_payment_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.party_payment_payment_id_seq', 1, true);


--
-- Name: patient_allergy_allergy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_allergy_allergy_id_seq', 3, true);


--
-- Name: patient_patient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_patient_id_seq', 26, true);


--
-- Name: patient_vitals_vital_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_vitals_vital_id_seq', 12, true);


--
-- Name: payroll_line_item_payroll_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payroll_line_item_payroll_line_id_seq', 72, true);


--
-- Name: payroll_run_payroll_run_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payroll_run_payroll_run_id_seq', 2, true);


--
-- Name: pharmacy_customer_customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pharmacy_customer_customer_id_seq', 1, false);


--
-- Name: pharmacy_sale_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pharmacy_sale_detail_id_seq', 74, true);


--
-- Name: pharmacy_sale_sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pharmacy_sale_sale_id_seq', 72, true);


--
-- Name: pos_audit_log_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pos_audit_log_log_id_seq', 201, true);


--
-- Name: pos_held_transaction_detail_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pos_held_transaction_detail_detail_id_seq', 15, true);


--
-- Name: pos_held_transaction_hold_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pos_held_transaction_hold_id_seq', 14, true);


--
-- Name: pos_receipt_config_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pos_receipt_config_config_id_seq', 1, false);


--
-- Name: pos_session_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pos_session_session_id_seq', 1, false);


--
-- Name: prescription_fulfillment_action_fulfillment_action_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prescription_fulfillment_action_fulfillment_action_id_seq', 1, true);


--
-- Name: prescription_medicines_prescription_medicine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prescription_medicines_prescription_medicine_id_seq', 14, true);


--
-- Name: prescription_prescription_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prescription_prescription_id_seq', 8, true);


--
-- Name: purchase_return_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_return_detail_id_seq', 14, true);


--
-- Name: purchase_return_return_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_return_return_id_seq', 12, true);


--
-- Name: room_room_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.room_room_id_seq', 5, true);


--
-- Name: sale_return_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_return_detail_id_seq', 14, true);


--
-- Name: sale_return_return_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_return_return_id_seq', 15, true);


--
-- Name: staff_leave_approvals_approval_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_leave_approvals_approval_id_seq', 1, false);


--
-- Name: staff_leave_balances_balance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_leave_balances_balance_id_seq', 1, false);


--
-- Name: staff_leave_requests_leave_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_leave_requests_leave_request_id_seq', 1, true);


--
-- Name: staff_leave_types_leave_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_leave_types_leave_type_id_seq', 6, true);


--
-- Name: staff_permission_audit_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_permission_audit_event_id_seq', 84, true);


--
-- Name: staff_permission_policies_policy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_permission_policies_policy_id_seq', 84, true);


--
-- Name: staff_permissions_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_permissions_permission_id_seq', 1, false);


--
-- Name: staff_role_assignments_assignment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_role_assignments_assignment_id_seq', 1, false);


--
-- Name: staff_roles_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_roles_role_id_seq', 12, true);


--
-- Name: staff_roster_assignments_roster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_roster_assignments_roster_id_seq', 1418, true);


--
-- Name: staff_shift_templates_shift_template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_shift_templates_shift_template_id_seq', 4, true);


--
-- Name: staff_staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_staff_id_seq', 9, true);


--
-- Name: visit_status_history_visit_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visit_status_history_visit_status_id_seq', 33, true);


--
-- Name: visit_visit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visit_visit_id_seq', 71, true);


--
-- Name: ward_ward_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ward_ward_id_seq', 6, true);


--
-- Name: admission admission_admission_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_admission_no_key UNIQUE (admission_no);


--
-- Name: admission admission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_pkey PRIMARY KEY (admission_id);


--
-- Name: allowance_type_master allowance_type_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowance_type_master
    ADD CONSTRAINT allowance_type_master_pkey PRIMARY KEY (code);


--
-- Name: appointment appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT appointment_pkey PRIMARY KEY (appointment_id);


--
-- Name: attendance_regularization_requests attendance_regularization_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_regularization_requests
    ADD CONSTRAINT attendance_regularization_requests_pkey PRIMARY KEY (regularization_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: bed bed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed
    ADD CONSTRAINT bed_pkey PRIMARY KEY (bed_id);


--
-- Name: bed_transfer bed_transfer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfer
    ADD CONSTRAINT bed_transfer_pkey PRIMARY KEY (transfer_id);


--
-- Name: bill_charge_source bill_charge_source_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_charge_source
    ADD CONSTRAINT bill_charge_source_pkey PRIMARY KEY (bill_charge_source_id);


--
-- Name: bill_item bill_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_item
    ADD CONSTRAINT bill_item_pkey PRIMARY KEY (item_id);


--
-- Name: bill_pharmacy_sale bill_pharmacy_sale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_pharmacy_sale
    ADD CONSTRAINT bill_pharmacy_sale_pkey PRIMARY KEY (bill_pharmacy_sale_id);


--
-- Name: bill_pharmacy_sale bill_pharmacy_sale_sale_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_pharmacy_sale
    ADD CONSTRAINT bill_pharmacy_sale_sale_unique UNIQUE (sale_id);


--
-- Name: bill bill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill
    ADD CONSTRAINT bill_pkey PRIMARY KEY (bill_id);


--
-- Name: cashier_audit_event cashier_audit_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_audit_event
    ADD CONSTRAINT cashier_audit_event_pkey PRIMARY KEY (cashier_audit_event_id);


--
-- Name: cashier_idempotency cashier_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_idempotency
    ADD CONSTRAINT cashier_idempotency_pkey PRIMARY KEY (cashier_idempotency_id);


--
-- Name: cashier_payment_allocation cashier_payment_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_allocation
    ADD CONSTRAINT cashier_payment_allocation_pkey PRIMARY KEY (cashier_payment_allocation_id);


--
-- Name: cashier_payment_txn cashier_payment_txn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_txn
    ADD CONSTRAINT cashier_payment_txn_pkey PRIMARY KEY (cashier_payment_txn_id);


--
-- Name: cashier_settlement_draft cashier_settlement_draft_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_settlement_draft
    ADD CONSTRAINT cashier_settlement_draft_pkey PRIMARY KEY (cashier_settlement_draft_id);


--
-- Name: cashier_shift cashier_shift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_shift
    ADD CONSTRAINT cashier_shift_pkey PRIMARY KEY (cashier_shift_id);


--
-- Name: current_pregnancy current_pregnancy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.current_pregnancy
    ADD CONSTRAINT current_pregnancy_pkey PRIMARY KEY (pregnancy_id);


--
-- Name: doctor_attendance doctor_attendance_doctor_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_attendance
    ADD CONSTRAINT doctor_attendance_doctor_id_date_key UNIQUE (doctor_id, date);


--
-- Name: doctor_attendance doctor_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_attendance
    ADD CONSTRAINT doctor_attendance_pkey PRIMARY KEY (attendance_id);


--
-- Name: doctor_encounter_note doctor_encounter_note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_encounter_note
    ADD CONSTRAINT doctor_encounter_note_pkey PRIMARY KEY (doctor_encounter_note_id);


--
-- Name: doctor_encounter_note doctor_encounter_note_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_encounter_note
    ADD CONSTRAINT doctor_encounter_note_visit_id_key UNIQUE (visit_id);


--
-- Name: doctor_order doctor_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_order
    ADD CONSTRAINT doctor_order_pkey PRIMARY KEY (order_id);


--
-- Name: doctor doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor
    ADD CONSTRAINT doctor_pkey PRIMARY KEY (doctor_id);


--
-- Name: doctor_security_sessions doctor_security_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_security_sessions
    ADD CONSTRAINT doctor_security_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: employee_allowance employee_allowance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_allowance
    ADD CONSTRAINT employee_allowance_pkey PRIMARY KEY (allowance_id);


--
-- Name: employee_compensation_profile employee_compensation_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_compensation_profile
    ADD CONSTRAINT employee_compensation_profile_pkey PRIMARY KEY (compensation_id);


--
-- Name: employee_credential_events employee_credential_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_events
    ADD CONSTRAINT employee_credential_events_pkey PRIMARY KEY (credential_event_id);


--
-- Name: employee_credential_types employee_credential_types_credential_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_types
    ADD CONSTRAINT employee_credential_types_credential_code_key UNIQUE (credential_code);


--
-- Name: employee_credential_types employee_credential_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_types
    ADD CONSTRAINT employee_credential_types_pkey PRIMARY KEY (credential_type_id);


--
-- Name: employee_credentials employee_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials
    ADD CONSTRAINT employee_credentials_pkey PRIMARY KEY (credential_id);


--
-- Name: employee_document_requirements employee_document_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_requirements
    ADD CONSTRAINT employee_document_requirements_pkey PRIMARY KEY (requirement_id);


--
-- Name: employee_document_reviews employee_document_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_reviews
    ADD CONSTRAINT employee_document_reviews_pkey PRIMARY KEY (document_review_id);


--
-- Name: employee_document_types employee_document_types_document_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_types
    ADD CONSTRAINT employee_document_types_document_code_key UNIQUE (document_code);


--
-- Name: employee_document_types employee_document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_types
    ADD CONSTRAINT employee_document_types_pkey PRIMARY KEY (document_type_id);


--
-- Name: employee_document_versions employee_document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_versions
    ADD CONSTRAINT employee_document_versions_pkey PRIMARY KEY (version_id);


--
-- Name: employee_documents employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (document_id);


--
-- Name: employee_lifecycle_events employee_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_events
    ADD CONSTRAINT employee_lifecycle_events_pkey PRIMARY KEY (lifecycle_event_id);


--
-- Name: employee_lifecycle_runs employee_lifecycle_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_runs
    ADD CONSTRAINT employee_lifecycle_runs_pkey PRIMARY KEY (lifecycle_run_id);


--
-- Name: employee_lifecycle_tasks employee_lifecycle_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks
    ADD CONSTRAINT employee_lifecycle_tasks_pkey PRIMARY KEY (lifecycle_task_id);


--
-- Name: employee_lifecycle_template_tasks employee_lifecycle_template_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_template_tasks
    ADD CONSTRAINT employee_lifecycle_template_tasks_pkey PRIMARY KEY (lifecycle_template_task_id);


--
-- Name: employee_lifecycle_templates employee_lifecycle_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_templates
    ADD CONSTRAINT employee_lifecycle_templates_pkey PRIMARY KEY (lifecycle_template_id);


--
-- Name: employee_lifecycle_templates employee_lifecycle_templates_template_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_templates
    ADD CONSTRAINT employee_lifecycle_templates_template_code_key UNIQUE (template_code);


--
-- Name: fbr_invoice_submission fbr_invoice_submission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbr_invoice_submission
    ADD CONSTRAINT fbr_invoice_submission_pkey PRIMARY KEY (submission_id);


--
-- Name: finance_asset_purchase finance_asset_purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_asset_purchase
    ADD CONSTRAINT finance_asset_purchase_pkey PRIMARY KEY (asset_purchase_id);


--
-- Name: finance_expense_category finance_expense_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_category
    ADD CONSTRAINT finance_expense_category_pkey PRIMARY KEY (code);


--
-- Name: finance_expense_entry finance_expense_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_entry
    ADD CONSTRAINT finance_expense_entry_pkey PRIMARY KEY (expense_id);


--
-- Name: intake_output intake_output_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_output
    ADD CONSTRAINT intake_output_pkey PRIMARY KEY (io_id);


--
-- Name: ip_advance ip_advance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_advance
    ADD CONSTRAINT ip_advance_pkey PRIMARY KEY (advance_id);


--
-- Name: ip_charge ip_charge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_charge
    ADD CONSTRAINT ip_charge_pkey PRIMARY KEY (charge_id);


--
-- Name: ip_final_bill ip_final_bill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_final_bill
    ADD CONSTRAINT ip_final_bill_pkey PRIMARY KEY (admission_id);


--
-- Name: lab_order lab_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_pkey PRIMARY KEY (order_id);


--
-- Name: lab_result_approvals lab_result_approvals_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_approvals
    ADD CONSTRAINT lab_result_approvals_order_id_key UNIQUE (order_id);


--
-- Name: lab_result_approvals lab_result_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_approvals
    ADD CONSTRAINT lab_result_approvals_pkey PRIMARY KEY (approval_id);


--
-- Name: lab_result lab_result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result
    ADD CONSTRAINT lab_result_pkey PRIMARY KEY (result_id);


--
-- Name: lab_test_parameters lab_test_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_parameters
    ADD CONSTRAINT lab_test_parameters_pkey PRIMARY KEY (parameter_id);


--
-- Name: lab_test_parameters lab_test_parameters_test_id_parameter_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_parameters
    ADD CONSTRAINT lab_test_parameters_test_id_parameter_code_key UNIQUE (test_id, parameter_code);


--
-- Name: lab_test lab_test_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test
    ADD CONSTRAINT lab_test_pkey PRIMARY KEY (test_id);


--
-- Name: lab_test_results lab_test_results_order_id_parameter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results
    ADD CONSTRAINT lab_test_results_order_id_parameter_id_key UNIQUE (order_id, parameter_id);


--
-- Name: lab_test_results lab_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results
    ADD CONSTRAINT lab_test_results_pkey PRIMARY KEY (result_id);


--
-- Name: leave_employee_quota_override leave_employee_quota_override_account_type_person_id_leave__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_employee_quota_override
    ADD CONSTRAINT leave_employee_quota_override_account_type_person_id_leave__key UNIQUE (account_type, person_id, leave_type_id);


--
-- Name: leave_employee_quota_override leave_employee_quota_override_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_employee_quota_override
    ADD CONSTRAINT leave_employee_quota_override_pkey PRIMARY KEY (override_id);


--
-- Name: leave_role_quota leave_role_quota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_role_quota
    ADD CONSTRAINT leave_role_quota_pkey PRIMARY KEY (role_quota_id);


--
-- Name: leave_role_quota leave_role_quota_role_name_leave_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_role_quota
    ADD CONSTRAINT leave_role_quota_role_name_leave_type_id_key UNIQUE (role_name, leave_type_id);


--
-- Name: medication_administration medication_administration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_pkey PRIMARY KEY (mar_id);


--
-- Name: medication_order medication_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_order
    ADD CONSTRAINT medication_order_pkey PRIMARY KEY (med_order_id);


--
-- Name: medicine medicine_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine
    ADD CONSTRAINT medicine_barcode_key UNIQUE (barcode);


--
-- Name: medicine_batch medicine_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_batch
    ADD CONSTRAINT medicine_batch_pkey PRIMARY KEY (batch_id);


--
-- Name: medicine_category medicine_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_category
    ADD CONSTRAINT medicine_category_pkey PRIMARY KEY (category_id);


--
-- Name: medicine_form medicine_form_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_form
    ADD CONSTRAINT medicine_form_pkey PRIMARY KEY (form_id);


--
-- Name: medicine_manufacturer medicine_manufacturer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_manufacturer
    ADD CONSTRAINT medicine_manufacturer_pkey PRIMARY KEY (manufacturer_id);


--
-- Name: medicine medicine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine
    ADD CONSTRAINT medicine_pkey PRIMARY KEY (medicine_id);


--
-- Name: medicine_purchase_detail medicine_purchase_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase_detail
    ADD CONSTRAINT medicine_purchase_detail_pkey PRIMARY KEY (id);


--
-- Name: medicine_purchase medicine_purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase
    ADD CONSTRAINT medicine_purchase_pkey PRIMARY KEY (purchase_id);


--
-- Name: medicine medicine_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine
    ADD CONSTRAINT medicine_sku_key UNIQUE (sku);


--
-- Name: medicine_transaction medicine_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_pkey PRIMARY KEY (txn_id);


--
-- Name: menstrual_history menstrual_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menstrual_history
    ADD CONSTRAINT menstrual_history_pkey PRIMARY KEY (menstrual_history_id);


--
-- Name: notification_outbox notification_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_pkey PRIMARY KEY (notification_id);


--
-- Name: nursing_note nursing_note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_note
    ADD CONSTRAINT nursing_note_pkey PRIMARY KEY (note_id);


--
-- Name: obstetric_history obstetric_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obstetric_history
    ADD CONSTRAINT obstetric_history_pkey PRIMARY KEY (obstetric_history_id);


--
-- Name: para_details para_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.para_details
    ADD CONSTRAINT para_details_pkey PRIMARY KEY (para_id);


--
-- Name: party_payment party_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_payment
    ADD CONSTRAINT party_payment_pkey PRIMARY KEY (payment_id);


--
-- Name: party party_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT party_pkey PRIMARY KEY (party_id);


--
-- Name: patient_allergy patient_allergy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_allergy
    ADD CONSTRAINT patient_allergy_pkey PRIMARY KEY (allergy_id);


--
-- Name: patient patient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient
    ADD CONSTRAINT patient_pkey PRIMARY KEY (patient_id);


--
-- Name: patient_vitals patient_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT patient_vitals_pkey PRIMARY KEY (vital_id);


--
-- Name: payroll_line_item payroll_line_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_line_item
    ADD CONSTRAINT payroll_line_item_pkey PRIMARY KEY (payroll_line_id);


--
-- Name: payroll_run payroll_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run
    ADD CONSTRAINT payroll_run_pkey PRIMARY KEY (payroll_run_id);


--
-- Name: pharmacy_customer pharmacy_customer_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_customer
    ADD CONSTRAINT pharmacy_customer_phone_key UNIQUE (phone);


--
-- Name: pharmacy_customer pharmacy_customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_customer
    ADD CONSTRAINT pharmacy_customer_pkey PRIMARY KEY (customer_id);


--
-- Name: pharmacy_sale_detail pharmacy_sale_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale_detail
    ADD CONSTRAINT pharmacy_sale_detail_pkey PRIMARY KEY (pharmacy_sale_detail_id);


--
-- Name: pharmacy_sale pharmacy_sale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_pkey PRIMARY KEY (sale_id);


--
-- Name: pos_audit_log pos_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_pkey PRIMARY KEY (log_id);


--
-- Name: pos_held_transaction_detail pos_held_transaction_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction_detail
    ADD CONSTRAINT pos_held_transaction_detail_pkey PRIMARY KEY (detail_id);


--
-- Name: pos_held_transaction pos_held_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction
    ADD CONSTRAINT pos_held_transaction_pkey PRIMARY KEY (hold_id);


--
-- Name: pos_receipt_config pos_receipt_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_receipt_config
    ADD CONSTRAINT pos_receipt_config_pkey PRIMARY KEY (config_id);


--
-- Name: pos_session pos_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_session
    ADD CONSTRAINT pos_session_pkey PRIMARY KEY (session_id);


--
-- Name: prescription_fulfillment_action prescription_fulfillment_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fulfillment_action
    ADD CONSTRAINT prescription_fulfillment_action_pkey PRIMARY KEY (fulfillment_action_id);


--
-- Name: prescription_medicines prescription_medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_medicines
    ADD CONSTRAINT prescription_medicines_pkey PRIMARY KEY (prescription_medicine_id);


--
-- Name: prescription prescription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription
    ADD CONSTRAINT prescription_pkey PRIMARY KEY (prescription_id);


--
-- Name: purchase_return_detail purchase_return_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_detail
    ADD CONSTRAINT purchase_return_detail_pkey PRIMARY KEY (id);


--
-- Name: purchase_return purchase_return_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return
    ADD CONSTRAINT purchase_return_pkey PRIMARY KEY (return_id);


--
-- Name: room room_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_pkey PRIMARY KEY (room_id);


--
-- Name: sale_return_detail sale_return_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return_detail
    ADD CONSTRAINT sale_return_detail_pkey PRIMARY KEY (id);


--
-- Name: sale_return sale_return_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return
    ADD CONSTRAINT sale_return_pkey PRIMARY KEY (return_id);


--
-- Name: staff_attendance staff_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (attendance_id);


--
-- Name: staff_attendance staff_attendance_staff_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_date_key UNIQUE (staff_id, date);


--
-- Name: staff_leave_approvals staff_leave_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_approvals
    ADD CONSTRAINT staff_leave_approvals_pkey PRIMARY KEY (approval_id);


--
-- Name: staff_leave_balances staff_leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_pkey PRIMARY KEY (balance_id);


--
-- Name: staff_leave_requests staff_leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_pkey PRIMARY KEY (leave_request_id);


--
-- Name: staff_leave_types staff_leave_types_leave_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_types
    ADD CONSTRAINT staff_leave_types_leave_code_key UNIQUE (leave_code);


--
-- Name: staff_leave_types staff_leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_types
    ADD CONSTRAINT staff_leave_types_pkey PRIMARY KEY (leave_type_id);


--
-- Name: staff_permission_audit staff_permission_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_audit
    ADD CONSTRAINT staff_permission_audit_pkey PRIMARY KEY (event_id);


--
-- Name: staff_permission_policies staff_permission_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_policies
    ADD CONSTRAINT staff_permission_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: staff_permissions staff_permissions_staff_id_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_staff_id_module_key UNIQUE (staff_id, module);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (staff_id);


--
-- Name: staff_role_assignments staff_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_role_assignments
    ADD CONSTRAINT staff_role_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: staff_roles staff_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_pkey PRIMARY KEY (role_id);


--
-- Name: staff_roles staff_roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_role_code_key UNIQUE (role_code);


--
-- Name: staff_roster_assignments staff_roster_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roster_assignments
    ADD CONSTRAINT staff_roster_assignments_pkey PRIMARY KEY (roster_id);


--
-- Name: staff_security_sessions staff_security_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_security_sessions
    ADD CONSTRAINT staff_security_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: staff_shift_templates staff_shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shift_templates
    ADD CONSTRAINT staff_shift_templates_pkey PRIMARY KEY (shift_template_id);


--
-- Name: staff_shift_templates staff_shift_templates_shift_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shift_templates
    ADD CONSTRAINT staff_shift_templates_shift_code_key UNIQUE (shift_code);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: medicine_batch uk_batch_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_batch
    ADD CONSTRAINT uk_batch_code UNIQUE (batch_code);


--
-- Name: medicine_batch uk_med_batch_party; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_batch
    ADD CONSTRAINT uk_med_batch_party UNIQUE (medicine_id, batch_number, party_id);


--
-- Name: current_pregnancy uniqeue_visit_id_cp; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.current_pregnancy
    ADD CONSTRAINT uniqeue_visit_id_cp UNIQUE (visit_id);


--
-- Name: para_details unique_obstetric_para; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.para_details
    ADD CONSTRAINT unique_obstetric_para UNIQUE (obstetric_history_id, para_number);


--
-- Name: obstetric_history unique_patient_id_obs_history; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obstetric_history
    ADD CONSTRAINT unique_patient_id_obs_history UNIQUE (patient_id);


--
-- Name: patient_vitals unique_patient_vitals; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT unique_patient_vitals UNIQUE (visit_id);


--
-- Name: prescription unique_visit_prescription; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription
    ADD CONSTRAINT unique_visit_prescription UNIQUE (visit_id);


--
-- Name: bed uq_bed_room_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed
    ADD CONSTRAINT uq_bed_room_number UNIQUE (room_id, bed_number);


--
-- Name: cashier_idempotency uq_cashier_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_idempotency
    ADD CONSTRAINT uq_cashier_idempotency UNIQUE (idempotency_key, endpoint);


--
-- Name: menstrual_history uq_menstrual_history_patient_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menstrual_history
    ADD CONSTRAINT uq_menstrual_history_patient_id UNIQUE (patient_id);


--
-- Name: room uq_room_ward_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT uq_room_ward_number UNIQUE (ward_id, room_number);


--
-- Name: visit visit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT visit_pkey PRIMARY KEY (visit_id);


--
-- Name: visit_status_history visit_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_status_history
    ADD CONSTRAINT visit_status_history_pkey PRIMARY KEY (visit_status_id);


--
-- Name: ward ward_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward
    ADD CONSTRAINT ward_pkey PRIMARY KEY (ward_id);


--
-- Name: idx_admission_bed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_bed ON public.admission USING btree (current_bed_id);


--
-- Name: idx_admission_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_patient ON public.admission USING btree (patient_id);


--
-- Name: idx_admission_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_status ON public.admission USING btree (status);


--
-- Name: idx_appointment_doctor_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointment_doctor_time ON public.appointment USING btree (doctor_id, scheduled_at);


--
-- Name: idx_appointment_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointment_patient ON public.appointment USING btree (patient_id);


--
-- Name: idx_attendance_regularization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_regularization_status ON public.attendance_regularization_requests USING btree (request_status, created_at DESC);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_staff_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_staff_created ON public.audit_logs USING btree (staff_id, created_at DESC);


--
-- Name: idx_bed_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bed_status ON public.bed USING btree (status);


--
-- Name: idx_bed_transfer_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bed_transfer_admission ON public.bed_transfer USING btree (admission_id);


--
-- Name: idx_bill_charge_source_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_charge_source_bill ON public.bill_charge_source USING btree (bill_id, created_at DESC);


--
-- Name: idx_bill_charge_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_charge_source_type ON public.bill_charge_source USING btree (source_type, source_id);


--
-- Name: idx_bill_pharmacy_sale_bill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_pharmacy_sale_bill_id ON public.bill_pharmacy_sale USING btree (bill_id);


--
-- Name: idx_bill_pharmacy_sale_settlement_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_pharmacy_sale_settlement_status ON public.bill_pharmacy_sale USING btree (settlement_status);


--
-- Name: idx_cashier_audit_event_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_audit_event_bill ON public.cashier_audit_event USING btree (bill_id, created_at DESC);


--
-- Name: idx_cashier_audit_event_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_audit_event_time ON public.cashier_audit_event USING btree (created_at DESC);


--
-- Name: idx_cashier_idempotency_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_idempotency_bill ON public.cashier_idempotency USING btree (bill_id, created_at DESC);


--
-- Name: idx_cashier_payment_alloc_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_payment_alloc_bill ON public.cashier_payment_allocation USING btree (bill_id);


--
-- Name: idx_cashier_payment_alloc_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_payment_alloc_sale ON public.cashier_payment_allocation USING btree (sale_id);


--
-- Name: idx_cashier_payment_txn_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_payment_txn_bill ON public.cashier_payment_txn USING btree (bill_id, created_at DESC);


--
-- Name: idx_cashier_payment_txn_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_payment_txn_visit ON public.cashier_payment_txn USING btree (visit_id);


--
-- Name: idx_cashier_settlement_draft_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_settlement_draft_bill ON public.cashier_settlement_draft USING btree (bill_id, draft_status, created_at DESC);


--
-- Name: idx_cashier_shift_opened_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashier_shift_opened_at ON public.cashier_shift USING btree (opened_at DESC);


--
-- Name: idx_doctor_attendance_date_derived_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_attendance_date_derived_status ON public.doctor_attendance USING btree (date, derived_status);


--
-- Name: idx_doctor_attendance_doctor_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_attendance_doctor_date ON public.doctor_attendance USING btree (doctor_id, date DESC);


--
-- Name: idx_doctor_encounter_note_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_encounter_note_doctor ON public.doctor_encounter_note USING btree (doctor_id);


--
-- Name: idx_doctor_encounter_note_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_encounter_note_patient ON public.doctor_encounter_note USING btree (patient_id);


--
-- Name: idx_doctor_order_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_order_admission ON public.doctor_order USING btree (admission_id);


--
-- Name: idx_doctor_order_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_order_status ON public.doctor_order USING btree (status);


--
-- Name: idx_doctor_security_sessions_doctor_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_security_sessions_doctor_revoked ON public.doctor_security_sessions USING btree (doctor_id, revoked_at);


--
-- Name: idx_doctor_security_sessions_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_security_sessions_last_seen ON public.doctor_security_sessions USING btree (last_seen_at DESC);


--
-- Name: idx_employee_allowance_person_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_allowance_person_active ON public.employee_allowance USING btree (account_type, person_id, is_active, effective_from, effective_to);


--
-- Name: idx_employee_compensation_profile_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_compensation_profile_active ON public.employee_compensation_profile USING btree (account_type, person_id, active_to);


--
-- Name: idx_employee_credential_events_credential; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_credential_events_credential ON public.employee_credential_events USING btree (credential_id, created_at DESC);


--
-- Name: idx_employee_credentials_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_credentials_employee ON public.employee_credentials USING btree (account_type, person_id, verification_status);


--
-- Name: idx_employee_credentials_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_credentials_expiry ON public.employee_credentials USING btree (expires_on, verification_status);


--
-- Name: idx_employee_document_reviews_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_document_reviews_document ON public.employee_document_reviews USING btree (document_id, created_at DESC);


--
-- Name: idx_employee_document_versions_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_document_versions_document ON public.employee_document_versions USING btree (document_id, uploaded_at DESC);


--
-- Name: idx_employee_documents_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_documents_employee ON public.employee_documents USING btree (account_type, person_id, document_type_id);


--
-- Name: idx_employee_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_documents_status ON public.employee_documents USING btree (review_status, expires_on);


--
-- Name: idx_employee_lifecycle_events_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_lifecycle_events_run ON public.employee_lifecycle_events USING btree (lifecycle_run_id, created_at DESC);


--
-- Name: idx_employee_lifecycle_runs_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_lifecycle_runs_employee ON public.employee_lifecycle_runs USING btree (account_type, person_id, run_status);


--
-- Name: idx_employee_lifecycle_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_lifecycle_runs_status ON public.employee_lifecycle_runs USING btree (run_status, lifecycle_type, started_at DESC);


--
-- Name: idx_employee_lifecycle_tasks_status_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_lifecycle_tasks_status_due ON public.employee_lifecycle_tasks USING btree (task_status, due_at);


--
-- Name: idx_fbr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fbr_status ON public.fbr_invoice_submission USING btree (status) WHERE ((status)::text = 'queued'::text);


--
-- Name: idx_finance_asset_purchase_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_asset_purchase_date ON public.finance_asset_purchase USING btree (purchase_date DESC, asset_category);


--
-- Name: idx_finance_expense_entry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_expense_entry_date ON public.finance_expense_entry USING btree (expense_date DESC, category);


--
-- Name: idx_intake_output_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_output_admission ON public.intake_output USING btree (admission_id);


--
-- Name: idx_ip_advance_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_advance_admission ON public.ip_advance USING btree (admission_id);


--
-- Name: idx_ip_charge_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_charge_admission ON public.ip_charge USING btree (admission_id);


--
-- Name: idx_lab_order_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_order_visit_id ON public.lab_order USING btree (visit_id);


--
-- Name: idx_mar_med_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mar_med_order ON public.medication_administration USING btree (med_order_id);


--
-- Name: idx_medication_order_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_order_order ON public.medication_order USING btree (order_id);


--
-- Name: idx_medicine_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_active ON public.medicine USING btree (is_active);


--
-- Name: idx_medicine_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_barcode ON public.medicine USING btree (barcode);


--
-- Name: idx_medicine_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_category_id ON public.medicine USING btree (category_id);


--
-- Name: idx_medicine_controlled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_controlled ON public.medicine USING btree (medicine_id) WHERE is_controlled;


--
-- Name: idx_medicine_form_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_form_id ON public.medicine USING btree (form_id);


--
-- Name: idx_medicine_manufacturer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_manufacturer_id ON public.medicine USING btree (manufacturer_id);


--
-- Name: idx_medicine_search_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_search_vector ON public.medicine USING gin (search_vector);


--
-- Name: idx_medicine_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_sku ON public.medicine USING btree (sku);


--
-- Name: idx_notif_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_created ON public.notification_outbox USING btree (created_at DESC);


--
-- Name: idx_notif_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_status ON public.notification_outbox USING btree (status) WHERE ((status)::text = 'queued'::text);


--
-- Name: idx_nursing_note_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_note_admission ON public.nursing_note USING btree (admission_id);


--
-- Name: idx_patient_allergy_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_allergy_patient ON public.patient_allergy USING btree (patient_id) WHERE is_active;


--
-- Name: idx_patient_vitals_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_vitals_admission ON public.patient_vitals USING btree (admission_id);


--
-- Name: idx_payroll_line_item_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_line_item_person ON public.payroll_line_item USING btree (account_type, person_id, created_at DESC);


--
-- Name: idx_pharmacy_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pharmacy_customer_phone ON public.pharmacy_customer USING btree (phone);


--
-- Name: idx_pos_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_audit_created ON public.pos_audit_log USING btree (created_at);


--
-- Name: idx_pos_audit_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_audit_staff ON public.pos_audit_log USING btree (staff_id);


--
-- Name: idx_pos_session_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_session_staff ON public.pos_session USING btree (staff_id);


--
-- Name: idx_pos_session_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_session_status ON public.pos_session USING btree (status);


--
-- Name: idx_prescription_fulfillment_action_prescription_medicine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_fulfillment_action_prescription_medicine ON public.prescription_fulfillment_action USING btree (prescription_medicine_id);


--
-- Name: idx_prescription_fulfillment_action_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_fulfillment_action_visit ON public.prescription_fulfillment_action USING btree (visit_id);


--
-- Name: idx_prescription_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_visit_id ON public.prescription USING btree (visit_id);


--
-- Name: idx_room_ward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_room_ward ON public.room USING btree (ward_id);


--
-- Name: idx_staff_attendance_date_derived_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_date_derived_status ON public.staff_attendance USING btree (date, derived_status);


--
-- Name: idx_staff_attendance_date_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_date_staff ON public.staff_attendance USING btree (date, staff_id);


--
-- Name: idx_staff_attendance_roster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_roster_id ON public.staff_attendance USING btree (roster_id);


--
-- Name: idx_staff_attendance_staff_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_staff_date ON public.staff_attendance USING btree (staff_id, date DESC);


--
-- Name: idx_staff_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_department ON public.staff USING btree (department);


--
-- Name: idx_staff_employment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_employment_status ON public.staff USING btree (employment_status);


--
-- Name: idx_staff_facility_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_facility_branch ON public.staff USING btree (facility_code, branch_code);


--
-- Name: idx_staff_leave_requests_person_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_leave_requests_person_status ON public.staff_leave_requests USING btree (account_type, person_id, request_status, requested_at DESC);


--
-- Name: idx_staff_leave_requests_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_leave_requests_range ON public.staff_leave_requests USING btree (from_date, to_date, request_status);


--
-- Name: idx_staff_leave_requests_staff_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_leave_requests_staff_status ON public.staff_leave_requests USING btree (staff_id, request_status, requested_at DESC);


--
-- Name: idx_staff_permission_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_permission_audit_created_at ON public.staff_permission_audit USING btree (created_at DESC);


--
-- Name: idx_staff_role_assignments_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_role_assignments_role ON public.staff_role_assignments USING btree (role_id, effective_to);


--
-- Name: idx_staff_role_assignments_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_role_assignments_staff ON public.staff_role_assignments USING btree (staff_id, effective_to);


--
-- Name: idx_staff_roster_account_person_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_roster_account_person_date ON public.staff_roster_assignments USING btree (account_type, person_id, roster_date DESC);


--
-- Name: idx_staff_roster_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_roster_date ON public.staff_roster_assignments USING btree (roster_date, department);


--
-- Name: idx_staff_security_sessions_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_security_sessions_last_seen ON public.staff_security_sessions USING btree (last_seen_at DESC);


--
-- Name: idx_staff_security_sessions_staff_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_security_sessions_staff_revoked ON public.staff_security_sessions USING btree (staff_id, revoked_at);


--
-- Name: idx_visit_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visit_timestamp ON public.visit USING btree (visit_timestamp);


--
-- Name: medicine_category_name_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX medicine_category_name_unique_idx ON public.medicine_category USING btree (lower(btrim((name)::text)));


--
-- Name: medicine_form_name_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX medicine_form_name_unique_idx ON public.medicine_form USING btree (lower(btrim((name)::text)));


--
-- Name: medicine_manufacturer_name_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX medicine_manufacturer_name_unique_idx ON public.medicine_manufacturer USING btree (lower(btrim((name)::text)));


--
-- Name: uq_admission_active_bed; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admission_active_bed ON public.admission USING btree (current_bed_id) WHERE (((status)::text = 'admitted'::text) AND (current_bed_id IS NOT NULL));


--
-- Name: uq_appointment_active_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_appointment_active_slot ON public.appointment USING btree (doctor_id, scheduled_at) WHERE ((status)::text <> ALL (ARRAY[('cancelled'::character varying)::text, ('no_show'::character varying)::text]));


--
-- Name: uq_cashier_payment_txn_receipt_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cashier_payment_txn_receipt_no ON public.cashier_payment_txn USING btree (receipt_no) WHERE (receipt_no IS NOT NULL);


--
-- Name: uq_cashier_shift_open_per_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cashier_shift_open_per_staff ON public.cashier_shift USING btree (staff_id) WHERE (status = 'open'::text);


--
-- Name: uq_employee_compensation_profile_person; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_compensation_profile_person ON public.employee_compensation_profile USING btree (account_type, person_id, active_from);


--
-- Name: uq_employee_credentials_unique_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_credentials_unique_number ON public.employee_credentials USING btree (credential_type_id, credential_number, account_type, person_id);


--
-- Name: uq_employee_document_requirement_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_document_requirement_scope ON public.employee_document_requirements USING btree (document_type_id, target_type, COALESCE(target_value, ''::character varying));


--
-- Name: uq_employee_document_versions_doc_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_document_versions_doc_version ON public.employee_document_versions USING btree (document_id, version_no);


--
-- Name: uq_employee_lifecycle_tasks_run_task_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_lifecycle_tasks_run_task_code ON public.employee_lifecycle_tasks USING btree (lifecycle_run_id, task_code);


--
-- Name: uq_employee_lifecycle_template_task_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_lifecycle_template_task_code ON public.employee_lifecycle_template_tasks USING btree (lifecycle_template_id, task_code);


--
-- Name: uq_fbr_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_fbr_bill ON public.fbr_invoice_submission USING btree (bill_id);


--
-- Name: uq_ip_charge_room_rent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ip_charge_room_rent ON public.ip_charge USING btree (admission_id, source_ref) WHERE ((charge_type)::text = 'room_rent'::text);


--
-- Name: uq_patient_cnic; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_patient_cnic ON public.patient USING btree (cnic) WHERE ((cnic IS NOT NULL) AND (btrim((cnic)::text) <> ''::text));


--
-- Name: uq_payroll_line_item_per_run; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_payroll_line_item_per_run ON public.payroll_line_item USING btree (payroll_run_id, account_type, person_id);


--
-- Name: uq_payroll_run_period_month; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_payroll_run_period_month ON public.payroll_run USING btree (period_month);


--
-- Name: uq_staff_leave_approval_level; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_leave_approval_level ON public.staff_leave_approvals USING btree (leave_request_id, level_no, approver_staff_id);


--
-- Name: uq_staff_leave_balance_account_person; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_leave_balance_account_person ON public.staff_leave_balances USING btree (account_type, person_id, leave_type_id, period_year);


--
-- Name: uq_staff_permission_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_permission_policy ON public.staff_permission_policies USING btree (COALESCE(staff_id, 0), COALESCE(role_id, 0), module, action, scope_type, COALESCE(scope_value, ''::character varying));


--
-- Name: uq_staff_roster_account_person_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_roster_account_person_date ON public.staff_roster_assignments USING btree (account_type, person_id, roster_date);


--
-- Name: uq_staff_roster_staff_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_roster_staff_date ON public.staff_roster_assignments USING btree (staff_id, roster_date);


--
-- Name: medicine medicine_search_vector_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER medicine_search_vector_trigger BEFORE INSERT OR UPDATE ON public.medicine FOR EACH ROW EXECUTE FUNCTION public.medicine_search_vector_update();


--
-- Name: medicine_purchase_detail tg_purchase_detail_to_txn; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_purchase_detail_to_txn AFTER INSERT OR DELETE OR UPDATE ON public.medicine_purchase_detail FOR EACH ROW EXECUTE FUNCTION public.fn_tg_purchase_detail_to_txn();


--
-- Name: purchase_return_detail tg_purchase_return_detail_to_txn; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_purchase_return_detail_to_txn AFTER INSERT OR DELETE OR UPDATE ON public.purchase_return_detail FOR EACH ROW EXECUTE FUNCTION public.fn_tg_purchase_return_detail_to_txn();


--
-- Name: pharmacy_sale_detail tg_sale_detail_to_txn; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_sale_detail_to_txn AFTER INSERT OR DELETE OR UPDATE ON public.pharmacy_sale_detail FOR EACH ROW EXECUTE FUNCTION public.fn_tg_sale_detail_to_txn();


--
-- Name: sale_return_detail tg_sale_return_detail_to_txn; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_sale_return_detail_to_txn AFTER INSERT OR DELETE OR UPDATE ON public.sale_return_detail FOR EACH ROW EXECUTE FUNCTION public.fn_tg_sale_return_detail_to_txn();


--
-- Name: medicine_transaction tg_stockquantity_generic; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_stockquantity_generic AFTER INSERT OR DELETE OR UPDATE ON public.medicine_transaction FOR EACH ROW EXECUTE FUNCTION public.fn_tg_stockquantity_generic();


--
-- Name: admission admission_attending_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_attending_doctor_id_fkey FOREIGN KEY (attending_doctor_id) REFERENCES public.doctor(doctor_id);


--
-- Name: admission admission_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: admission admission_current_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_current_bed_id_fkey FOREIGN KEY (current_bed_id) REFERENCES public.bed(bed_id);


--
-- Name: admission admission_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: admission admission_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission
    ADD CONSTRAINT admission_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: appointment appointment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT appointment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: appointment appointment_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT appointment_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id);


--
-- Name: appointment appointment_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT appointment_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: appointment appointment_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT appointment_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: attendance_regularization_requests attendance_regularization_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_regularization_requests
    ADD CONSTRAINT attendance_regularization_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(staff_id);


--
-- Name: attendance_regularization_requests attendance_regularization_requests_attendance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_regularization_requests
    ADD CONSTRAINT attendance_regularization_requests_attendance_id_fkey FOREIGN KEY (attendance_id) REFERENCES public.staff_attendance(attendance_id) ON DELETE SET NULL;


--
-- Name: attendance_regularization_requests attendance_regularization_requests_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_regularization_requests
    ADD CONSTRAINT attendance_regularization_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id);


--
-- Name: bed bed_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed
    ADD CONSTRAINT bed_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.room(room_id) ON DELETE CASCADE;


--
-- Name: bed_transfer bed_transfer_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfer
    ADD CONSTRAINT bed_transfer_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: bed_transfer bed_transfer_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfer
    ADD CONSTRAINT bed_transfer_by_staff_id_fkey FOREIGN KEY (by_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: bed_transfer bed_transfer_from_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfer
    ADD CONSTRAINT bed_transfer_from_bed_id_fkey FOREIGN KEY (from_bed_id) REFERENCES public.bed(bed_id);


--
-- Name: bed_transfer bed_transfer_to_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfer
    ADD CONSTRAINT bed_transfer_to_bed_id_fkey FOREIGN KEY (to_bed_id) REFERENCES public.bed(bed_id);


--
-- Name: bill_charge_source bill_charge_source_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_charge_source
    ADD CONSTRAINT bill_charge_source_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE CASCADE;


--
-- Name: bill_charge_source bill_charge_source_bill_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_charge_source
    ADD CONSTRAINT bill_charge_source_bill_item_id_fkey FOREIGN KEY (bill_item_id) REFERENCES public.bill_item(item_id) ON DELETE SET NULL;


--
-- Name: bill_charge_source bill_charge_source_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_charge_source
    ADD CONSTRAINT bill_charge_source_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: bill_item bill_item_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_item
    ADD CONSTRAINT bill_item_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id);


--
-- Name: bill bill_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill
    ADD CONSTRAINT bill_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: bill_pharmacy_sale bill_pharmacy_sale_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_pharmacy_sale
    ADD CONSTRAINT bill_pharmacy_sale_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE CASCADE;


--
-- Name: bill_pharmacy_sale bill_pharmacy_sale_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_pharmacy_sale
    ADD CONSTRAINT bill_pharmacy_sale_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: bill_pharmacy_sale bill_pharmacy_sale_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_pharmacy_sale
    ADD CONSTRAINT bill_pharmacy_sale_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.pharmacy_sale(sale_id) ON DELETE CASCADE;


--
-- Name: bill_pharmacy_sale bill_pharmacy_sale_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_pharmacy_sale
    ADD CONSTRAINT bill_pharmacy_sale_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.staff(staff_id);


--
-- Name: bill bill_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill
    ADD CONSTRAINT bill_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: cashier_audit_event cashier_audit_event_actor_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_audit_event
    ADD CONSTRAINT cashier_audit_event_actor_staff_id_fkey FOREIGN KEY (actor_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: cashier_audit_event cashier_audit_event_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_audit_event
    ADD CONSTRAINT cashier_audit_event_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE SET NULL;


--
-- Name: cashier_audit_event cashier_audit_event_cashier_payment_txn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_audit_event
    ADD CONSTRAINT cashier_audit_event_cashier_payment_txn_id_fkey FOREIGN KEY (cashier_payment_txn_id) REFERENCES public.cashier_payment_txn(cashier_payment_txn_id) ON DELETE SET NULL;


--
-- Name: cashier_audit_event cashier_audit_event_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_audit_event
    ADD CONSTRAINT cashier_audit_event_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE SET NULL;


--
-- Name: cashier_idempotency cashier_idempotency_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_idempotency
    ADD CONSTRAINT cashier_idempotency_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE CASCADE;


--
-- Name: cashier_idempotency cashier_idempotency_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_idempotency
    ADD CONSTRAINT cashier_idempotency_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: cashier_payment_allocation cashier_payment_allocation_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_allocation
    ADD CONSTRAINT cashier_payment_allocation_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE CASCADE;


--
-- Name: cashier_payment_allocation cashier_payment_allocation_cashier_payment_txn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_allocation
    ADD CONSTRAINT cashier_payment_allocation_cashier_payment_txn_id_fkey FOREIGN KEY (cashier_payment_txn_id) REFERENCES public.cashier_payment_txn(cashier_payment_txn_id) ON DELETE CASCADE;


--
-- Name: cashier_payment_allocation cashier_payment_allocation_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_allocation
    ADD CONSTRAINT cashier_payment_allocation_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.pharmacy_sale(sale_id) ON DELETE CASCADE;


--
-- Name: cashier_payment_txn cashier_payment_txn_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_txn
    ADD CONSTRAINT cashier_payment_txn_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE CASCADE;


--
-- Name: cashier_payment_txn cashier_payment_txn_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_txn
    ADD CONSTRAINT cashier_payment_txn_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.staff(staff_id);


--
-- Name: cashier_payment_txn cashier_payment_txn_reversed_from_txn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_txn
    ADD CONSTRAINT cashier_payment_txn_reversed_from_txn_id_fkey FOREIGN KEY (reversed_from_txn_id) REFERENCES public.cashier_payment_txn(cashier_payment_txn_id);


--
-- Name: cashier_payment_txn cashier_payment_txn_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_payment_txn
    ADD CONSTRAINT cashier_payment_txn_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE SET NULL;


--
-- Name: cashier_settlement_draft cashier_settlement_draft_applied_cashier_payment_txn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_settlement_draft
    ADD CONSTRAINT cashier_settlement_draft_applied_cashier_payment_txn_id_fkey FOREIGN KEY (applied_cashier_payment_txn_id) REFERENCES public.cashier_payment_txn(cashier_payment_txn_id);


--
-- Name: cashier_settlement_draft cashier_settlement_draft_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_settlement_draft
    ADD CONSTRAINT cashier_settlement_draft_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id) ON DELETE CASCADE;


--
-- Name: cashier_settlement_draft cashier_settlement_draft_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_settlement_draft
    ADD CONSTRAINT cashier_settlement_draft_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: cashier_settlement_draft cashier_settlement_draft_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_settlement_draft
    ADD CONSTRAINT cashier_settlement_draft_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE SET NULL;


--
-- Name: cashier_shift cashier_shift_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_shift
    ADD CONSTRAINT cashier_shift_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.staff(staff_id);


--
-- Name: cashier_shift cashier_shift_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashier_shift
    ADD CONSTRAINT cashier_shift_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id);


--
-- Name: current_pregnancy current_pregnancy_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.current_pregnancy
    ADD CONSTRAINT current_pregnancy_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: current_pregnancy current_pregnancy_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.current_pregnancy
    ADD CONSTRAINT current_pregnancy_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: doctor_attendance doctor_attendance_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_attendance
    ADD CONSTRAINT doctor_attendance_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.staff(staff_id);


--
-- Name: doctor_attendance doctor_attendance_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_attendance
    ADD CONSTRAINT doctor_attendance_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: doctor_attendance doctor_attendance_roster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_attendance
    ADD CONSTRAINT doctor_attendance_roster_id_fkey FOREIGN KEY (roster_id) REFERENCES public.staff_roster_assignments(roster_id) ON DELETE SET NULL;


--
-- Name: doctor_encounter_note doctor_encounter_note_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_encounter_note
    ADD CONSTRAINT doctor_encounter_note_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id);


--
-- Name: doctor_encounter_note doctor_encounter_note_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_encounter_note
    ADD CONSTRAINT doctor_encounter_note_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id) ON DELETE CASCADE;


--
-- Name: doctor_encounter_note doctor_encounter_note_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_encounter_note
    ADD CONSTRAINT doctor_encounter_note_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE CASCADE;


--
-- Name: doctor_order doctor_order_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_order
    ADD CONSTRAINT doctor_order_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: doctor_order doctor_order_ordered_by_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_order
    ADD CONSTRAINT doctor_order_ordered_by_doctor_id_fkey FOREIGN KEY (ordered_by_doctor_id) REFERENCES public.doctor(doctor_id);


--
-- Name: doctor_security_sessions doctor_security_sessions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_security_sessions
    ADD CONSTRAINT doctor_security_sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: employee_allowance employee_allowance_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_allowance
    ADD CONSTRAINT employee_allowance_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: employee_allowance employee_allowance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_allowance
    ADD CONSTRAINT employee_allowance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: employee_compensation_profile employee_compensation_profile_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_compensation_profile
    ADD CONSTRAINT employee_compensation_profile_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: employee_compensation_profile employee_compensation_profile_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_compensation_profile
    ADD CONSTRAINT employee_compensation_profile_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: employee_credential_events employee_credential_events_actor_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_events
    ADD CONSTRAINT employee_credential_events_actor_staff_id_fkey FOREIGN KEY (actor_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: employee_credential_events employee_credential_events_credential_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credential_events
    ADD CONSTRAINT employee_credential_events_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.employee_credentials(credential_id) ON DELETE CASCADE;


--
-- Name: employee_credentials employee_credentials_credential_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials
    ADD CONSTRAINT employee_credentials_credential_type_id_fkey FOREIGN KEY (credential_type_id) REFERENCES public.employee_credential_types(credential_type_id) ON DELETE RESTRICT;


--
-- Name: employee_credentials employee_credentials_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials
    ADD CONSTRAINT employee_credentials_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: employee_credentials employee_credentials_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials
    ADD CONSTRAINT employee_credentials_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_credentials employee_credentials_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials
    ADD CONSTRAINT employee_credentials_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_credentials employee_credentials_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_credentials
    ADD CONSTRAINT employee_credentials_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: employee_document_requirements employee_document_requirements_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_requirements
    ADD CONSTRAINT employee_document_requirements_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.employee_document_types(document_type_id) ON DELETE CASCADE;


--
-- Name: employee_document_reviews employee_document_reviews_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_reviews
    ADD CONSTRAINT employee_document_reviews_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.employee_documents(document_id) ON DELETE CASCADE;


--
-- Name: employee_document_reviews employee_document_reviews_reviewer_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_reviews
    ADD CONSTRAINT employee_document_reviews_reviewer_staff_id_fkey FOREIGN KEY (reviewer_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: employee_document_reviews employee_document_reviews_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_reviews
    ADD CONSTRAINT employee_document_reviews_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.employee_document_versions(version_id) ON DELETE SET NULL;


--
-- Name: employee_document_versions employee_document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_versions
    ADD CONSTRAINT employee_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.employee_documents(document_id) ON DELETE CASCADE;


--
-- Name: employee_document_versions employee_document_versions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_document_versions
    ADD CONSTRAINT employee_document_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_documents employee_documents_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.employee_document_types(document_type_id) ON DELETE RESTRICT;


--
-- Name: employee_documents employee_documents_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_documents employee_documents_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_lifecycle_events employee_lifecycle_events_actor_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_events
    ADD CONSTRAINT employee_lifecycle_events_actor_staff_id_fkey FOREIGN KEY (actor_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: employee_lifecycle_events employee_lifecycle_events_lifecycle_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_events
    ADD CONSTRAINT employee_lifecycle_events_lifecycle_run_id_fkey FOREIGN KEY (lifecycle_run_id) REFERENCES public.employee_lifecycle_runs(lifecycle_run_id) ON DELETE CASCADE;


--
-- Name: employee_lifecycle_events employee_lifecycle_events_lifecycle_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_events
    ADD CONSTRAINT employee_lifecycle_events_lifecycle_task_id_fkey FOREIGN KEY (lifecycle_task_id) REFERENCES public.employee_lifecycle_tasks(lifecycle_task_id) ON DELETE CASCADE;


--
-- Name: employee_lifecycle_runs employee_lifecycle_runs_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_runs
    ADD CONSTRAINT employee_lifecycle_runs_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: employee_lifecycle_runs employee_lifecycle_runs_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_runs
    ADD CONSTRAINT employee_lifecycle_runs_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_lifecycle_runs employee_lifecycle_runs_lifecycle_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_runs
    ADD CONSTRAINT employee_lifecycle_runs_lifecycle_template_id_fkey FOREIGN KEY (lifecycle_template_id) REFERENCES public.employee_lifecycle_templates(lifecycle_template_id) ON DELETE SET NULL;


--
-- Name: employee_lifecycle_runs employee_lifecycle_runs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_runs
    ADD CONSTRAINT employee_lifecycle_runs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: employee_lifecycle_tasks employee_lifecycle_tasks_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks
    ADD CONSTRAINT employee_lifecycle_tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(staff_id);


--
-- Name: employee_lifecycle_tasks employee_lifecycle_tasks_evidence_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks
    ADD CONSTRAINT employee_lifecycle_tasks_evidence_document_id_fkey FOREIGN KEY (evidence_document_id) REFERENCES public.employee_documents(document_id) ON DELETE SET NULL;


--
-- Name: employee_lifecycle_tasks employee_lifecycle_tasks_lifecycle_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks
    ADD CONSTRAINT employee_lifecycle_tasks_lifecycle_run_id_fkey FOREIGN KEY (lifecycle_run_id) REFERENCES public.employee_lifecycle_runs(lifecycle_run_id) ON DELETE CASCADE;


--
-- Name: employee_lifecycle_tasks employee_lifecycle_tasks_lifecycle_template_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks
    ADD CONSTRAINT employee_lifecycle_tasks_lifecycle_template_task_id_fkey FOREIGN KEY (lifecycle_template_task_id) REFERENCES public.employee_lifecycle_template_tasks(lifecycle_template_task_id) ON DELETE SET NULL;


--
-- Name: employee_lifecycle_tasks employee_lifecycle_tasks_owner_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_tasks
    ADD CONSTRAINT employee_lifecycle_tasks_owner_staff_id_fkey FOREIGN KEY (owner_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: employee_lifecycle_template_tasks employee_lifecycle_template_task_requires_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_template_tasks
    ADD CONSTRAINT employee_lifecycle_template_task_requires_document_type_id_fkey FOREIGN KEY (requires_document_type_id) REFERENCES public.employee_document_types(document_type_id) ON DELETE SET NULL;


--
-- Name: employee_lifecycle_template_tasks employee_lifecycle_template_tasks_lifecycle_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_template_tasks
    ADD CONSTRAINT employee_lifecycle_template_tasks_lifecycle_template_id_fkey FOREIGN KEY (lifecycle_template_id) REFERENCES public.employee_lifecycle_templates(lifecycle_template_id) ON DELETE CASCADE;


--
-- Name: employee_lifecycle_templates employee_lifecycle_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_lifecycle_templates
    ADD CONSTRAINT employee_lifecycle_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: fbr_invoice_submission fbr_invoice_submission_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fbr_invoice_submission
    ADD CONSTRAINT fbr_invoice_submission_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id);


--
-- Name: finance_asset_purchase finance_asset_purchase_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_asset_purchase
    ADD CONSTRAINT finance_asset_purchase_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: finance_expense_entry finance_expense_entry_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_entry
    ADD CONSTRAINT finance_expense_entry_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: intake_output intake_output_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_output
    ADD CONSTRAINT intake_output_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: intake_output intake_output_recorded_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_output
    ADD CONSTRAINT intake_output_recorded_by_staff_id_fkey FOREIGN KEY (recorded_by_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: ip_advance ip_advance_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_advance
    ADD CONSTRAINT ip_advance_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: ip_advance ip_advance_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_advance
    ADD CONSTRAINT ip_advance_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.staff(staff_id);


--
-- Name: ip_charge ip_charge_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_charge
    ADD CONSTRAINT ip_charge_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: ip_charge ip_charge_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_charge
    ADD CONSTRAINT ip_charge_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.staff(staff_id);


--
-- Name: ip_final_bill ip_final_bill_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_final_bill
    ADD CONSTRAINT ip_final_bill_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: ip_final_bill ip_final_bill_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_final_bill
    ADD CONSTRAINT ip_final_bill_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_order lab_order_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_order lab_order_ordered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES public.doctor(doctor_id);


--
-- Name: lab_order lab_order_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_order lab_order_results_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_results_entered_by_fkey FOREIGN KEY (results_entered_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_order lab_order_sample_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_sample_collected_by_fkey FOREIGN KEY (sample_collected_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_order lab_order_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_test(test_id);


--
-- Name: lab_order lab_order_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order
    ADD CONSTRAINT lab_order_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: lab_result_approvals lab_result_approvals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_approvals
    ADD CONSTRAINT lab_result_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_result_approvals lab_result_approvals_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_approvals
    ADD CONSTRAINT lab_result_approvals_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lab_order(order_id);


--
-- Name: lab_result lab_result_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result
    ADD CONSTRAINT lab_result_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lab_order(order_id);


--
-- Name: lab_result lab_result_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result
    ADD CONSTRAINT lab_result_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_test_parameters lab_test_parameters_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_parameters
    ADD CONSTRAINT lab_test_parameters_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_test(test_id);


--
-- Name: lab_test_results lab_test_results_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results
    ADD CONSTRAINT lab_test_results_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_test_results lab_test_results_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results
    ADD CONSTRAINT lab_test_results_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lab_order(order_id);


--
-- Name: lab_test_results lab_test_results_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results
    ADD CONSTRAINT lab_test_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lab_test_parameters(parameter_id);


--
-- Name: lab_test_results lab_test_results_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_results
    ADD CONSTRAINT lab_test_results_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.staff(staff_id);


--
-- Name: leave_employee_quota_override leave_employee_quota_override_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_employee_quota_override
    ADD CONSTRAINT leave_employee_quota_override_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: leave_employee_quota_override leave_employee_quota_override_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_employee_quota_override
    ADD CONSTRAINT leave_employee_quota_override_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT;


--
-- Name: leave_employee_quota_override leave_employee_quota_override_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_employee_quota_override
    ADD CONSTRAINT leave_employee_quota_override_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: leave_role_quota leave_role_quota_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_role_quota
    ADD CONSTRAINT leave_role_quota_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT;


--
-- Name: medication_administration medication_administration_administered_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_administered_by_staff_id_fkey FOREIGN KEY (administered_by_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: medication_administration medication_administration_med_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_med_order_id_fkey FOREIGN KEY (med_order_id) REFERENCES public.medication_order(med_order_id) ON DELETE CASCADE;


--
-- Name: medication_order medication_order_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_order
    ADD CONSTRAINT medication_order_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: medication_order medication_order_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_order
    ADD CONSTRAINT medication_order_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.doctor_order(order_id) ON DELETE CASCADE;


--
-- Name: medicine_batch medicine_batch_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_batch
    ADD CONSTRAINT medicine_batch_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: medicine_batch medicine_batch_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_batch
    ADD CONSTRAINT medicine_batch_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(party_id);


--
-- Name: medicine medicine_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine
    ADD CONSTRAINT medicine_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.medicine_category(category_id);


--
-- Name: medicine medicine_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine
    ADD CONSTRAINT medicine_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.medicine_form(form_id);


--
-- Name: medicine medicine_manufacturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine
    ADD CONSTRAINT medicine_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.medicine_manufacturer(manufacturer_id);


--
-- Name: medicine_purchase medicine_purchase_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase
    ADD CONSTRAINT medicine_purchase_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: medicine_purchase_detail medicine_purchase_detail_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase_detail
    ADD CONSTRAINT medicine_purchase_detail_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batch(batch_id);


--
-- Name: medicine_purchase_detail medicine_purchase_detail_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase_detail
    ADD CONSTRAINT medicine_purchase_detail_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: medicine_purchase_detail medicine_purchase_detail_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase_detail
    ADD CONSTRAINT medicine_purchase_detail_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.medicine_purchase(purchase_id);


--
-- Name: medicine_purchase medicine_purchase_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_purchase
    ADD CONSTRAINT medicine_purchase_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(party_id);


--
-- Name: medicine_transaction medicine_transaction_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batch(batch_id);


--
-- Name: medicine_transaction medicine_transaction_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: medicine_transaction medicine_transaction_ref_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_ref_purchase_id_fkey FOREIGN KEY (ref_purchase_id) REFERENCES public.medicine_purchase(purchase_id);


--
-- Name: medicine_transaction medicine_transaction_ref_purchase_return_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_ref_purchase_return_fkey FOREIGN KEY (ref_purchase_return) REFERENCES public.purchase_return(return_id);


--
-- Name: medicine_transaction medicine_transaction_ref_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_ref_sale_id_fkey FOREIGN KEY (ref_sale_id) REFERENCES public.pharmacy_sale(sale_id);


--
-- Name: medicine_transaction medicine_transaction_ref_sale_return_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicine_transaction
    ADD CONSTRAINT medicine_transaction_ref_sale_return_fkey FOREIGN KEY (ref_sale_return) REFERENCES public.sale_return(return_id);


--
-- Name: menstrual_history menstrual_history_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menstrual_history
    ADD CONSTRAINT menstrual_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: nursing_note nursing_note_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_note
    ADD CONSTRAINT nursing_note_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id) ON DELETE CASCADE;


--
-- Name: nursing_note nursing_note_author_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_note
    ADD CONSTRAINT nursing_note_author_staff_id_fkey FOREIGN KEY (author_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: obstetric_history obstetric_history_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obstetric_history
    ADD CONSTRAINT obstetric_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: para_details para_details_obstetric_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.para_details
    ADD CONSTRAINT para_details_obstetric_history_id_fkey FOREIGN KEY (obstetric_history_id) REFERENCES public.obstetric_history(obstetric_history_id);


--
-- Name: party_payment party_payment_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_payment
    ADD CONSTRAINT party_payment_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(party_id) ON DELETE CASCADE;


--
-- Name: patient_allergy patient_allergy_noted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_allergy
    ADD CONSTRAINT patient_allergy_noted_by_fkey FOREIGN KEY (noted_by) REFERENCES public.staff(staff_id);


--
-- Name: patient_allergy patient_allergy_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_allergy
    ADD CONSTRAINT patient_allergy_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id) ON DELETE CASCADE;


--
-- Name: patient_vitals patient_vitals_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT patient_vitals_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admission(admission_id);


--
-- Name: patient_vitals patient_vitals_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT patient_vitals_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE CASCADE;


--
-- Name: payroll_line_item payroll_line_item_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_line_item
    ADD CONSTRAINT payroll_line_item_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: payroll_line_item payroll_line_item_payroll_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_line_item
    ADD CONSTRAINT payroll_line_item_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_run(payroll_run_id) ON DELETE CASCADE;


--
-- Name: payroll_line_item payroll_line_item_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_line_item
    ADD CONSTRAINT payroll_line_item_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: payroll_run payroll_run_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run
    ADD CONSTRAINT payroll_run_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.staff(staff_id);


--
-- Name: payroll_run payroll_run_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run
    ADD CONSTRAINT payroll_run_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.staff(staff_id);


--
-- Name: pharmacy_sale pharmacy_sale_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bill(bill_id);


--
-- Name: pharmacy_sale pharmacy_sale_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.pharmacy_customer(customer_id);


--
-- Name: pharmacy_sale_detail pharmacy_sale_detail_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale_detail
    ADD CONSTRAINT pharmacy_sale_detail_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batch(batch_id);


--
-- Name: pharmacy_sale_detail pharmacy_sale_detail_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale_detail
    ADD CONSTRAINT pharmacy_sale_detail_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: pharmacy_sale_detail pharmacy_sale_detail_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale_detail
    ADD CONSTRAINT pharmacy_sale_detail_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.pharmacy_sale(sale_id);


--
-- Name: pharmacy_sale pharmacy_sale_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.staff(staff_id);


--
-- Name: pharmacy_sale pharmacy_sale_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescription(prescription_id);


--
-- Name: pharmacy_sale pharmacy_sale_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.staff(staff_id);


--
-- Name: pharmacy_sale pharmacy_sale_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_sale
    ADD CONSTRAINT pharmacy_sale_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: pos_audit_log pos_audit_log_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.pharmacy_sale(sale_id);


--
-- Name: pos_audit_log pos_audit_log_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id);


--
-- Name: pos_held_transaction_detail pos_held_transaction_detail_hold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction_detail
    ADD CONSTRAINT pos_held_transaction_detail_hold_id_fkey FOREIGN KEY (hold_id) REFERENCES public.pos_held_transaction(hold_id) ON DELETE CASCADE;


--
-- Name: pos_held_transaction_detail pos_held_transaction_detail_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction_detail
    ADD CONSTRAINT pos_held_transaction_detail_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: pos_held_transaction pos_held_transaction_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_held_transaction
    ADD CONSTRAINT pos_held_transaction_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id);


--
-- Name: pos_session pos_session_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_session
    ADD CONSTRAINT pos_session_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id);


--
-- Name: prescription prescription_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription
    ADD CONSTRAINT prescription_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id);


--
-- Name: prescription_fulfillment_action prescription_fulfillment_action_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fulfillment_action
    ADD CONSTRAINT prescription_fulfillment_action_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.staff(staff_id);


--
-- Name: prescription_fulfillment_action prescription_fulfillment_action_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fulfillment_action
    ADD CONSTRAINT prescription_fulfillment_action_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id) ON DELETE CASCADE;


--
-- Name: prescription_fulfillment_action prescription_fulfillment_action_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fulfillment_action
    ADD CONSTRAINT prescription_fulfillment_action_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescription(prescription_id) ON DELETE CASCADE;


--
-- Name: prescription_fulfillment_action prescription_fulfillment_action_prescription_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fulfillment_action
    ADD CONSTRAINT prescription_fulfillment_action_prescription_medicine_id_fkey FOREIGN KEY (prescription_medicine_id) REFERENCES public.prescription_medicines(prescription_medicine_id) ON DELETE CASCADE;


--
-- Name: prescription_fulfillment_action prescription_fulfillment_action_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fulfillment_action
    ADD CONSTRAINT prescription_fulfillment_action_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE CASCADE;


--
-- Name: prescription_medicines prescription_medicines_dispensed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_medicines
    ADD CONSTRAINT prescription_medicines_dispensed_by_fkey FOREIGN KEY (dispensed_by) REFERENCES public.staff(staff_id);


--
-- Name: prescription_medicines prescription_medicines_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_medicines
    ADD CONSTRAINT prescription_medicines_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: prescription_medicines prescription_medicines_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_medicines
    ADD CONSTRAINT prescription_medicines_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescription(prescription_id);


--
-- Name: prescription prescription_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription
    ADD CONSTRAINT prescription_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id);


--
-- Name: purchase_return purchase_return_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return
    ADD CONSTRAINT purchase_return_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: purchase_return_detail purchase_return_detail_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_detail
    ADD CONSTRAINT purchase_return_detail_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batch(batch_id);


--
-- Name: purchase_return_detail purchase_return_detail_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_detail
    ADD CONSTRAINT purchase_return_detail_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: purchase_return_detail purchase_return_detail_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_detail
    ADD CONSTRAINT purchase_return_detail_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.purchase_return(return_id);


--
-- Name: purchase_return purchase_return_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return
    ADD CONSTRAINT purchase_return_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.medicine_purchase(purchase_id);


--
-- Name: room room_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.ward(ward_id) ON DELETE CASCADE;


--
-- Name: sale_return sale_return_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return
    ADD CONSTRAINT sale_return_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: sale_return_detail sale_return_detail_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return_detail
    ADD CONSTRAINT sale_return_detail_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.medicine_batch(batch_id);


--
-- Name: sale_return_detail sale_return_detail_medicine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return_detail
    ADD CONSTRAINT sale_return_detail_medicine_id_fkey FOREIGN KEY (medicine_id) REFERENCES public.medicine(medicine_id);


--
-- Name: sale_return_detail sale_return_detail_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return_detail
    ADD CONSTRAINT sale_return_detail_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sale_return(return_id);


--
-- Name: sale_return sale_return_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_return
    ADD CONSTRAINT sale_return_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.pharmacy_sale(sale_id);


--
-- Name: staff_attendance staff_attendance_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.staff(staff_id);


--
-- Name: staff_attendance staff_attendance_roster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_roster_id_fkey FOREIGN KEY (roster_id) REFERENCES public.staff_roster_assignments(roster_id) ON DELETE SET NULL;


--
-- Name: staff_attendance staff_attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_leave_approvals staff_leave_approvals_approver_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_approvals
    ADD CONSTRAINT staff_leave_approvals_approver_staff_id_fkey FOREIGN KEY (approver_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: staff_leave_approvals staff_leave_approvals_leave_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_approvals
    ADD CONSTRAINT staff_leave_approvals_leave_request_id_fkey FOREIGN KEY (leave_request_id) REFERENCES public.staff_leave_requests(leave_request_id) ON DELETE CASCADE;


--
-- Name: staff_leave_balances staff_leave_balances_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: staff_leave_balances staff_leave_balances_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT;


--
-- Name: staff_leave_balances staff_leave_balances_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_balances
    ADD CONSTRAINT staff_leave_balances_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_leave_requests staff_leave_requests_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: staff_leave_requests staff_leave_requests_final_approver_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_final_approver_fkey FOREIGN KEY (final_approver) REFERENCES public.staff(staff_id);


--
-- Name: staff_leave_requests staff_leave_requests_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT;


--
-- Name: staff_leave_requests staff_leave_requests_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_permission_audit staff_permission_audit_actor_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_audit
    ADD CONSTRAINT staff_permission_audit_actor_staff_id_fkey FOREIGN KEY (actor_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: staff_permission_audit staff_permission_audit_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_audit
    ADD CONSTRAINT staff_permission_audit_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.staff_permission_policies(policy_id) ON DELETE SET NULL;


--
-- Name: staff_permission_policies staff_permission_policies_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_policies
    ADD CONSTRAINT staff_permission_policies_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.staff(staff_id);


--
-- Name: staff_permission_policies staff_permission_policies_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_policies
    ADD CONSTRAINT staff_permission_policies_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.staff_roles(role_id) ON DELETE CASCADE;


--
-- Name: staff_permission_policies staff_permission_policies_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permission_policies
    ADD CONSTRAINT staff_permission_policies_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff staff_reporting_manager_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_reporting_manager_staff_id_fkey FOREIGN KEY (reporting_manager_staff_id) REFERENCES public.staff(staff_id);


--
-- Name: staff_role_assignments staff_role_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_role_assignments
    ADD CONSTRAINT staff_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.staff(staff_id);


--
-- Name: staff_role_assignments staff_role_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_role_assignments
    ADD CONSTRAINT staff_role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.staff_roles(role_id) ON DELETE RESTRICT;


--
-- Name: staff_role_assignments staff_role_assignments_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_role_assignments
    ADD CONSTRAINT staff_role_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_roster_assignments staff_roster_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roster_assignments
    ADD CONSTRAINT staff_roster_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.staff(staff_id);


--
-- Name: staff_roster_assignments staff_roster_assignments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roster_assignments
    ADD CONSTRAINT staff_roster_assignments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;


--
-- Name: staff_roster_assignments staff_roster_assignments_shift_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roster_assignments
    ADD CONSTRAINT staff_roster_assignments_shift_template_id_fkey FOREIGN KEY (shift_template_id) REFERENCES public.staff_shift_templates(shift_template_id) ON DELETE RESTRICT;


--
-- Name: staff_roster_assignments staff_roster_assignments_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roster_assignments
    ADD CONSTRAINT staff_roster_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_security_sessions staff_security_sessions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_security_sessions
    ADD CONSTRAINT staff_security_sessions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staff_id) ON DELETE CASCADE;


--
-- Name: staff_shift_templates staff_shift_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shift_templates
    ADD CONSTRAINT staff_shift_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(staff_id);


--
-- Name: visit visit_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT visit_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor(doctor_id);


--
-- Name: visit visit_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit
    ADD CONSTRAINT visit_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(patient_id);


--
-- Name: visit_status_history visit_status_history_updated_by_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_status_history
    ADD CONSTRAINT visit_status_history_updated_by_doctor_fkey FOREIGN KEY (updated_by_doctor) REFERENCES public.doctor(doctor_id);


--
-- Name: visit_status_history visit_status_history_updated_by_staff_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_status_history
    ADD CONSTRAINT visit_status_history_updated_by_staff_fkey FOREIGN KEY (updated_by_staff) REFERENCES public.staff(staff_id);


--
-- Name: visit_status_history visit_status_history_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_status_history
    ADD CONSTRAINT visit_status_history_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit(visit_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FeKSMj6DNWQU9mcuSImzNQfO0Ea3JBXXGbJTzij4qpCLX8o5USOo8dyqVoI0hL7

