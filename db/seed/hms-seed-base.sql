--
-- PostgreSQL database dump
--

\restrict TlFAP4q3uQX5zntOx8YftIUA4jL1kB3C6ebG1bjDvOdxzQwJvghwGG94H5zVkiZ

-- Dumped from database version 18.4
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
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


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


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


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
-- Name: bill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill (
    bill_id integer NOT NULL,
    patient_id integer NOT NULL,
    visit_id integer NOT NULL,
    total_amount numeric(10,2),
    payment_status character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bill_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('Paid'::character varying)::text, ('Unpaid'::character varying)::text, ('Partial'::character varying)::text])))
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    cashier_payment_allocation_id bigint CONSTRAINT cashier_payment_allocation_cashier_payment_allocation__not_null NOT NULL,
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
    lifecycle_template_task_id bigint CONSTRAINT employee_lifecycle_template_lifecycle_template_task_id_not_null NOT NULL,
    lifecycle_template_id bigint CONSTRAINT employee_lifecycle_template_task_lifecycle_template_id_not_null NOT NULL,
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
-- Name: invoice_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


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
    CONSTRAINT lab_order_status_check CHECK (((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Performed'::character varying)::text, ('Completed'::character varying)::text]))),
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
    form_id integer
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
    visit_id integer NOT NULL,
    blood_pressure character varying(20),
    heart_rate integer,
    temperature integer,
    weight integer,
    height integer,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blood_group character varying(20),
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
    prescription_medicine_id integer CONSTRAINT prescription_fulfillment_acti_prescription_medicine_id_not_null NOT NULL,
    prescription_id integer NOT NULL,
    visit_id integer NOT NULL,
    patient_id integer NOT NULL,
    available_quantity_at_action integer DEFAULT 0 CONSTRAINT prescription_fulfillment_ac_available_quantity_at_acti_not_null NOT NULL,
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
-- Name: sale_return; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_return (
    return_id integer NOT NULL,
    sale_id integer NOT NULL,
    reason text,
    return_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL
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
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: attendance_regularization_requests regularization_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_regularization_requests ALTER COLUMN regularization_id SET DEFAULT nextval('public.attendance_regularization_requests_regularization_id_seq'::regclass);


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
-- Name: finance_asset_purchase asset_purchase_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_asset_purchase ALTER COLUMN asset_purchase_id SET DEFAULT nextval('public.finance_asset_purchase_asset_purchase_id_seq'::regclass);


--
-- Name: finance_expense_entry expense_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_expense_entry ALTER COLUMN expense_id SET DEFAULT nextval('public.finance_expense_entry_expense_id_seq'::regclass);


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
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: allowance_type_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowance_type_master (code, label, description, taxable, created_at, updated_at) FROM stdin;
transport	Transport Allowance	Recurring or ad-hoc transport support	t	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
meal	Meal Allowance	Meal subsidy or food support	t	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
housing	Housing Allowance	Rent or housing support	t	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
medical	Medical Allowance	General medical support for staff	f	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
communication	Communication Allowance	Phone/internet reimbursement	t	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
other	Other Allowance	Any custom allowance type	t	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
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
a162da91-af22-4b4b-ab8a-ff4222c26cbf	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:39.415094
3399b00a-0c86-45a6-a7bd-3e6df5b8659f	\N	Login success	auth	DOC002	{"ip": "182.190.129.67", "role": "Doctor", "outcome": "success", "userCode": "DOC002", "userName": "Dr. Fatima Ali", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:19:00.967885
b0bdc206-c23c-40a2-9cd2-6f31d88a3344	1	Logout	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-19 17:18:50.936736
804a24c1-59fb-4cb3-90ac-ce8522f54df3	6	Login success	auth	STF006	{"ip": "182.190.129.67", "role": "Admin", "outcome": "success", "userCode": "STF006", "userName": "Bilal Raza", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-20 06:30:40.941931
c3ded64d-e572-4050-b91e-f57a37a751e4	6	Attendance check-in marked	staff_attendance	3c2ca877-84bb-43fe-b621-34da3ee762b3	{"date": "2026-04-20", "event": "check_in", "source": "self", "message": "Attendance captured as unscheduled (no roster assigned).", "userCode": "STF006", "accountType": "staff", "derivedStatus": "unscheduled"}	\N	2026-04-20 06:30:56.527159
7606d11d-5e24-4539-8b03-25cd3783ecb7	1	Login success	auth	STF001	{"ip": "182.190.129.67", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}	\N	2026-04-22 14:40:34.236713
7b8af9b7-f5f4-4021-bd6c-4fa788c2f260	1	Login success	auth	STF001	{"ip": "::1", "role": "Receptionist", "outcome": "success", "userCode": "STF001", "userName": "Sara Ahmed", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"}	\N	2026-05-23 13:25:14.21654
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
37	6	43	0.00	Unpaid	2026-03-05 15:37:56.284362
38	1	44	0.00	Unpaid	2026-03-14 05:06:52.215856
39	6	45	0.00	Unpaid	2026-03-14 06:22:32.7918
40	6	46	0.00	Unpaid	2026-03-18 09:43:42.819438
41	1	47	0.00	Unpaid	2026-03-18 09:44:07.058623
42	3	48	0.00	Unpaid	2026-03-18 14:30:17.126949
43	6	51	0.00	Unpaid	2026-03-19 03:17:38.430736
44	1	52	0.00	Unpaid	2026-03-19 03:18:04.235656
45	2	53	0.00	Unpaid	2026-03-19 03:18:28.080864
46	6	54	0.00	Unpaid	2026-03-21 13:41:51.443668
47	1	55	0.00	Unpaid	2026-03-21 19:37:21.129601
48	6	56	0.00	Unpaid	2026-03-22 03:51:43.825294
49	1	57	0.00	Unpaid	2026-03-22 03:52:00.932678
50	10	58	0.00	Unpaid	2026-03-23 03:34:04.592437
51	11	59	0.00	Unpaid	2026-03-23 11:56:20.653795
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
\.


--
-- Data for Name: bill_charge_source; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_charge_source (bill_charge_source_id, bill_id, bill_item_id, source_type, source_id, amount, meta_json, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: bill_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_item (item_id, bill_id, description, amount, quantity, created_at) FROM stdin;
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
\.


--
-- Data for Name: cashier_idempotency; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashier_idempotency (cashier_idempotency_id, idempotency_key, endpoint, bill_id, request_hash, response_json, status_code, created_by, created_at) FROM stdin;
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
1	DOC001	scrypt$18a5d9a5cacfefda7fae22e5925437e2$60bc8b3791f81535ee39f9161b560c8f7d04128db9a07a1452aad307bae8339f755f82834eba0ffd4eb48271daf11bc98eaf003a54cc795dd8c3f7e1e4c814ba	Dr. Ahmed Khan	Gynecology	MBBS, FCPS	1500.00	3000.00	03001230001	ahmed.khan@example.com	2026-02-06 11:42:40.173912	active	3	2026-04-08 09:19:47.145465	\N	2026-03-24 07:24:39.584513	2026-03-24 14:34:50.460504	\N	\N	f	8
2	DOC002	scrypt$a1107b7ae45b07baf92ff6c920195d7d$ef491ba16d4f339496a11873bd11a5200f5c41fea53d74e9397d63e5f08f0eb40ce309dde3314ef45284f835aeb2340fb080ecf432bbb07d4179657ecde0638b	Dr. Fatima Ali	Cardiology	MBBS, MD	2000.00	4000.00	03001230002	fatima.ali@example.com	2026-02-06 11:42:40.173912	active	0	\N	\N	2026-04-19 17:19:00.563007	2026-03-24 14:33:19.044785	\N	\N	f	1
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
-- Data for Name: finance_asset_purchase; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_asset_purchase (asset_purchase_id, purchase_date, asset_name, asset_category, amount, vendor_name, reference_no, useful_life_months, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: finance_expense_category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_expense_category (code, label, description, created_at, updated_at) FROM stdin;
utilities	Utilities	Electricity, water, internet and utility bills	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
inventory	Inventory	General inventory not tracked as medicine purchase	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
maintenance	Maintenance	Repairs and upkeep	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
rent	Rent	Facility rent and related charges	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
equipment_service	Equipment Service	Machine service and AMC costs	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
salary_related	Salary Related	Payroll-linked overhead costs	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
other	Other	Any uncategorized operating expense	2026-03-24 21:56:15.28611+05	2026-03-24 21:56:15.28611+05
\.


--
-- Data for Name: finance_expense_entry; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_expense_entry (expense_id, expense_date, category, subcategory, amount, vendor_name, reference_no, payment_mode, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: lab_order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lab_order (order_id, visit_id, test_id, ordered_by, performed_by, status, created_at, urgency, results_entered_at, results_entered_by, finalized_at, finalized_by) FROM stdin;
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
-- Data for Name: medicine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine (medicine_id, generic_name, brand_name, category, dosage_value, dosage_unit, form, created_at, barcode, sku, manufacturer, min_stock_level, max_stock_level, is_active, requires_prescription, search_vector, sub_unit, sub_units_per_unit, sub_unit_price, allow_sub_unit_sale, category_id, manufacturer_id, form_id) FROM stdin;
9	Azithromycin	Azomax	Antibiotic	250.00	mg	Capsule	2026-03-19 07:00:12.700101	HMS-AZOMAX-250	AZOMAX-250	Getz	12	300	t	t	'antibiot':3B 'azithromycin':1A 'azomax':2A	Blister	6	18.00	t	3	2	3
10	Loratadine	Claritek	Antihistamine	10.00	mg	Tablet	2026-03-19 07:00:12.700101	HMS-CLARITEK-10	CLARITEK-10	Abbott	8	200	t	f	'antihistamin':3B 'claritek':2A 'loratadin':1A	Strip	10	2.20	t	4	1	2
11	Esomeprazole	Nexum	Gastroprotective	20.00	mg	Capsule	2026-03-19 07:00:12.700101	HMS-NEXUM-20	NEXUM-20	GSK	10	250	t	f	'esomeprazol':1A 'gastroprotect':3B 'nexum':2A	Strip	10	5.50	t	2	3	3
12	Diphenhydramine HCl	Benadryl Cough	Antihistamines	12.50	mg/5ml	Syrup	2026-03-23 08:53:52.213396	300450123456	JNJ-BEN-SYP-150	Johnson & Johnson	5	100	t	f	'antihistamin':5B 'benadryl':3A 'cough':4A 'diphenhydramin':1A 'hcl':2A	\N	1	\N	f	8	5	4
2	Amoxicillin	Amoxil	Antibiotic	250.00	mg	Capsule	2026-02-06 11:42:40.173912	AMX001	MD-002	GSK	10	1000	t	f	'amoxicillin':1A 'amoxil':2A 'antibiot':3B	Blister	10	2.50	t	3	3	3
3	Cefixime	Suprax	Antibiotic	200.00	mg	Tablet	2026-02-06 11:42:40.173912	SUP001	MD-003	Getz	10	1000	t	f	'antibiot':3B 'cefixim':1A 'suprax':2A	Strip	10	4.00	t	3	2	2
4	Ibuprofen	Brufen	Analgesic	400.00	mg	Tablet	2026-02-06 11:42:40.173912	BRU001	MD-004	Abbott	10	1000	t	f	'analges':3B 'brufen':2A 'ibuprofen':1A	Strip	10	2.00	t	6	1	2
5	Metformin	Glucophage	Anti-diabetic	500.00	mg	Tablet	2026-02-06 11:42:40.173912	GLU001	MD-005	Searle	10	1000	t	f	'anti':4B 'anti-diabet':3B 'diabet':5B 'glucophag':2A 'metformin':1A	Blister	10	5.00	t	5	4	2
6	Omeprazole	Losec	Gastroprotective	20.00	mg	Capsule	2026-02-06 11:42:40.173912	LOS001	MD-006	Getz	10	1000	t	f	'gastroprotect':3B 'losec':2A 'omeprazol':1A	Strip	10	3.00	t	2	2	3
8	Cetirizine	Zyrtec	Antihistamine	10.00	mg	Tablet	2026-02-06 11:42:40.173912	ZYR001	MD-008	GSK	10	1000	t	f	'antihistamin':3B 'cetirizin':1A 'zyrtec':2A	Blister	10	1.80	t	4	3	2
1	Paracetamol	Panadol	Analgesic	500.00	mg	Tablet	2026-02-06 11:42:40.173912	PAN001	MD-001	GSK	10	1000	t	f	'analges':3B 'panadol':2A 'paracetamol':1A	Blister	10	1.50	t	6	3	2
7	Salbutamol	Ventolin	Bronchodilator	100.00	mcg	Inhaler	2026-02-06 11:42:40.173912	VEN001	MD-007	GSK	10	1000	t	f	'bronchodil':3B 'salbutamol':1A 'ventolin':2A	Inhaler	1	250.00	f	1	3	1
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
\.


--
-- Data for Name: medicine_form; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicine_form (form_id, name, is_active, created_at) FROM stdin;
1	Inhaler	t	2026-03-18 09:40:32.673948
2	Tablet	t	2026-03-18 09:40:32.673948
3	Capsule	t	2026-03-18 09:40:32.673948
4	Syrup	t	2026-03-23 08:37:56.34805
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
\.


--
-- Data for Name: menstrual_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menstrual_history (menstrual_history_id, patient_id, menarch_age, cycle_length_days, bleeding_days, menstrual_regular, contraception_history, gynecologic_surgeries, medical_conditions, menopause_status, notes) FROM stdin;
1	6	13	28	5	t	None	\N	\N	\N	Normal cycles
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
-- Data for Name: patient_vitals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patient_vitals (vital_id, visit_id, blood_pressure, heart_rate, temperature, weight, height, recorded_at, blood_group) FROM stdin;
1	1	120/80	72	99	65	165	2026-02-06 11:42:40.173912	A+
2	2	130/85	80	102	75	175	2026-02-06 11:42:40.173912	B+
3	3	110/70	85	98	82	180	2026-02-06 11:42:40.173912	O-
4	4	115/75	76	99	68	162	2026-02-06 11:42:40.173912	AB+
5	5	100/60	95	99	12	90	2026-02-06 11:42:40.173912	O+
6	6	120/80	72	98	65	165	2026-02-06 15:05:43.193527	O+
7	58	120/80	72	98	80	165	2026-03-23 03:35:41.273251	A+
8	61	120/80	80	100	90	200	2026-03-23 14:14:54.725363	O+
9	68	120/80	72	98	40	165	2026-04-02 11:11:12.807492	A+
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
1	Medixa	35HM+388, Sadaat Colony, Muzaffargarh	034567654321	\N	\N	Welcome to our Clinic	Get Well Soon	\N	\N	80mm	t	2026-02-06 11:42:40.173912
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
-- Data for Name: sale_return; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_return (return_id, sale_id, reason, return_timestamp, created_by) FROM stdin;
2	18	Customer return	2026-03-03 18:56:49.827934	1
3	19	Customer return	2026-03-03 18:57:15.725396	1
4	52	Customer return	2026-03-22 11:39:57.819273	1
5	53	Customer return	2026-03-22 11:44:57.477672	1
6	54	Customer return	2026-03-22 12:00:24.889467	1
7	57	Customer return	2026-03-22 13:58:15.739902	1
8	57	Customer return	2026-03-22 13:59:04.348619	1
9	56	Customer return	2026-03-22 14:08:15.569753	1
10	51	Customer return	2026-03-22 15:17:09.499964	1
11	28	Customer return	2026-03-22 15:23:09.052461	1
12	66	Customer return	2026-03-26 08:43:05.511385	1
13	71	Customer return	2026-04-02 11:37:50.674667	1
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
3	STF003	password123	Ayesha Malik	Lab_Technician	BS Lab Tech	03001110003	ayesha.malik@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	\N	2026-03-24 05:21:48.998992	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
5	STF005	password123	Hina Shah	Nurse	BSc Nursing	03001110005	hina.shah@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	\N	2026-03-24 05:21:48.998992	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
2	STF002	scrypt$6eb079bf20ad0c4d036bb87ff4e8d8cf$e284ae4c6b2af7df11477722b100684cb37506482d43052955e5027a094ec3b5452caca4a49133b68bc8994875b70f4d90de08a58f579b300ad178a065633778	Naveed Khan	Pharmacist	BPharm	03001110002	naveed.khan@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	2026-04-19 17:11:48.782706	2026-03-25 06:41:56.611343	\N	\N	f	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
7	ADM001	scrypt$b40abe367b8c49d709c84b4da6f9bcc9$d28491b39a2821cb9bfff7985b21af1c9a2fe4d4e79e256fd90a6a624d1df258e62b8a32c30fd2aadb7d1953603767a23c84ec947579cd5086859110ab678159	Muhammad Abdul Rehman	Admin	\N	+923086784845	saadadil2264326@gmail.com	2026-03-24 06:10:25.038712	active	\N	\N	0	\N	\N	\N	2026-03-24 06:10:25.038712	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Administration	Admin Officer	\N			\N	\N	{}
6	STF006	scrypt$759f7a9c9952178c444fb940f7075568$5b6a182d6c9f72cf75bf19f41bf7b025aaa51fff24d755cce82e778b2cef670592a62b8342ede6ec0787e32cb533242628c4da48eecc2dcd4c6f863433e99dc5	Bilal Raza	Admin	MBA	03001110006	admin@hms.com	2026-02-06 11:42:40.173912	active	\N	\N	0	2026-03-26 14:32:24.140598	\N	2026-04-20 06:30:40.524654	2026-03-24 05:28:27.424444	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
1	STF001	scrypt$94ccea5e1b95ac674d3c34dbd2f890e4$d70e958daf09c609feb56c4a5fb056510f1617cd0da06c04a77f1e859917a9af0c1ad84b927c5d5e9b537ade0b8ddf774efedc5a315ce489ca7afc81d41b5349	Sara Ahmed	Receptionist	BA	03001110001	sara.ahmed@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	2026-04-02 10:42:27.545288	\N	2026-05-23 13:25:13.791281	2026-03-24 05:55:16.816767	\N	\N	f	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
4	STF004	scrypt$7f06b69c3ab5868ff1945c83d04b86ed$795b3ec49b2aaaac74e9b91344b91d8e7edafc04a0f7f948fdfeef7cfbbab7d5212e7e547357f634423169f70f64442a9b95f8feea4297254cf6183ab1fff98c	Imran Ali	Cashier	BBA	03001110004	imran.ali@example.com	2026-02-06 11:42:40.173912	active	\N	\N	0	\N	\N	2026-04-02 12:16:53.744752	2026-03-30 03:29:00.018338	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
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
53	2	1	2026-03-19 03:18:27.8888	OPD	2	waiting	ill	f
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
47	1	1	2026-03-18 09:44:06.867939	Emergency	1	waiting	sick	f
54	6	1	2026-03-21 13:41:51.219525	OPD	1	waiting	ill	f
57	1	1	2026-03-22 03:52:00.65595	Emergency	1	waiting	ill	f
56	6	1	2026-03-22 03:51:43.413243	OPD	1	medicines_dispensed	ill	f
59	11	1	2026-03-23 11:56:20.451554	Emergency	2	waiting	ill	f
60	10	2	2026-03-23 13:01:13.424127	OPD	1	medicines_dispensed	again ill	f
62	10	2	2026-03-23 14:59:34.035806	OPD	3	waiting	fever	f
66	11	3	2026-03-30 03:47:48.505228	Emergency	1	waiting	csd	f
68	15	2	2026-04-02 11:10:41.795849	OPD	1	waiting	ill	f
70	10	2	2026-04-19 09:50:39.047189	OPD	1	waiting	ill	f
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
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-02-06 07:10:25
20211116045059	2026-02-06 07:10:25
20211116050929	2026-02-06 07:10:25
20211116051442	2026-02-06 07:10:25
20211116212300	2026-02-06 07:10:25
20211116213355	2026-02-06 07:10:25
20211116213934	2026-02-06 07:10:25
20211116214523	2026-02-06 07:10:25
20211122062447	2026-02-06 07:10:25
20211124070109	2026-02-06 07:10:25
20211202204204	2026-02-06 07:10:25
20211202204605	2026-02-06 07:10:25
20211210212804	2026-02-06 07:10:25
20211228014915	2026-02-06 07:10:25
20220107221237	2026-02-06 07:10:25
20220228202821	2026-02-06 07:10:25
20220312004840	2026-02-06 07:10:25
20220603231003	2026-02-06 07:10:25
20220603232444	2026-02-06 07:10:25
20220615214548	2026-02-06 07:10:25
20220712093339	2026-02-06 07:10:25
20220908172859	2026-02-06 07:10:25
20220916233421	2026-02-06 07:10:25
20230119133233	2026-02-06 07:10:25
20230128025114	2026-02-06 07:10:25
20230128025212	2026-02-06 07:10:25
20230227211149	2026-02-06 07:10:26
20230228184745	2026-02-06 07:10:26
20230308225145	2026-02-06 07:10:26
20230328144023	2026-02-06 07:10:26
20231018144023	2026-02-06 07:10:26
20231204144023	2026-02-06 07:10:26
20231204144024	2026-02-06 07:10:26
20231204144025	2026-02-06 07:10:26
20240108234812	2026-02-06 07:10:26
20240109165339	2026-02-06 07:10:26
20240227174441	2026-02-06 07:10:26
20240311171622	2026-02-06 07:10:26
20240321100241	2026-02-06 07:10:26
20240401105812	2026-02-06 07:10:26
20240418121054	2026-02-06 07:10:26
20240523004032	2026-02-06 09:34:11
20240618124746	2026-02-06 09:34:11
20240801235015	2026-02-06 09:34:11
20240805133720	2026-02-06 09:34:11
20240827160934	2026-02-06 09:34:11
20240919163303	2026-02-06 09:34:11
20240919163305	2026-02-06 09:34:11
20241019105805	2026-02-06 09:34:11
20241030150047	2026-02-06 09:34:11
20241108114728	2026-02-06 09:34:11
20241121104152	2026-02-06 09:34:11
20241130184212	2026-02-06 09:34:11
20241220035512	2026-02-06 09:34:11
20241220123912	2026-02-06 09:34:11
20241224161212	2026-02-06 09:34:11
20250107150512	2026-02-06 09:34:11
20250110162412	2026-02-06 09:34:11
20250123174212	2026-02-06 09:34:11
20250128220012	2026-02-06 09:34:11
20250506224012	2026-02-06 09:34:11
20250523164012	2026-02-06 09:34:11
20250714121412	2026-02-06 09:34:11
20250905041441	2026-02-06 09:34:11
20251103001201	2026-02-06 09:34:11
20251120212548	2026-02-06 09:34:11
20251120215549	2026-02-06 09:34:11
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-02-06 07:10:52.715026
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-02-06 07:10:52.791683
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-02-06 07:10:52.855649
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-02-06 07:10:52.888111
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-02-06 07:10:52.892682
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-02-06 07:10:52.904504
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-02-06 07:10:52.910153
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-02-06 07:10:52.926523
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-02-06 07:10:52.931567
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-02-06 07:10:52.937314
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-02-06 07:10:52.942384
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-02-06 07:10:52.974479
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-02-06 07:10:52.980155
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-02-06 07:10:52.984642
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-02-06 07:10:52.989341
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-02-06 07:10:52.99657
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-02-06 07:10:53.00909
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-02-06 07:10:53.01606
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-02-06 07:10:53.030969
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-02-06 07:10:53.042853
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-02-06 07:10:53.048191
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-02-06 07:10:53.055231
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-02-06 07:10:53.959577
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-02-06 07:10:54.006937
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-02-06 07:10:54.01224
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-02-06 07:10:54.028669
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-02-06 07:10:54.033683
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-02-06 07:10:54.052148
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-02-06 07:10:52.79865
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-02-06 07:10:52.898466
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-02-06 07:10:52.915949
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-02-06 07:10:52.921376
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-02-06 07:10:53.060504
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-02-06 07:10:53.076901
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-02-06 07:10:53.895392
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-02-06 07:10:53.905904
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-02-06 07:10:53.912544
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-02-06 07:10:53.919356
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-02-06 07:10:53.933246
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-02-06 07:10:53.940034
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-02-06 07:10:53.941981
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-02-06 07:10:53.947672
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-02-06 07:10:53.952241
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-02-06 07:10:53.964604
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-02-06 07:10:53.976756
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-02-06 07:10:53.981671
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-02-06 07:10:53.989581
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-02-06 07:10:53.99472
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-02-06 07:10:54.002105
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-02-06 07:10:54.038071
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-03-02 04:03:05.73444
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-03-02 04:03:05.790098
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-03-02 04:03:05.791345
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-03-02 04:03:05.846696
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-03-02 04:03:05.848704
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-03-02 04:03:05.849827
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-04-17 10:45:27.03445
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-04-17 10:45:27.062841
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-03-02 04:03:05.855978
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-05-23 13:24:40.711616
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-05-23 13:24:40.753406
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: -
--

COPY supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) FROM stdin;
20260303185544	{"CREATE OR REPLACE FUNCTION public.fn_tg_sale_return_detail_to_txn()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF TG_OP = 'INSERT' THEN\n    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_sale_return, batch_id)\n    VALUES (NEW.medicine_id, 'sale_return', NEW.returned_quantity, COALESCE(NEW.returned_sub_quantity, 0), NEW.returned_unit_price, NEW.return_id, NEW.batch_id);\n  ELSIF TG_OP = 'UPDATE' THEN\n    UPDATE medicine_transaction\n    SET quantity = NEW.returned_quantity, sub_quantity = COALESCE(NEW.returned_sub_quantity, 0), amount_per_unit = NEW.returned_unit_price, batch_id = NEW.batch_id\n    WHERE ref_sale_return = NEW.return_id AND medicine_id = NEW.medicine_id AND txn_type = 'sale_return';\n  ELSIF TG_OP = 'DELETE' THEN\n    DELETE FROM medicine_transaction\n    WHERE ref_sale_return = OLD.return_id AND medicine_id = OLD.medicine_id AND txn_type = 'sale_return';\n  END IF;\n  RETURN NEW;\nEND;\n$function$;"}	fix_sale_return_detail_trigger	k224291@nu.edu.pk	\N	\N
20260318082341	{"CREATE TABLE IF NOT EXISTS public.party_payment (\n    payment_id SERIAL PRIMARY KEY,\n    party_id INTEGER NOT NULL REFERENCES public.party(party_id) ON DELETE CASCADE,\n    amount NUMERIC(10,2) NOT NULL,\n    payment_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n    payment_method VARCHAR(50),\n    reference_note TEXT,\n    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n    created_by INTEGER\n);\n\nALTER TABLE public.medicine_purchase \nADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0;\n\nALTER TABLE public.party\nADD COLUMN IF NOT EXISTS email VARCHAR(255),\nADD COLUMN IF NOT EXISTS gst_number VARCHAR(100),\nADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true;"}	add_party_payment_and_ledger_fields	k224291@nu.edu.pk	\N	\N
20260318082418	{"-- Create party_payment table if it doesn't exist\nCREATE TABLE IF NOT EXISTS public.party_payment (\n    payment_id SERIAL PRIMARY KEY,\n    party_id INTEGER NOT NULL REFERENCES public.party(party_id) ON DELETE CASCADE,\n    amount NUMERIC(10,2) NOT NULL,\n    payment_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n    payment_method VARCHAR(50),\n    reference_note TEXT,\n    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n    created_by INTEGER\n);\n\n-- Add paid_amount to medicine_purchase to track payments per invoice\nDO $$ \nBEGIN \n    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicine_purchase' AND column_name='paid_amount') THEN\n        ALTER TABLE public.medicine_purchase ADD COLUMN paid_amount NUMERIC(10,2) DEFAULT 0;\n    END IF;\nEND $$;\n\n-- Add extra metadata fields to party table\nDO $$ \nBEGIN \n    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party' AND column_name='email') THEN\n        ALTER TABLE public.party ADD COLUMN email VARCHAR(255);\n    END IF;\n    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party' AND column_name='gst_number') THEN\n        ALTER TABLE public.party ADD COLUMN gst_number VARCHAR(100);\n    END IF;\n    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party' AND column_name='status') THEN\n        ALTER TABLE public.party ADD COLUMN status BOOLEAN DEFAULT true;\n    END IF;\nEND $$;"}	add_party_payment_and_ledger_fields_v2	k224291@nu.edu.pk	\N	\N
20260318094032	{"BEGIN;\n\nCREATE TABLE IF NOT EXISTS public.medicine_category (\n    category_id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n    name character varying(100) NOT NULL,\n    is_active boolean NOT NULL DEFAULT true,\n    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS public.medicine_manufacturer (\n    manufacturer_id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n    name character varying(100) NOT NULL,\n    is_active boolean NOT NULL DEFAULT true,\n    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS public.medicine_form (\n    form_id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n    name character varying(50) NOT NULL,\n    is_active boolean NOT NULL DEFAULT true,\n    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS medicine_category_name_unique_idx\n    ON public.medicine_category (LOWER(BTRIM(name)));\n\nCREATE UNIQUE INDEX IF NOT EXISTS medicine_manufacturer_name_unique_idx\n    ON public.medicine_manufacturer (LOWER(BTRIM(name)));\n\nCREATE UNIQUE INDEX IF NOT EXISTS medicine_form_name_unique_idx\n    ON public.medicine_form (LOWER(BTRIM(name)));\n\nALTER TABLE public.medicine\n    ADD COLUMN IF NOT EXISTS category_id integer,\n    ADD COLUMN IF NOT EXISTS manufacturer_id integer,\n    ADD COLUMN IF NOT EXISTS form_id integer;\n\nINSERT INTO public.medicine_category (name)\nSELECT DISTINCT BTRIM(category)\nFROM public.medicine\nWHERE category IS NOT NULL\n  AND BTRIM(category) <> ''\nON CONFLICT DO NOTHING;\n\nINSERT INTO public.medicine_manufacturer (name)\nSELECT DISTINCT BTRIM(manufacturer)\nFROM public.medicine\nWHERE manufacturer IS NOT NULL\n  AND BTRIM(manufacturer) <> ''\nON CONFLICT DO NOTHING;\n\nINSERT INTO public.medicine_form (name)\nSELECT DISTINCT BTRIM(form)\nFROM public.medicine\nWHERE form IS NOT NULL\n  AND BTRIM(form) <> ''\nON CONFLICT DO NOTHING;\n\nUPDATE public.medicine AS m\nSET category_id = mc.category_id\nFROM public.medicine_category AS mc\nWHERE m.category_id IS NULL\n  AND m.category IS NOT NULL\n  AND BTRIM(m.category) <> ''\n  AND LOWER(BTRIM(m.category)) = LOWER(BTRIM(mc.name));\n\nUPDATE public.medicine AS m\nSET manufacturer_id = mm.manufacturer_id\nFROM public.medicine_manufacturer AS mm\nWHERE m.manufacturer_id IS NULL\n  AND m.manufacturer IS NOT NULL\n  AND BTRIM(m.manufacturer) <> ''\n  AND LOWER(BTRIM(m.manufacturer)) = LOWER(BTRIM(mm.name));\n\nUPDATE public.medicine AS m\nSET form_id = mf.form_id\nFROM public.medicine_form AS mf\nWHERE m.form_id IS NULL\n  AND m.form IS NOT NULL\n  AND BTRIM(m.form) <> ''\n  AND LOWER(BTRIM(m.form)) = LOWER(BTRIM(mf.name));\n\nDO $$\nBEGIN\n    IF NOT EXISTS (\n        SELECT 1\n        FROM pg_constraint\n        WHERE conname = 'medicine_category_id_fkey'\n    ) THEN\n        ALTER TABLE public.medicine\n            ADD CONSTRAINT medicine_category_id_fkey\n            FOREIGN KEY (category_id) REFERENCES public.medicine_category(category_id);\n    END IF;\n\n    IF NOT EXISTS (\n        SELECT 1\n        FROM pg_constraint\n        WHERE conname = 'medicine_manufacturer_id_fkey'\n    ) THEN\n        ALTER TABLE public.medicine\n            ADD CONSTRAINT medicine_manufacturer_id_fkey\n            FOREIGN KEY (manufacturer_id) REFERENCES public.medicine_manufacturer(manufacturer_id);\n    END IF;\n\n    IF NOT EXISTS (\n        SELECT 1\n        FROM pg_constraint\n        WHERE conname = 'medicine_form_id_fkey'\n    ) THEN\n        ALTER TABLE public.medicine\n            ADD CONSTRAINT medicine_form_id_fkey\n            FOREIGN KEY (form_id) REFERENCES public.medicine_form(form_id);\n    END IF;\nEND $$;\n\nCREATE INDEX IF NOT EXISTS idx_medicine_category_id ON public.medicine (category_id);\nCREATE INDEX IF NOT EXISTS idx_medicine_manufacturer_id ON public.medicine (manufacturer_id);\nCREATE INDEX IF NOT EXISTS idx_medicine_form_id ON public.medicine (form_id);\n\nCOMMIT;"}	add_medicine_master_tables	k224291@nu.edu.pk	\N	\N
20260319012816	{"\nCREATE OR REPLACE FUNCTION public.fn_tg_purchase_return_detail_to_txn()\nRETURNS trigger\nLANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF TG_OP = 'INSERT' THEN\n    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_purchase_return, batch_id)\n    VALUES (NEW.medicine_id, 'purchase_return', NEW.quantity, COALESCE(NEW.sub_quantity, 0), NEW.returned_unit_price, NEW.return_id, NEW.batch_id);\n\n    -- Also decrement batch stock\n    UPDATE medicine_batch\n    SET\n      stock_quantity = stock_quantity - NEW.quantity,\n      stock_sub_quantity = stock_sub_quantity - COALESCE(NEW.sub_quantity, 0)\n    WHERE batch_id = NEW.batch_id;\n\n  ELSIF TG_OP = 'UPDATE' THEN\n    UPDATE medicine_transaction\n    SET\n      medicine_id = NEW.medicine_id,\n      quantity = NEW.quantity,\n      sub_quantity = COALESCE(NEW.sub_quantity, 0),\n      amount_per_unit = NEW.returned_unit_price,\n      batch_id = NEW.batch_id\n    WHERE ref_purchase_return = OLD.return_id\n      AND medicine_id = OLD.medicine_id\n      AND txn_type = 'purchase_return';\n\n  ELSIF TG_OP = 'DELETE' THEN\n    DELETE FROM medicine_transaction\n    WHERE ref_purchase_return = OLD.return_id\n      AND medicine_id = OLD.medicine_id\n      AND txn_type = 'purchase_return';\n  END IF;\n\n  RETURN COALESCE(NEW, OLD);\nEND;\n$function$;\n"}	fix_purchase_return_trigger_column_names	k224291@nu.edu.pk	\N	\N
20260319060051	{"alter table public.prescription_medicines\n  add column if not exists available_quantity_snapshot integer,\n  add column if not exists availability_status text,\n  add column if not exists availability_note text;\n\nupdate public.prescription_medicines\nset\n  available_quantity_snapshot = coalesce(available_quantity_snapshot, 0),\n  availability_status = coalesce(availability_status, 'unknown')\nwhere available_quantity_snapshot is null\n   or availability_status is null;\n\nalter table public.prescription_medicines\n  alter column available_quantity_snapshot set default 0,\n  alter column availability_status set default 'unknown';\n\ncreate table if not exists public.prescription_fulfillment_action (\n  fulfillment_action_id bigint generated by default as identity primary key,\n  prescription_medicine_id integer not null references public.prescription_medicines(prescription_medicine_id) on delete cascade,\n  prescription_id integer not null references public.prescription(prescription_id) on delete cascade,\n  visit_id integer not null references public.visit(visit_id) on delete cascade,\n  patient_id integer not null references public.patient(patient_id) on delete cascade,\n  available_quantity_at_action integer not null default 0,\n  action_type text not null,\n  reason_code text,\n  reason_note text,\n  override_sale_price numeric(12,2),\n  override_quantity integer,\n  handled_by integer references public.staff(staff_id),\n  handled_at timestamp without time zone not null default now(),\n  created_at timestamp without time zone not null default now()\n);\n\ncreate index if not exists idx_prescription_fulfillment_action_prescription_medicine\n  on public.prescription_fulfillment_action(prescription_medicine_id);\n\ncreate index if not exists idx_prescription_fulfillment_action_visit\n  on public.prescription_fulfillment_action(visit_id);\n\ncreate table if not exists public.pharmacy_sale_override_detail (\n  pharmacy_sale_override_detail_id bigint generated by default as identity primary key,\n  sale_id integer not null references public.pharmacy_sale(sale_id) on delete cascade,\n  prescription_medicine_id integer not null references public.prescription_medicines(prescription_medicine_id) on delete cascade,\n  medicine_id integer not null references public.medicine(medicine_id),\n  quantity integer not null default 0,\n  unit_sale_price numeric(12,2) not null default 0,\n  line_total numeric(12,2) not null default 0,\n  reason_code text not null,\n  reason_note text,\n  handled_by integer references public.staff(staff_id),\n  created_at timestamp without time zone not null default now()\n);\n\ncreate index if not exists idx_pharmacy_sale_override_detail_sale\n  on public.pharmacy_sale_override_detail(sale_id);"}	stock_aware_prescription_overrides	k224291@nu.edu.pk	\N	\N
20260319065324	{"alter table public.prescription_medicines\n  add column if not exists available_quantity_snapshot integer,\n  add column if not exists availability_status text,\n  add column if not exists availability_note text;\n\nupdate public.prescription_medicines\nset\n  available_quantity_snapshot = coalesce(available_quantity_snapshot, 0),\n  availability_status = coalesce(availability_status, 'unknown')\nwhere available_quantity_snapshot is null\n   or availability_status is null;\n\nalter table public.prescription_medicines\n  alter column available_quantity_snapshot set default 0,\n  alter column availability_status set default 'unknown';\n\ncreate table if not exists public.prescription_fulfillment_action (\n  fulfillment_action_id bigint generated by default as identity primary key,\n  prescription_medicine_id integer not null references public.prescription_medicines(prescription_medicine_id) on delete cascade,\n  prescription_id integer not null references public.prescription(prescription_id) on delete cascade,\n  visit_id integer not null references public.visit(visit_id) on delete cascade,\n  patient_id integer not null references public.patient(patient_id) on delete cascade,\n  available_quantity_at_action integer not null default 0,\n  action_type text not null,\n  reason_code text,\n  reason_note text,\n  override_sale_price numeric(12,2),\n  override_quantity integer,\n  handled_by integer references public.staff(staff_id),\n  handled_at timestamp without time zone not null default now(),\n  created_at timestamp without time zone not null default now()\n);\n\ncreate index if not exists idx_prescription_fulfillment_action_prescription_medicine\n  on public.prescription_fulfillment_action(prescription_medicine_id);\n\ncreate index if not exists idx_prescription_fulfillment_action_visit\n  on public.prescription_fulfillment_action(visit_id);\n\ncreate table if not exists public.pharmacy_sale_override_detail (\n  pharmacy_sale_override_detail_id bigint generated by default as identity primary key,\n  sale_id integer not null references public.pharmacy_sale(sale_id) on delete cascade,\n  prescription_medicine_id integer not null references public.prescription_medicines(prescription_medicine_id) on delete cascade,\n  medicine_id integer not null references public.medicine(medicine_id),\n  quantity integer not null default 0,\n  unit_sale_price numeric(12,2) not null default 0,\n  line_total numeric(12,2) not null default 0,\n  reason_code text not null,\n  reason_note text,\n  handled_by integer references public.staff(staff_id),\n  created_at timestamp without time zone not null default now()\n);\n\ncreate index if not exists idx_pharmacy_sale_override_detail_sale\n  on public.pharmacy_sale_override_detail(sale_id);"}	stock_aware_prescription_overrides	k224291@nu.edu.pk	\N	\N
20260319065344	{"BEGIN;\n\nDROP VIEW IF EXISTS public.v_medicine_pos;\n\nCREATE VIEW public.v_medicine_pos AS\nSELECT\n  m.medicine_id AS id,\n  m.generic_name,\n  m.brand_name,\n  m.category,\n  m.dosage_value::float8 AS dosage_value,\n  m.dosage_unit,\n  m.form,\n  COALESCE(mb.sale_price, mb.purchase_price)::float8 AS price,\n  (\n    (\n      SUM(\n        (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +\n        COALESCE(mb.stock_sub_quantity, 0)\n      ) OVER (PARTITION BY m.medicine_id)\n    ) / COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)\n  )::integer AS total_stock_quantity,\n  (\n    (\n      SUM(\n        (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +\n        COALESCE(mb.stock_sub_quantity, 0)\n      ) OVER (PARTITION BY m.medicine_id)\n    ) % COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)\n  )::integer AS total_stock_sub_quantity,\n  m.barcode,\n  m.sku,\n  m.manufacturer,\n  m.requires_prescription,\n  m.search_vector,\n  m.sub_unit,\n  COALESCE(m.sub_units_per_unit, 1) AS sub_units_per_unit,\n  m.allow_sub_unit_sale,\n  COALESCE(m.min_stock_level, 0) AS min_stock_level,\n  mb.batch_id,\n  mb.batch_number,\n  mb.expiry_date,\n  COALESCE(mb.stock_quantity, 0) AS batch_stock_quantity,\n  COALESCE(mb.stock_sub_quantity, 0) AS batch_stock_sub_quantity,\n  mb.sale_price::float8 AS batch_sale_price,\n  mb.sale_sub_unit_price::float8 AS batch_sale_sub_unit_price,\n  mb.sale_price::float8 AS global_price,\n  (\n    (\n      COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)\n    ) + COALESCE(mb.stock_sub_quantity, 0)\n  ) <= 0 AS is_out_of_stock,\n  (\n    (\n      (\n        COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)\n      ) + COALESCE(mb.stock_sub_quantity, 0)\n    ) > 0\n    AND (\n      (\n        COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)\n      ) + COALESCE(mb.stock_sub_quantity, 0)\n    ) <= (COALESCE(m.min_stock_level, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))\n  ) AS is_low_stock\nFROM public.medicine m\nLEFT JOIN public.medicine_batch mb\n  ON m.medicine_id = mb.medicine_id\nWHERE\n  m.is_active = true\n  AND (mb.expiry_date > CURRENT_DATE OR mb.expiry_date IS NULL);\n\nALTER VIEW public.v_medicine_pos OWNER TO postgres;\n\nCOMMIT;"}	retail_stock_visibility	k224291@nu.edu.pk	\N	\N
20260319081839	{"BEGIN;\n\nALTER TABLE public.visit\n  DROP CONSTRAINT IF EXISTS visit_status_check;\n\nALTER TABLE public.visit\n  ADD CONSTRAINT visit_status_check\n  CHECK (\n    (status)::text = ANY (\n      ARRAY[\n        'waiting'::character varying,\n        'seen_by_doctor'::character varying,\n        'dispensing'::character varying,\n        'medicines_dispensed'::character varying,\n        'lab_tests_done'::character varying,\n        'payment_done'::character varying,\n        'completed'::character varying,\n        'admitted'::character varying,\n        'discharged'::character varying\n      ]::text[]\n    )\n  );\n\nALTER TABLE public.visit_status_history\n  DROP CONSTRAINT IF EXISTS visit_status_history_status_check;\n\nALTER TABLE public.visit_status_history\n  ADD CONSTRAINT visit_status_history_status_check\n  CHECK (\n    (status)::text = ANY (\n      ARRAY[\n        'waiting'::character varying,\n        'seen_by_doctor'::character varying,\n        'dispensing'::character varying,\n        'medicines_dispensed'::character varying,\n        'lab_tests_done'::character varying,\n        'payment_done'::character varying,\n        'admitted'::character varying,\n        'discharged'::character varying\n      ]::text[]\n    )\n  );\n\nCOMMIT;"}	add_dispensing_visit_status	k224291@nu.edu.pk	\N	\N
20260319081841	{"begin;\n\ncreate table if not exists public.doctor_encounter_note (\n  doctor_encounter_note_id bigint generated by default as identity primary key,\n  visit_id integer not null unique references public.visit(visit_id) on delete cascade,\n  patient_id integer not null references public.patient(patient_id) on delete cascade,\n  doctor_id integer not null references public.doctor(doctor_id),\n  reception_complaint text,\n  doctor_note text,\n  created_at timestamp without time zone not null default now(),\n  updated_at timestamp without time zone not null default now()\n);\n\ncreate index if not exists idx_doctor_encounter_note_patient\n  on public.doctor_encounter_note(patient_id);\n\ncreate index if not exists idx_doctor_encounter_note_doctor\n  on public.doctor_encounter_note(doctor_id);\n\ninsert into public.doctor_encounter_note (\n  visit_id,\n  patient_id,\n  doctor_id,\n  reception_complaint,\n  doctor_note\n)\nselect\n  v.visit_id,\n  v.patient_id,\n  v.doctor_id,\n  nullif(trim(v.reason), ''),\n  null\nfrom public.visit v\nwhere v.is_deleted = false\non conflict (visit_id) do nothing;\n\nalter table public.prescription_medicines\n  add column if not exists dosage character varying(100);\n\ncreate index if not exists idx_prescription_visit_id on public.prescription(visit_id);\ncreate index if not exists idx_lab_order_visit_id on public.lab_order(visit_id);\n\ncommit;"}	doctor_module_phase_a_rebuild	k224291@nu.edu.pk	\N	\N
20260319123140	{"-- Audit Logs for high-level accountability\nCREATE TABLE IF NOT EXISTS public.audit_logs (\n    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    staff_id INTEGER REFERENCES public.staff(staff_id),\n    action VARCHAR(255) NOT NULL,\n    entity_type VARCHAR(100),\n    entity_id VARCHAR(100),\n    details JSONB,\n    ip_address VARCHAR(45),\n    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Granular Permissions\nCREATE TABLE IF NOT EXISTS public.staff_permissions (\n    permission_id SERIAL PRIMARY KEY,\n    staff_id INTEGER REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n    module VARCHAR(50) NOT NULL,\n    can_read BOOLEAN DEFAULT TRUE,\n    can_write BOOLEAN DEFAULT FALSE,\n    can_delete BOOLEAN DEFAULT FALSE,\n    UNIQUE(staff_id, module)\n);\n\n-- System Settings\nCREATE TABLE IF NOT EXISTS public.system_settings (\n    setting_key VARCHAR(100) PRIMARY KEY,\n    setting_value JSONB,\n    description TEXT,\n    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n    updated_by INTEGER REFERENCES public.staff(staff_id)\n);\n\n-- Staff Attendance\nCREATE TABLE IF NOT EXISTS public.staff_attendance (\n    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    staff_id INTEGER REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n    date DATE NOT NULL,\n    check_in_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n    check_out_time TIMESTAMP WITHOUT TIME ZONE,\n    status VARCHAR(20) DEFAULT 'Present',\n    marked_by VARCHAR(50),\n    admin_id INTEGER REFERENCES public.staff(staff_id),\n    UNIQUE(staff_id, date)\n);\n\n-- Initial Settings\nINSERT INTO public.system_settings (setting_key, setting_value, description)\nVALUES \n('hospital_name', '\\"HMS Premium Healthcare\\"', 'The display name of the institution'),\n('tax_rate', '17.0', 'Standard GST rate applied to bills'),\n('currency', '\\"PKR\\"', 'System default currency'),\n('low_stock_global_threshold', '10', 'Default threshold for inventory alerts')\nON CONFLICT (setting_key) DO NOTHING;\n"}	admin_module_enhancements_2026_03_19	k224291@nu.edu.pk	\N	\N
20260319133540	{"CREATE OR REPLACE PROCEDURE public.update_and_log_visit_status(IN p_visit_id integer, IN p_status character varying, IN p_updated_by_doctor integer, IN p_updated_by_staff integer)\n LANGUAGE plpgsql\nAS $procedure$\nbegin\n\tupdate visit\n\tset status =p_status\n\twhere visit_id =p_visit_id;\n\n\tinsert into visit_status_history(visit_id,status,updated_by_staff,updated_by_doctor)\n\tvalues(\n\t\tp_visit_id,\n\t\tp_status,\n\t\tp_updated_by_staff,\n\t\tp_updated_by_doctor\n\t);\nend;\n$procedure$"}	fix_update_and_log_visit_status	k224291@nu.edu.pk	\N	\N
20260319133612	{"-- 1. Add override columns to pharmacy_sale_detail\nALTER TABLE pharmacy_sale_detail\nADD COLUMN IF NOT EXISTS prescription_medicine_id integer,\nADD COLUMN IF NOT EXISTS reason_code text,\nADD COLUMN IF NOT EXISTS reason_note text,\nADD COLUMN IF NOT EXISTS handled_by integer,\nADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now();\n\n-- 2. Migrate existing data\nINSERT INTO pharmacy_sale_detail (\n    sale_id,\n    prescription_medicine_id,\n    medicine_id,\n    quantity,\n    unit_sale_price,\n    line_total,\n    reason_code,\n    reason_note,\n    handled_by,\n    created_at\n)\nSELECT\n    sale_id,\n    prescription_medicine_id,\n    medicine_id,\n    quantity,\n    unit_sale_price,\n    line_total,\n    reason_code,\n    reason_note,\n    handled_by,\n    created_at\nFROM pharmacy_sale_override_detail;\n\n-- 3. Drop legacy table\nDROP TABLE IF EXISTS pharmacy_sale_override_detail;"}	unify_pharmacy_sale_details	k224291@nu.edu.pk	\N	\N
20260319144910	{"-- Migration: unify pharmacy sale details with the live HMS schema\n-- Notes:\n-- - This is the canonical local representation of the March 19 sale-detail unification.\n-- - `2026_03_19_retail_stock_visibility.sql` only rebuilds `v_medicine_pos`; it does not\n--   own the override-table removal.\n\nBEGIN;\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'id'\n  ) AND NOT EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'pharmacy_sale_detail_id'\n  ) THEN\n    ALTER TABLE public.pharmacy_sale_detail\n      RENAME COLUMN id TO pharmacy_sale_detail_id;\n  END IF;\n\n  IF EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'qty'\n  ) AND NOT EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'quantity'\n  ) THEN\n    ALTER TABLE public.pharmacy_sale_detail\n      RENAME COLUMN qty TO quantity;\n  END IF;\n\n  IF EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'unit_price'\n  ) AND NOT EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'unit_sale_price'\n  ) THEN\n    ALTER TABLE public.pharmacy_sale_detail\n      RENAME COLUMN unit_price TO unit_sale_price;\n  END IF;\n\n  IF EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'total_price'\n  ) AND NOT EXISTS (\n    SELECT 1\n    FROM information_schema.columns\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_detail'\n      AND column_name = 'line_total'\n  ) THEN\n    ALTER TABLE public.pharmacy_sale_detail\n      RENAME COLUMN total_price TO line_total;\n  END IF;\nEND $$;\n\nALTER TABLE public.pharmacy_sale_detail\n  ADD COLUMN IF NOT EXISTS sub_unit_sale_price numeric(10,2),\n  ADD COLUMN IF NOT EXISTS batch_id integer REFERENCES public.medicine_batch(batch_id),\n  ADD COLUMN IF NOT EXISTS prescription_medicine_id integer REFERENCES public.prescription_medicines(prescription_medicine_id),\n  ADD COLUMN IF NOT EXISTS reason_code text,\n  ADD COLUMN IF NOT EXISTS reason_note text,\n  ADD COLUMN IF NOT EXISTS handled_by integer REFERENCES public.staff(staff_id),\n  ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now();\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM information_schema.tables\n    WHERE table_schema = 'public'\n      AND table_name = 'pharmacy_sale_override_detail'\n  ) THEN\n    INSERT INTO public.pharmacy_sale_detail (\n      sale_id,\n      medicine_id,\n      quantity,\n      unit_sale_price,\n      line_total,\n      prescription_medicine_id,\n      reason_code,\n      reason_note,\n      handled_by,\n      created_at\n    )\n    SELECT\n      sale_id,\n      medicine_id,\n      quantity,\n      unit_sale_price,\n      line_total,\n      prescription_medicine_id,\n      reason_code,\n      reason_note,\n      handled_by,\n      created_at\n    FROM public.pharmacy_sale_override_detail;\n  END IF;\nEND $$;\n\nDROP TABLE IF EXISTS public.pharmacy_sale_override_detail;\n\nCOMMIT;"}	sync_repo_unified_sale_details	k224291@nu.edu.pk	\N	\N
20260320023351	{"CREATE OR REPLACE FUNCTION public.fn_tg_purchase_return_detail_to_txn()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF TG_OP = 'INSERT' THEN\n    INSERT INTO medicine_transaction(medicine_id, txn_type, quantity, sub_quantity, amount_per_unit, ref_purchase_return, batch_id)\n    VALUES (NEW.medicine_id, 'purchase_return', NEW.quantity, COALESCE(NEW.sub_quantity, 0), NEW.returned_unit_price, NEW.return_id, NEW.batch_id);\n\n    -- 🔴 FIX: Removed the manual UPDATE medicine_batch from here.\n    -- The generic stock trigger (fn_tg_stockquantity_generic) will handle it.\n\n  ELSIF TG_OP = 'UPDATE' THEN\n    UPDATE medicine_transaction\n    SET\n      medicine_id = NEW.medicine_id,\n      quantity = NEW.quantity,\n      sub_quantity = COALESCE(NEW.sub_quantity, 0),\n      amount_per_unit = NEW.returned_unit_price,\n      batch_id = NEW.batch_id\n    WHERE ref_purchase_return = OLD.return_id\n      AND medicine_id = OLD.medicine_id\n      AND txn_type = 'purchase_return';\n\n  ELSIF TG_OP = 'DELETE' THEN\n    DELETE FROM medicine_transaction\n    WHERE ref_purchase_return = OLD.return_id\n      AND medicine_id = OLD.medicine_id\n      AND txn_type = 'purchase_return';\n  END IF;\n\n  RETURN COALESCE(NEW, OLD);\nEND;\n$function$;"}	fix_purchase_return_double_decrement_trigger	k224291@nu.edu.pk	\N	\N
20260320100411	{"-- Phase 1: Database Hardening (Pharmacy Refactor)\n\n-- 1. Invoice Numbering\nCREATE SEQUENCE IF NOT EXISTS invoice_seq;\n\nCREATE OR REPLACE FUNCTION generate_invoice_no()\nRETURNS text AS $$\nBEGIN\n    RETURN 'INV-' || LPAD(nextval('invoice_seq')::text, 6, '0');\nEND;\n$$ LANGUAGE plpgsql;\n\n-- Bootstrap sequence from existing INV- numbering\n-- regexp_replace removes any non-digit characters to find the highest number\nSELECT setval('invoice_seq', (\n    SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_no, '\\\\D', '', 'g'), '')::int), 0)\n    FROM medicine_purchase\n));\n\nALTER TABLE medicine_purchase \nALTER COLUMN invoice_no SET DEFAULT generate_invoice_no();\n\n-- 2. Batch Internal Reference\nCREATE SEQUENCE IF NOT EXISTS batch_seq;\n\nALTER TABLE medicine_batch ADD COLUMN IF NOT EXISTS batch_code text;\n\nCREATE OR REPLACE FUNCTION generate_batch_code()\nRETURNS text AS $$\nBEGIN\n    RETURN 'BATCH-' || LPAD(nextval('batch_seq')::text, 8, '0');\nEND;\n$$ LANGUAGE plpgsql;\n\n-- Backfill existing batches (atomic setval inside update is risky, so we use a subquery)\n-- Actually, simple update with function is fine in Postgres\nUPDATE medicine_batch \nSET batch_code = 'BATCH-' || LPAD(nextval('batch_seq')::text, 8, '0')\nWHERE batch_code IS NULL;\n\nALTER TABLE medicine_batch \nALTER COLUMN batch_code SET NOT NULL,\nALTER COLUMN batch_code SET DEFAULT generate_batch_code();\n\n-- 3. Constraints\n-- Add UNIQUE(batch_code)\nDO $$ \nBEGIN \n    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_batch_code') THEN\n        ALTER TABLE medicine_batch ADD CONSTRAINT uk_batch_code UNIQUE (batch_code);\n    END IF;\nEND $$;\n\n-- Add UNIQUE(medicine_id, batch_number, party_id)\nDO $$ \nBEGIN \n    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_med_batch_party') THEN\n        ALTER TABLE medicine_batch ADD CONSTRAINT uk_med_batch_party UNIQUE (medicine_id, batch_number, party_id);\n    END IF;\nEND $$;\n\n-- Add non-negative stock constraints\nDO $$ \nBEGIN \n    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_stock_qty_non_negative') THEN\n        ALTER TABLE medicine_batch ADD CONSTRAINT ck_stock_qty_non_negative CHECK (stock_quantity >= 0);\n    END IF;\n    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_sub_stock_qty_non_negative') THEN\n        ALTER TABLE medicine_batch ADD CONSTRAINT ck_sub_stock_qty_non_negative CHECK (stock_sub_quantity >= 0);\n    END IF;\nEND $$;\n"}	pharmacy_refactor_phase1_hardening	k224291@nu.edu.pk	\N	\N
20260323161426	{"BEGIN;\n\nALTER TABLE public.pharmacy_sale\n  ADD COLUMN IF NOT EXISTS settlement_channel text,\n  ADD COLUMN IF NOT EXISTS settlement_status text,\n  ADD COLUMN IF NOT EXISTS settled_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS settled_by integer REFERENCES public.staff(staff_id);\n\nUPDATE public.pharmacy_sale\nSET\n  settlement_channel = COALESCE(settlement_channel, CASE WHEN COALESCE(due_amount, 0) > 0 THEN 'cashier' ELSE 'pharmacy' END),\n  settlement_status = COALESCE(settlement_status, CASE WHEN COALESCE(due_amount, 0) > 0 THEN 'pending' ELSE 'settled' END),\n  settled_at = CASE\n    WHEN settled_at IS NULL AND COALESCE(due_amount, 0) = 0 THEN sale_timestamp\n    ELSE settled_at\n  END\nWHERE settlement_channel IS NULL\n   OR settlement_status IS NULL\n   OR (settled_at IS NULL AND COALESCE(due_amount, 0) = 0);\n\nALTER TABLE public.pharmacy_sale\n  ALTER COLUMN settlement_channel SET DEFAULT 'pharmacy',\n  ALTER COLUMN settlement_status SET DEFAULT 'settled';\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint\n    WHERE conname = 'pharmacy_sale_settlement_channel_check'\n  ) THEN\n    ALTER TABLE public.pharmacy_sale\n      ADD CONSTRAINT pharmacy_sale_settlement_channel_check\n      CHECK (settlement_channel IN ('pharmacy', 'cashier'));\n  END IF;\n\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint\n    WHERE conname = 'pharmacy_sale_settlement_status_check'\n  ) THEN\n    ALTER TABLE public.pharmacy_sale\n      ADD CONSTRAINT pharmacy_sale_settlement_status_check\n      CHECK (settlement_status IN ('pending', 'settled'));\n  END IF;\nEND$$;\n\nCREATE TABLE IF NOT EXISTS public.bill_pharmacy_sale (\n  bill_pharmacy_sale_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  bill_id integer NOT NULL REFERENCES public.bill(bill_id) ON DELETE CASCADE,\n  sale_id integer NOT NULL REFERENCES public.pharmacy_sale(sale_id) ON DELETE CASCADE,\n  amount numeric(12,2) NOT NULL DEFAULT 0,\n  settled_amount numeric(12,2) NOT NULL DEFAULT 0,\n  settlement_status text NOT NULL DEFAULT 'pending',\n  created_by integer REFERENCES public.staff(staff_id),\n  settled_by integer REFERENCES public.staff(staff_id),\n  settled_at timestamp without time zone,\n  created_at timestamp without time zone NOT NULL DEFAULT now(),\n  updated_at timestamp without time zone NOT NULL DEFAULT now(),\n  CONSTRAINT bill_pharmacy_sale_sale_unique UNIQUE (sale_id),\n  CONSTRAINT bill_pharmacy_sale_settlement_status_check CHECK (settlement_status IN ('pending', 'settled'))\n);\n\nCREATE INDEX IF NOT EXISTS idx_bill_pharmacy_sale_bill_id\n  ON public.bill_pharmacy_sale (bill_id);\n\nCREATE INDEX IF NOT EXISTS idx_bill_pharmacy_sale_settlement_status\n  ON public.bill_pharmacy_sale (settlement_status);\n\nCREATE TABLE IF NOT EXISTS public.cashier_payment_txn (\n  cashier_payment_txn_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  bill_id integer NOT NULL REFERENCES public.bill(bill_id) ON DELETE CASCADE,\n  visit_id integer REFERENCES public.visit(visit_id) ON DELETE SET NULL,\n  amount numeric(12,2) NOT NULL,\n  payment_type character varying(50) NOT NULL,\n  payment_reference character varying(150),\n  notes text,\n  received_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT now(),\n  CONSTRAINT cashier_payment_txn_amount_check CHECK (amount > 0)\n);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_payment_txn_bill\n  ON public.cashier_payment_txn (bill_id, created_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_payment_txn_visit\n  ON public.cashier_payment_txn (visit_id);\n\nCREATE TABLE IF NOT EXISTS public.cashier_payment_allocation (\n  cashier_payment_allocation_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  cashier_payment_txn_id bigint NOT NULL REFERENCES public.cashier_payment_txn(cashier_payment_txn_id) ON DELETE CASCADE,\n  sale_id integer NOT NULL REFERENCES public.pharmacy_sale(sale_id) ON DELETE CASCADE,\n  bill_id integer NOT NULL REFERENCES public.bill(bill_id) ON DELETE CASCADE,\n  allocated_amount numeric(12,2) NOT NULL,\n  created_at timestamp without time zone NOT NULL DEFAULT now(),\n  CONSTRAINT cashier_payment_allocation_amount_check CHECK (allocated_amount > 0)\n);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_payment_alloc_sale\n  ON public.cashier_payment_allocation (sale_id);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_payment_alloc_bill\n  ON public.cashier_payment_allocation (bill_id);\n\nCOMMIT;"}	pharmacy_cashier_settlement	k224291@nu.edu.pk	\N	\N
20260323170909	{"BEGIN;\n\nALTER TABLE public.cashier_payment_txn\n  ADD COLUMN IF NOT EXISTS txn_type text NOT NULL DEFAULT 'payment',\n  ADD COLUMN IF NOT EXISTS reversed_from_txn_id bigint REFERENCES public.cashier_payment_txn(cashier_payment_txn_id),\n  ADD COLUMN IF NOT EXISTS reversal_reason_code text,\n  ADD COLUMN IF NOT EXISTS reversal_reason_note text,\n  ADD COLUMN IF NOT EXISTS receipt_no character varying(80);\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1 FROM pg_constraint\n    WHERE conname = 'cashier_payment_txn_amount_check'\n      AND conrelid = 'public.cashier_payment_txn'::regclass\n  ) THEN\n    ALTER TABLE public.cashier_payment_txn\n      DROP CONSTRAINT cashier_payment_txn_amount_check;\n  END IF;\nEND$$;\n\nALTER TABLE public.cashier_payment_txn\n  ADD CONSTRAINT cashier_payment_txn_amount_check CHECK (amount <> 0);\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint\n    WHERE conname = 'cashier_payment_txn_type_check'\n      AND conrelid = 'public.cashier_payment_txn'::regclass\n  ) THEN\n    ALTER TABLE public.cashier_payment_txn\n      ADD CONSTRAINT cashier_payment_txn_type_check CHECK (txn_type IN ('payment', 'reversal'));\n  END IF;\nEND$$;\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_cashier_payment_txn_receipt_no\n  ON public.cashier_payment_txn (receipt_no)\n  WHERE receipt_no IS NOT NULL;\n\nCREATE TABLE IF NOT EXISTS public.bill_charge_source (\n  bill_charge_source_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  bill_id integer NOT NULL REFERENCES public.bill(bill_id) ON DELETE CASCADE,\n  bill_item_id integer REFERENCES public.bill_item(item_id) ON DELETE SET NULL,\n  source_type text NOT NULL,\n  source_id bigint,\n  amount numeric(12,2) NOT NULL DEFAULT 0,\n  meta_json jsonb,\n  created_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT now(),\n  CONSTRAINT bill_charge_source_type_check CHECK (source_type IN ('consultation', 'pharmacy', 'lab', 'other'))\n);\n\nCREATE INDEX IF NOT EXISTS idx_bill_charge_source_bill\n  ON public.bill_charge_source (bill_id, created_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_bill_charge_source_type\n  ON public.bill_charge_source (source_type, source_id);\n\nCREATE TABLE IF NOT EXISTS public.cashier_idempotency (\n  cashier_idempotency_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  idempotency_key varchar(120) NOT NULL,\n  endpoint text NOT NULL,\n  bill_id integer REFERENCES public.bill(bill_id) ON DELETE CASCADE,\n  request_hash text,\n  response_json jsonb NOT NULL,\n  status_code integer NOT NULL DEFAULT 200,\n  created_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT now(),\n  CONSTRAINT uq_cashier_idempotency UNIQUE (idempotency_key, endpoint)\n);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_idempotency_bill\n  ON public.cashier_idempotency (bill_id, created_at DESC);\n\nCREATE TABLE IF NOT EXISTS public.cashier_shift (\n  cashier_shift_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id),\n  opened_at timestamp without time zone NOT NULL DEFAULT now(),\n  closed_at timestamp without time zone,\n  opening_cash numeric(12,2) NOT NULL DEFAULT 0,\n  closing_cash_counted numeric(12,2),\n  expected_cash numeric(12,2),\n  variance numeric(12,2),\n  status text NOT NULL DEFAULT 'open',\n  notes text,\n  closed_by integer REFERENCES public.staff(staff_id),\n  CONSTRAINT cashier_shift_status_check CHECK (status IN ('open', 'closed'))\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_cashier_shift_open_per_staff\n  ON public.cashier_shift (staff_id)\n  WHERE status = 'open';\n\nCREATE INDEX IF NOT EXISTS idx_cashier_shift_opened_at\n  ON public.cashier_shift (opened_at DESC);\n\nCREATE TABLE IF NOT EXISTS public.cashier_audit_event (\n  cashier_audit_event_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  event_type text NOT NULL,\n  bill_id integer REFERENCES public.bill(bill_id) ON DELETE SET NULL,\n  visit_id integer REFERENCES public.visit(visit_id) ON DELETE SET NULL,\n  cashier_payment_txn_id bigint REFERENCES public.cashier_payment_txn(cashier_payment_txn_id) ON DELETE SET NULL,\n  actor_staff_id integer REFERENCES public.staff(staff_id),\n  before_json jsonb,\n  after_json jsonb,\n  reason_code text,\n  reason_note text,\n  created_at timestamp without time zone NOT NULL DEFAULT now()\n);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_audit_event_time\n  ON public.cashier_audit_event (created_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_audit_event_bill\n  ON public.cashier_audit_event (bill_id, created_at DESC);\n\nCOMMIT;"}	2026_03_23_pharmacy_cashier_settlement_fix_existing_txn_table	k224291@nu.edu.pk	\N	\N
20260323183558	{"BEGIN;\n\n-- Ensure settlement columns exist and have safe defaults.\nALTER TABLE public.pharmacy_sale\n  ADD COLUMN IF NOT EXISTS settlement_channel text,\n  ADD COLUMN IF NOT EXISTS settlement_status text,\n  ADD COLUMN IF NOT EXISTS settled_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS settled_by integer REFERENCES public.staff(staff_id);\n\nALTER TABLE public.pharmacy_sale\n  ALTER COLUMN settlement_channel SET DEFAULT 'pharmacy',\n  ALTER COLUMN settlement_status SET DEFAULT 'settled';\n\n-- Ensure expected settlement constraints exist.\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint\n    WHERE conname = 'pharmacy_sale_settlement_channel_check'\n      AND conrelid = 'public.pharmacy_sale'::regclass\n  ) THEN\n    ALTER TABLE public.pharmacy_sale\n      ADD CONSTRAINT pharmacy_sale_settlement_channel_check\n      CHECK (settlement_channel IN ('pharmacy', 'cashier'));\n  END IF;\n\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint\n    WHERE conname = 'pharmacy_sale_settlement_status_check'\n      AND conrelid = 'public.pharmacy_sale'::regclass\n  ) THEN\n    ALTER TABLE public.pharmacy_sale\n      ADD CONSTRAINT pharmacy_sale_settlement_status_check\n      CHECK (settlement_status IN ('pending', 'settled'));\n  END IF;\nEND$$;\n\n-- Reconcile settlement fields for legacy rows.\nUPDATE public.pharmacy_sale\nSET\n  settlement_channel = COALESCE(\n    settlement_channel,\n    CASE WHEN COALESCE(due_amount, 0) > 0 THEN 'cashier' ELSE 'pharmacy' END\n  ),\n  settlement_status = CASE\n    WHEN COALESCE(due_amount, 0) > 0 THEN 'pending'\n    ELSE 'settled'\n  END,\n  settled_at = CASE\n    WHEN COALESCE(due_amount, 0) > 0 THEN NULL\n    ELSE COALESCE(settled_at, sale_timestamp)\n  END,\n  settled_by = CASE\n    WHEN COALESCE(due_amount, 0) > 0 THEN NULL\n    ELSE settled_by\n  END\nWHERE\n  settlement_channel IS NULL\n  OR settlement_status IS NULL\n  OR (COALESCE(due_amount, 0) > 0 AND settlement_status <> 'pending')\n  OR (COALESCE(due_amount, 0) <= 0 AND settlement_status <> 'settled')\n  OR (COALESCE(due_amount, 0) <= 0 AND settled_at IS NULL)\n  OR (COALESCE(due_amount, 0) > 0 AND (settled_at IS NOT NULL OR settled_by IS NOT NULL));\n\n-- Patch drift: this table is expected by cashier draft routes.\nCREATE TABLE IF NOT EXISTS public.cashier_settlement_draft (\n  cashier_settlement_draft_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  bill_id integer NOT NULL REFERENCES public.bill(bill_id) ON DELETE CASCADE,\n  visit_id integer REFERENCES public.visit(visit_id) ON DELETE SET NULL,\n  amount numeric(12,2) NOT NULL,\n  payment_type character varying(50) NOT NULL,\n  payment_reference character varying(150),\n  notes text,\n  draft_status text NOT NULL DEFAULT 'open',\n  created_by integer REFERENCES public.staff(staff_id),\n  applied_cashier_payment_txn_id bigint REFERENCES public.cashier_payment_txn(cashier_payment_txn_id),\n  created_at timestamp without time zone NOT NULL DEFAULT now(),\n  updated_at timestamp without time zone NOT NULL DEFAULT now(),\n  CONSTRAINT cashier_settlement_draft_amount_check CHECK (amount > 0),\n  CONSTRAINT cashier_settlement_draft_status_check CHECK (draft_status IN ('open', 'applied', 'cancelled'))\n);\n\nCREATE INDEX IF NOT EXISTS idx_cashier_settlement_draft_bill\n  ON public.cashier_settlement_draft (bill_id, draft_status, created_at DESC);\n\nCOMMIT;"}	pharmacy_cashier_settlement_repair_2026_03_23	k224291@nu.edu.pk	\N	\N
20260323185935	{"BEGIN;\n\nCREATE OR REPLACE VIEW public.admin_cash_collected_ledger_v1 AS\nSELECT\n  txn.created_at AS collected_at,\n  CASE\n    WHEN txn.txn_type = 'payment' THEN txn.amount\n    WHEN txn.txn_type = 'reversal' THEN -ABS(txn.amount)\n    ELSE 0\n  END::numeric AS amount,\n  'cashier'::text AS source,\n  CONCAT('cashier_payment_txn:', txn.cashier_payment_txn_id)::text AS entity_ref\nFROM public.cashier_payment_txn txn\nWHERE txn.txn_type IN ('payment', 'reversal')\n\nUNION ALL\n\nSELECT\n  sale.sale_timestamp AS collected_at,\n  sale.total_amount::numeric AS amount,\n  'pharmacy'::text AS source,\n  CONCAT('pharmacy_sale:', sale.sale_id)::text AS entity_ref\nFROM public.pharmacy_sale sale\nWHERE sale.settlement_channel = 'pharmacy'\n  AND sale.settlement_status = 'settled';\n\nCOMMENT ON VIEW public.admin_cash_collected_ledger_v1 IS\n  'Normalized cash collected ledger for admin dashboard trends and totals (cashier net + pharmacy counter settled; anti-double-count by channel).';\n\nCOMMIT;"}	admin_cash_collected_ledger_view_2026_03_23	k224291@nu.edu.pk	\N	\N
20260324052148	{"-- Staff Management Foundation (Phase 0 + Phase 1/2 schema scaffolding)\n\n-- =========================\n-- Phase 0: Staff hardening\n-- =========================\n\nALTER TABLE public.staff\n  ADD COLUMN IF NOT EXISTS employment_status varchar(20) NOT NULL DEFAULT 'active',\n  ADD COLUMN IF NOT EXISTS joined_at date,\n  ADD COLUMN IF NOT EXISTS exited_at date,\n  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS account_locked_until timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS last_login_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,\n  ADD COLUMN IF NOT EXISTS password_reset_token varchar(128),\n  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,\n  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'staff_role_check'\n      AND conrelid = 'public.staff'::regclass\n  ) THEN\n    ALTER TABLE public.staff DROP CONSTRAINT staff_role_check;\n  END IF;\nEND $$;\n\nALTER TABLE public.staff\n  ADD CONSTRAINT staff_role_check\n  CHECK (\n    role::text = ANY (\n      ARRAY[\n        'Receptionist',\n        'Lab_Technician',\n        'Admin',\n        'Super Admin',\n        'Cashier',\n        'Pharmacist',\n        'Nurse',\n        'Doctor',\n        'Front_Desk',\n        'Billing',\n        'Technician',\n        'Housekeeping'\n      ]::text[]\n    )\n  );\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'staff_employment_status_check'\n      AND conrelid = 'public.staff'::regclass\n  ) THEN\n    ALTER TABLE public.staff\n      ADD CONSTRAINT staff_employment_status_check\n      CHECK (\n        employment_status::text = ANY (\n          ARRAY['active', 'inactive', 'suspended', 'resigned']::text[]\n        )\n      );\n  END IF;\nEND $$;\n\nCREATE TABLE IF NOT EXISTS public.staff_security_sessions (\n  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  user_code varchar(50) NOT NULL,\n  role varchar(50) NOT NULL,\n  login_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  last_seen_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  ip_address varchar(45),\n  user_agent text,\n  revoked_at timestamp without time zone,\n  revoked_reason varchar(120)\n);\n\nCREATE INDEX IF NOT EXISTS idx_staff_security_sessions_staff_revoked\n  ON public.staff_security_sessions (staff_id, revoked_at);\n\nCREATE INDEX IF NOT EXISTS idx_staff_security_sessions_last_seen\n  ON public.staff_security_sessions (last_seen_at DESC);\n\n-- =========================\n-- Phase 1: Directory + RBAC\n-- =========================\n\nALTER TABLE public.staff\n  ADD COLUMN IF NOT EXISTS photo_url text,\n  ADD COLUMN IF NOT EXISTS gender varchar(20),\n  ADD COLUMN IF NOT EXISTS dob date,\n  ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(120),\n  ADD COLUMN IF NOT EXISTS emergency_contact_number varchar(30),\n  ADD COLUMN IF NOT EXISTS address_line_1 varchar(255),\n  ADD COLUMN IF NOT EXISTS address_line_2 varchar(255),\n  ADD COLUMN IF NOT EXISTS city varchar(100),\n  ADD COLUMN IF NOT EXISTS state varchar(100),\n  ADD COLUMN IF NOT EXISTS postal_code varchar(20),\n  ADD COLUMN IF NOT EXISTS national_id varchar(80),\n  ADD COLUMN IF NOT EXISTS license_id varchar(80),\n  ADD COLUMN IF NOT EXISTS department varchar(120),\n  ADD COLUMN IF NOT EXISTS designation varchar(120),\n  ADD COLUMN IF NOT EXISTS employment_type varchar(40),\n  ADD COLUMN IF NOT EXISTS facility_code varchar(80),\n  ADD COLUMN IF NOT EXISTS branch_code varchar(80),\n  ADD COLUMN IF NOT EXISTS work_location varchar(150),\n  ADD COLUMN IF NOT EXISTS reporting_manager_staff_id integer REFERENCES public.staff(staff_id),\n  ADD COLUMN IF NOT EXISTS staff_tags text[] NOT NULL DEFAULT '{}'::text[];\n\nCREATE INDEX IF NOT EXISTS idx_staff_employment_status ON public.staff (employment_status);\nCREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff (department);\nCREATE INDEX IF NOT EXISTS idx_staff_facility_branch ON public.staff (facility_code, branch_code);\n\nCREATE TABLE IF NOT EXISTS public.staff_roles (\n  role_id serial PRIMARY KEY,\n  role_code varchar(50) UNIQUE NOT NULL,\n  role_name varchar(100) NOT NULL,\n  is_system boolean NOT NULL DEFAULT true,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nINSERT INTO public.staff_roles (role_code, role_name, is_system)\nVALUES\n  ('SUPER_ADMIN', 'Super Admin', true),\n  ('ADMIN', 'Admin', true),\n  ('DOCTOR', 'Doctor', true),\n  ('NURSE', 'Nurse', true),\n  ('LAB_TECHNICIAN', 'Lab Technician', true),\n  ('PHARMACIST', 'Pharmacist', true),\n  ('RECEPTIONIST', 'Receptionist', true),\n  ('CASHIER', 'Cashier', true),\n  ('FRONT_DESK', 'Front Desk', true),\n  ('BILLING', 'Billing', true),\n  ('TECHNICIAN', 'Technician', true),\n  ('HOUSEKEEPING', 'Housekeeping', true)\nON CONFLICT (role_code) DO NOTHING;\n\nCREATE TABLE IF NOT EXISTS public.staff_role_assignments (\n  assignment_id bigserial PRIMARY KEY,\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  role_id integer NOT NULL REFERENCES public.staff_roles(role_id) ON DELETE RESTRICT,\n  is_primary boolean NOT NULL DEFAULT false,\n  effective_from timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  effective_to timestamp without time zone,\n  assigned_by integer REFERENCES public.staff(staff_id),\n  assignment_note text\n);\n\nCREATE INDEX IF NOT EXISTS idx_staff_role_assignments_staff ON public.staff_role_assignments (staff_id, effective_to);\nCREATE INDEX IF NOT EXISTS idx_staff_role_assignments_role ON public.staff_role_assignments (role_id, effective_to);\n\nCREATE TABLE IF NOT EXISTS public.staff_permission_policies (\n  policy_id bigserial PRIMARY KEY,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  role_id integer REFERENCES public.staff_roles(role_id) ON DELETE CASCADE,\n  module varchar(80) NOT NULL,\n  action varchar(20) NOT NULL,\n  allowed boolean NOT NULL DEFAULT true,\n  scope_type varchar(20) NOT NULL DEFAULT 'global',\n  scope_value varchar(120),\n  granted_by integer REFERENCES public.staff(staff_id),\n  granted_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  expires_at timestamp without time zone,\n  CONSTRAINT staff_permission_target_check CHECK (\n    (staff_id IS NOT NULL AND role_id IS NULL)\n    OR (staff_id IS NULL AND role_id IS NOT NULL)\n  ),\n  CONSTRAINT staff_permission_action_check CHECK (\n    action::text = ANY (ARRAY['view', 'create', 'edit', 'delete', 'approve', 'export']::text[])\n  ),\n  CONSTRAINT staff_permission_scope_check CHECK (\n    scope_type::text = ANY (ARRAY['global', 'facility', 'branch', 'department']::text[])\n  )\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_staff_permission_policy\n  ON public.staff_permission_policies (COALESCE(staff_id, 0), COALESCE(role_id, 0), module, action, scope_type, COALESCE(scope_value, ''));\n\nCREATE TABLE IF NOT EXISTS public.staff_permission_audit (\n  event_id bigserial PRIMARY KEY,\n  policy_id bigint REFERENCES public.staff_permission_policies(policy_id) ON DELETE SET NULL,\n  actor_staff_id integer REFERENCES public.staff(staff_id),\n  event_type varchar(40) NOT NULL,\n  before_json jsonb,\n  after_json jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX IF NOT EXISTS idx_staff_permission_audit_created_at\n  ON public.staff_permission_audit (created_at DESC);\n\n-- =========================\n-- Phase 2: Attendance/Shift/Leave core\n-- =========================\n\nALTER TABLE public.staff_attendance\n  ADD COLUMN IF NOT EXISTS shift_code varchar(50),\n  ADD COLUMN IF NOT EXISTS check_in_source varchar(40),\n  ADD COLUMN IF NOT EXISTS check_out_source varchar(40),\n  ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS early_leave_minutes integer NOT NULL DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS attendance_notes text;\n\nCREATE INDEX IF NOT EXISTS idx_staff_attendance_date_staff ON public.staff_attendance (date, staff_id);\nCREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON public.staff_attendance (staff_id, date DESC);\n\nCREATE TABLE IF NOT EXISTS public.staff_shift_templates (\n  shift_template_id bigserial PRIMARY KEY,\n  shift_code varchar(50) UNIQUE NOT NULL,\n  shift_name varchar(120) NOT NULL,\n  start_time time NOT NULL,\n  end_time time NOT NULL,\n  is_night_shift boolean NOT NULL DEFAULT false,\n  is_split_shift boolean NOT NULL DEFAULT false,\n  department varchar(120),\n  facility_code varchar(80),\n  branch_code varchar(80),\n  max_staff integer,\n  min_staff integer,\n  created_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS public.staff_roster_assignments (\n  roster_id bigserial PRIMARY KEY,\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  shift_template_id bigint NOT NULL REFERENCES public.staff_shift_templates(shift_template_id) ON DELETE RESTRICT,\n  roster_date date NOT NULL,\n  department varchar(120),\n  ward varchar(120),\n  unit varchar(120),\n  on_call boolean NOT NULL DEFAULT false,\n  standby boolean NOT NULL DEFAULT false,\n  assignment_status varchar(20) NOT NULL DEFAULT 'scheduled',\n  assigned_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_staff_roster_staff_date\n  ON public.staff_roster_assignments (staff_id, roster_date);\n\nCREATE INDEX IF NOT EXISTS idx_staff_roster_date\n  ON public.staff_roster_assignments (roster_date, department);\n\nCREATE TABLE IF NOT EXISTS public.attendance_regularization_requests (\n  regularization_id bigserial PRIMARY KEY,\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  attendance_id uuid REFERENCES public.staff_attendance(attendance_id) ON DELETE SET NULL,\n  requested_check_in timestamp without time zone,\n  requested_check_out timestamp without time zone,\n  requested_status varchar(20),\n  reason text NOT NULL,\n  request_status varchar(20) NOT NULL DEFAULT 'pending',\n  approved_by integer REFERENCES public.staff(staff_id),\n  approved_at timestamp without time zone,\n  decision_note text,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX IF NOT EXISTS idx_attendance_regularization_status\n  ON public.attendance_regularization_requests (request_status, created_at DESC);\n\nCREATE TABLE IF NOT EXISTS public.staff_leave_types (\n  leave_type_id serial PRIMARY KEY,\n  leave_code varchar(40) UNIQUE NOT NULL,\n  leave_name varchar(100) NOT NULL,\n  default_annual_quota numeric(8,2),\n  is_paid boolean NOT NULL DEFAULT true,\n  requires_attachment boolean NOT NULL DEFAULT false,\n  active boolean NOT NULL DEFAULT true\n);\n\nINSERT INTO public.staff_leave_types (leave_code, leave_name, default_annual_quota, is_paid, requires_attachment, active)\nVALUES\n  ('CASUAL', 'Casual Leave', 12, true, false, true),\n  ('SICK', 'Sick Leave', 10, true, true, true),\n  ('ANNUAL', 'Annual Leave', 20, true, false, true),\n  ('MATERNITY', 'Maternity Leave', 90, true, true, true),\n  ('EMERGENCY', 'Emergency Leave', 6, true, false, true),\n  ('UNPAID', 'Unpaid Leave', NULL, false, false, true)\nON CONFLICT (leave_code) DO NOTHING;\n\nCREATE TABLE IF NOT EXISTS public.staff_leave_balances (\n  balance_id bigserial PRIMARY KEY,\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,\n  period_year integer NOT NULL,\n  opening_balance numeric(8,2) NOT NULL DEFAULT 0,\n  accrued numeric(8,2) NOT NULL DEFAULT 0,\n  consumed numeric(8,2) NOT NULL DEFAULT 0,\n  adjusted numeric(8,2) NOT NULL DEFAULT 0,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_staff_leave_balance\n  ON public.staff_leave_balances (staff_id, leave_type_id, period_year);\n\nCREATE TABLE IF NOT EXISTS public.staff_leave_requests (\n  leave_request_id bigserial PRIMARY KEY,\n  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,\n  from_date date NOT NULL,\n  to_date date NOT NULL,\n  is_half_day boolean NOT NULL DEFAULT false,\n  requested_hours numeric(6,2),\n  reason text,\n  attachment_url text,\n  request_status varchar(20) NOT NULL DEFAULT 'pending',\n  requested_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  final_approver integer REFERENCES public.staff(staff_id),\n  final_decision_at timestamp without time zone,\n  decision_note text\n);\n\nCREATE INDEX IF NOT EXISTS idx_staff_leave_requests_staff_status\n  ON public.staff_leave_requests (staff_id, request_status, requested_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_staff_leave_requests_range\n  ON public.staff_leave_requests (from_date, to_date, request_status);\n\nCREATE TABLE IF NOT EXISTS public.staff_leave_approvals (\n  approval_id bigserial PRIMARY KEY,\n  leave_request_id bigint NOT NULL REFERENCES public.staff_leave_requests(leave_request_id) ON DELETE CASCADE,\n  level_no integer NOT NULL,\n  approver_staff_id integer NOT NULL REFERENCES public.staff(staff_id),\n  approval_status varchar(20) NOT NULL DEFAULT 'pending',\n  note text,\n  acted_at timestamp without time zone\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_staff_leave_approval_level\n  ON public.staff_leave_approvals (leave_request_id, level_no, approver_staff_id);\n\n-- =========================\n-- Observability and retention\n-- =========================\n\nCREATE INDEX IF NOT EXISTS idx_audit_logs_created_at\n  ON public.audit_logs (created_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_audit_logs_staff_created\n  ON public.audit_logs (staff_id, created_at DESC);\n\nCREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days integer DEFAULT 365)\nRETURNS bigint\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  deleted_count bigint;\nBEGIN\n  DELETE FROM public.audit_logs\n  WHERE created_at < (CURRENT_TIMESTAMP - make_interval(days => p_days));\n\n  GET DIAGNOSTICS deleted_count = ROW_COUNT;\n  RETURN deleted_count;\nEND;\n$$;\n"}	staff_management_foundation_phase0_2	k224291@nu.edu.pk	\N	\N
20260324063616	{"-- Doctor security parity with staff security sessions\n\nALTER TABLE public.doctor\n  ADD COLUMN IF NOT EXISTS employment_status varchar(20) NOT NULL DEFAULT 'active',\n  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS account_locked_until timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS last_login_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,\n  ADD COLUMN IF NOT EXISTS password_reset_token varchar(128),\n  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamp without time zone,\n  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,\n  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'doctor_employment_status_check'\n      AND conrelid = 'public.doctor'::regclass\n  ) THEN\n    ALTER TABLE public.doctor\n      ADD CONSTRAINT doctor_employment_status_check\n      CHECK (\n        employment_status::text = ANY (\n          ARRAY['active', 'inactive', 'suspended', 'resigned']::text[]\n        )\n      );\n  END IF;\nEND $$;\n\nCREATE TABLE IF NOT EXISTS public.doctor_security_sessions (\n  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  doctor_id integer NOT NULL REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  user_code varchar(50) NOT NULL,\n  role varchar(50) NOT NULL DEFAULT 'Doctor',\n  login_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  last_seen_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  ip_address varchar(45),\n  user_agent text,\n  revoked_at timestamp without time zone,\n  revoked_reason varchar(120)\n);\n\nCREATE INDEX IF NOT EXISTS idx_doctor_security_sessions_doctor_revoked\n  ON public.doctor_security_sessions (doctor_id, revoked_at);\n\nCREATE INDEX IF NOT EXISTS idx_doctor_security_sessions_last_seen\n  ON public.doctor_security_sessions (last_seen_at DESC);\n"}	doctor_security_parity_2026_03_24	k224291@nu.edu.pk	\N	\N
20260324094841	{"-- Attendance Policy Foundation\n-- Global clinic policy settings + derived attendance fields\n\nINSERT INTO public.system_settings (setting_key, setting_value, description)\nVALUES\n  ('attendance_grace_minutes', '15', 'Grace period in minutes before marking late'),\n  ('attendance_half_day_minutes', '240', 'Worked minutes threshold under which day is treated as half-day'),\n  ('attendance_overtime_minutes', '30', 'Overtime threshold in minutes after shift end'),\n  ('attendance_early_leave_minutes', '30', 'Early leave threshold in minutes before shift end'),\n  ('attendance_timezone', '\\"Asia/Karachi\\"', 'Clinic timezone for attendance calculations'),\n  ('attendance_device_api_key', '\\"HMS_DEVICE_KEY_CHANGE_ME\\"', 'Shared key for device/kiosk attendance event ingestion')\nON CONFLICT (setting_key) DO NOTHING;\n\nALTER TABLE public.staff_attendance\n  ADD COLUMN IF NOT EXISTS roster_id bigint REFERENCES public.staff_roster_assignments(roster_id) ON DELETE SET NULL,\n  ADD COLUMN IF NOT EXISTS derived_status varchar(30) NOT NULL DEFAULT 'unscheduled',\n  ADD COLUMN IF NOT EXISTS is_unscheduled boolean NOT NULL DEFAULT true,\n  ADD COLUMN IF NOT EXISTS is_on_time boolean NOT NULL DEFAULT false,\n  ADD COLUMN IF NOT EXISTS policy_snapshot jsonb;\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'staff_attendance_derived_status_check'\n      AND conrelid = 'public.staff_attendance'::regclass\n  ) THEN\n    ALTER TABLE public.staff_attendance\n      ADD CONSTRAINT staff_attendance_derived_status_check\n      CHECK (\n        derived_status::text = ANY (\n          ARRAY[\n            'on_time',\n            'late',\n            'half_day',\n            'early_leave',\n            'overtime',\n            'unscheduled',\n            'absent',\n            'leave'\n          ]::text[]\n        )\n      );\n  END IF;\nEND $$;\n\nCREATE INDEX IF NOT EXISTS idx_staff_attendance_date_derived_status\n  ON public.staff_attendance (date, derived_status);\n\nCREATE INDEX IF NOT EXISTS idx_staff_attendance_roster_id\n  ON public.staff_attendance (roster_id);"}	attendance_policy_foundation_2026_03_24	k224291@nu.edu.pk	\N	\N
20260324100358	{"CREATE TABLE IF NOT EXISTS public.doctor_attendance (\n  attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  doctor_id integer NOT NULL REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  date date NOT NULL,\n  check_in_time timestamp without time zone,\n  check_out_time timestamp without time zone,\n  status varchar(20) NOT NULL DEFAULT 'Present',\n  marked_by varchar(50),\n  admin_id integer REFERENCES public.staff(staff_id),\n  roster_id bigint REFERENCES public.staff_roster_assignments(roster_id) ON DELETE SET NULL,\n  shift_code varchar(50),\n  check_in_source varchar(40),\n  check_out_source varchar(40),\n  late_minutes integer NOT NULL DEFAULT 0,\n  early_leave_minutes integer NOT NULL DEFAULT 0,\n  overtime_minutes integer NOT NULL DEFAULT 0,\n  break_minutes integer NOT NULL DEFAULT 0,\n  attendance_notes text,\n  derived_status varchar(30) NOT NULL DEFAULT 'unscheduled',\n  is_unscheduled boolean NOT NULL DEFAULT true,\n  is_on_time boolean NOT NULL DEFAULT false,\n  policy_snapshot jsonb,\n  UNIQUE (doctor_id, date)\n);\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'doctor_attendance_derived_status_check'\n      AND conrelid = 'public.doctor_attendance'::regclass\n  ) THEN\n    ALTER TABLE public.doctor_attendance\n      ADD CONSTRAINT doctor_attendance_derived_status_check\n      CHECK (\n        derived_status::text = ANY (\n          ARRAY['on_time','late','half_day','early_leave','overtime','unscheduled','absent','leave']::text[]\n        )\n      );\n  END IF;\nEND $$;\n\nCREATE INDEX IF NOT EXISTS idx_doctor_attendance_date_derived_status\n  ON public.doctor_attendance (date, derived_status);\n\nCREATE INDEX IF NOT EXISTS idx_doctor_attendance_doctor_date\n  ON public.doctor_attendance (doctor_id, date DESC);"}	doctor_attendance_foundation_2026_03_24_retry	k224291@nu.edu.pk	\N	\N
20260324150152	{"-- Unify roster and leave references so both staff and doctors can be treated as employees.\n\n-- =========================\n-- staff_roster_assignments\n-- =========================\nALTER TABLE public.staff_roster_assignments\n  ADD COLUMN IF NOT EXISTS account_type varchar(20),\n  ADD COLUMN IF NOT EXISTS person_id integer,\n  ADD COLUMN IF NOT EXISTS doctor_id integer;\n\nALTER TABLE public.staff_roster_assignments\n  ALTER COLUMN staff_id DROP NOT NULL;\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM information_schema.table_constraints\n    WHERE table_schema = 'public'\n      AND table_name = 'staff_roster_assignments'\n      AND constraint_name = 'staff_roster_assignments_doctor_id_fkey'\n  ) THEN\n    ALTER TABLE public.staff_roster_assignments\n      ADD CONSTRAINT staff_roster_assignments_doctor_id_fkey\n      FOREIGN KEY (doctor_id)\n      REFERENCES public.doctor(doctor_id)\n      ON DELETE CASCADE;\n  END IF;\nEND$$;\n\nUPDATE public.staff_roster_assignments\nSET\n  account_type = COALESCE(account_type, 'staff'),\n  person_id = COALESCE(person_id, staff_id)\nWHERE doctor_id IS NULL;\n\nUPDATE public.staff_roster_assignments\nSET\n  account_type = 'doctor',\n  person_id = COALESCE(person_id, doctor_id),\n  staff_id = NULL\nWHERE doctor_id IS NOT NULL;\n\nALTER TABLE public.staff_roster_assignments\n  ALTER COLUMN account_type SET DEFAULT 'staff';\n\nUPDATE public.staff_roster_assignments\nSET account_type = 'staff'\nWHERE account_type IS NULL;\n\nUPDATE public.staff_roster_assignments\nSET person_id = COALESCE(person_id, staff_id, doctor_id)\nWHERE person_id IS NULL;\n\nALTER TABLE public.staff_roster_assignments\n  ALTER COLUMN account_type SET NOT NULL,\n  ALTER COLUMN person_id SET NOT NULL;\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'staff_roster_assignments_employee_ref_check'\n      AND conrelid = 'public.staff_roster_assignments'::regclass\n  ) THEN\n    ALTER TABLE public.staff_roster_assignments\n      DROP CONSTRAINT staff_roster_assignments_employee_ref_check;\n  END IF;\n\n  ALTER TABLE public.staff_roster_assignments\n    ADD CONSTRAINT staff_roster_assignments_employee_ref_check\n    CHECK (\n      (\n        account_type = 'staff'\n        AND staff_id IS NOT NULL\n        AND doctor_id IS NULL\n        AND person_id = staff_id\n      )\n      OR\n      (\n        account_type = 'doctor'\n        AND doctor_id IS NOT NULL\n        AND staff_id IS NULL\n        AND person_id = doctor_id\n      )\n    );\nEND$$;\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_staff_roster_account_person_date\n  ON public.staff_roster_assignments (account_type, person_id, roster_date);\n\nCREATE INDEX IF NOT EXISTS idx_staff_roster_account_person_date\n  ON public.staff_roster_assignments (account_type, person_id, roster_date DESC);\n\n\n-- =========================\n-- staff_leave_requests\n-- =========================\nALTER TABLE public.staff_leave_requests\n  ADD COLUMN IF NOT EXISTS account_type varchar(20),\n  ADD COLUMN IF NOT EXISTS person_id integer,\n  ADD COLUMN IF NOT EXISTS doctor_id integer;\n\nALTER TABLE public.staff_leave_requests\n  ALTER COLUMN staff_id DROP NOT NULL;\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM information_schema.table_constraints\n    WHERE table_schema = 'public'\n      AND table_name = 'staff_leave_requests'\n      AND constraint_name = 'staff_leave_requests_doctor_id_fkey'\n  ) THEN\n    ALTER TABLE public.staff_leave_requests\n      ADD CONSTRAINT staff_leave_requests_doctor_id_fkey\n      FOREIGN KEY (doctor_id)\n      REFERENCES public.doctor(doctor_id)\n      ON DELETE CASCADE;\n  END IF;\nEND$$;\n\nUPDATE public.staff_leave_requests\nSET\n  account_type = COALESCE(account_type, 'staff'),\n  person_id = COALESCE(person_id, staff_id)\nWHERE doctor_id IS NULL;\n\nUPDATE public.staff_leave_requests\nSET\n  account_type = 'doctor',\n  person_id = COALESCE(person_id, doctor_id),\n  staff_id = NULL\nWHERE doctor_id IS NOT NULL;\n\nALTER TABLE public.staff_leave_requests\n  ALTER COLUMN account_type SET DEFAULT 'staff';\n\nUPDATE public.staff_leave_requests\nSET account_type = 'staff'\nWHERE account_type IS NULL;\n\nUPDATE public.staff_leave_requests\nSET person_id = COALESCE(person_id, staff_id, doctor_id)\nWHERE person_id IS NULL;\n\nALTER TABLE public.staff_leave_requests\n  ALTER COLUMN account_type SET NOT NULL,\n  ALTER COLUMN person_id SET NOT NULL;\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'staff_leave_requests_employee_ref_check'\n      AND conrelid = 'public.staff_leave_requests'::regclass\n  ) THEN\n    ALTER TABLE public.staff_leave_requests\n      DROP CONSTRAINT staff_leave_requests_employee_ref_check;\n  END IF;\n\n  ALTER TABLE public.staff_leave_requests\n    ADD CONSTRAINT staff_leave_requests_employee_ref_check\n    CHECK (\n      (\n        account_type = 'staff'\n        AND staff_id IS NOT NULL\n        AND doctor_id IS NULL\n        AND person_id = staff_id\n      )\n      OR\n      (\n        account_type = 'doctor'\n        AND doctor_id IS NOT NULL\n        AND staff_id IS NULL\n        AND person_id = doctor_id\n      )\n    );\nEND$$;\n\nCREATE INDEX IF NOT EXISTS idx_staff_leave_requests_person_status\n  ON public.staff_leave_requests (account_type, person_id, request_status, requested_at DESC);"}	employee_roster_leave_unification	k224291@nu.edu.pk	\N	\N
20260324165129	{"-- Workforce Finance + Employee Portal Foundation\n-- Supabase source-of-truth aligned migration\n\n-- =========================\n-- Compensation profiles\n-- =========================\nCREATE TABLE IF NOT EXISTS public.employee_compensation_profile (\n  compensation_id bigserial PRIMARY KEY,\n  account_type varchar(20) NOT NULL,\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  salary_model varchar(30) NOT NULL DEFAULT 'fixed_monthly',\n  payroll_cycle varchar(20) NOT NULL DEFAULT 'monthly',\n  base_monthly_salary numeric(12,2) NOT NULL DEFAULT 0,\n  per_patient_fee numeric(12,2) NOT NULL DEFAULT 0,\n  active_from date NOT NULL DEFAULT CURRENT_DATE,\n  active_to date,\n  notes text,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_compensation_account_type_check\n    CHECK (account_type IN ('staff', 'doctor')),\n  CONSTRAINT employee_compensation_salary_model_check\n    CHECK (salary_model IN ('fixed_monthly', 'per_patient_seen')),\n  CONSTRAINT employee_compensation_payroll_cycle_check\n    CHECK (payroll_cycle IN ('monthly')),\n  CONSTRAINT employee_compensation_ref_check\n    CHECK (\n      (\n        account_type = 'staff'\n        AND staff_id IS NOT NULL\n        AND doctor_id IS NULL\n        AND person_id = staff_id\n      )\n      OR\n      (\n        account_type = 'doctor'\n        AND doctor_id IS NOT NULL\n        AND staff_id IS NULL\n        AND person_id = doctor_id\n      )\n    )\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_employee_compensation_profile_person\n  ON public.employee_compensation_profile (account_type, person_id, active_from);\n\nCREATE INDEX IF NOT EXISTS idx_employee_compensation_profile_active\n  ON public.employee_compensation_profile (account_type, person_id, active_to);\n\n-- =========================\n-- Allowances\n-- =========================\nCREATE TABLE IF NOT EXISTS public.employee_allowance (\n  allowance_id bigserial PRIMARY KEY,\n  account_type varchar(20) NOT NULL,\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  allowance_code varchar(40) NOT NULL,\n  allowance_name varchar(120) NOT NULL,\n  amount numeric(12,2) NOT NULL DEFAULT 0,\n  allowance_mode varchar(20) NOT NULL DEFAULT 'recurring',\n  taxable boolean NOT NULL DEFAULT false,\n  is_active boolean NOT NULL DEFAULT true,\n  effective_from date NOT NULL DEFAULT CURRENT_DATE,\n  effective_to date,\n  notes text,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_allowance_account_type_check\n    CHECK (account_type IN ('staff', 'doctor')),\n  CONSTRAINT employee_allowance_mode_check\n    CHECK (allowance_mode IN ('recurring', 'one_time')),\n  CONSTRAINT employee_allowance_ref_check\n    CHECK (\n      (\n        account_type = 'staff'\n        AND staff_id IS NOT NULL\n        AND doctor_id IS NULL\n        AND person_id = staff_id\n      )\n      OR\n      (\n        account_type = 'doctor'\n        AND doctor_id IS NOT NULL\n        AND staff_id IS NULL\n        AND person_id = doctor_id\n      )\n    )\n);\n\nCREATE INDEX IF NOT EXISTS idx_employee_allowance_person_active\n  ON public.employee_allowance (account_type, person_id, is_active, effective_from, effective_to);\n\n-- =========================\n-- Payroll runs\n-- =========================\nCREATE TABLE IF NOT EXISTS public.payroll_run (\n  payroll_run_id bigserial PRIMARY KEY,\n  period_month date NOT NULL,\n  status varchar(20) NOT NULL DEFAULT 'draft',\n  generated_by integer REFERENCES public.staff(staff_id),\n  finalized_by integer REFERENCES public.staff(staff_id),\n  generated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  finalized_at timestamp without time zone,\n  notes text,\n  CONSTRAINT payroll_run_status_check\n    CHECK (status IN ('draft', 'finalized', 'void')),\n  CONSTRAINT payroll_run_month_first_day_check\n    CHECK (date_trunc('month', period_month)::date = period_month)\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_run_period_month\n  ON public.payroll_run (period_month);\n\nCREATE TABLE IF NOT EXISTS public.payroll_line_item (\n  payroll_line_id bigserial PRIMARY KEY,\n  payroll_run_id bigint NOT NULL REFERENCES public.payroll_run(payroll_run_id) ON DELETE CASCADE,\n  account_type varchar(20) NOT NULL,\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  salary_model varchar(30) NOT NULL,\n  base_amount numeric(12,2) NOT NULL DEFAULT 0,\n  patient_count integer NOT NULL DEFAULT 0,\n  per_patient_fee numeric(12,2) NOT NULL DEFAULT 0,\n  allowance_total numeric(12,2) NOT NULL DEFAULT 0,\n  deduction_total numeric(12,2) NOT NULL DEFAULT 0,\n  adjustment_total numeric(12,2) NOT NULL DEFAULT 0,\n  gross_amount numeric(12,2) NOT NULL DEFAULT 0,\n  net_amount numeric(12,2) NOT NULL DEFAULT 0,\n  calc_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT payroll_line_account_type_check\n    CHECK (account_type IN ('staff', 'doctor')),\n  CONSTRAINT payroll_line_salary_model_check\n    CHECK (salary_model IN ('fixed_monthly', 'per_patient_seen')),\n  CONSTRAINT payroll_line_ref_check\n    CHECK (\n      (\n        account_type = 'staff'\n        AND staff_id IS NOT NULL\n        AND doctor_id IS NULL\n        AND person_id = staff_id\n      )\n      OR\n      (\n        account_type = 'doctor'\n        AND doctor_id IS NOT NULL\n        AND staff_id IS NULL\n        AND person_id = doctor_id\n      )\n    )\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_line_item_per_run\n  ON public.payroll_line_item (payroll_run_id, account_type, person_id);\n\nCREATE INDEX IF NOT EXISTS idx_payroll_line_item_person\n  ON public.payroll_line_item (account_type, person_id, created_at DESC);\n\n-- =========================\n-- Finance expenses and assets\n-- =========================\nCREATE TABLE IF NOT EXISTS public.finance_expense_entry (\n  expense_id bigserial PRIMARY KEY,\n  expense_date date NOT NULL,\n  category varchar(60) NOT NULL,\n  subcategory varchar(60),\n  amount numeric(12,2) NOT NULL,\n  vendor_name varchar(120),\n  reference_no varchar(120),\n  payment_mode varchar(40),\n  notes text,\n  created_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX IF NOT EXISTS idx_finance_expense_entry_date\n  ON public.finance_expense_entry (expense_date DESC, category);\n\nCREATE TABLE IF NOT EXISTS public.finance_asset_purchase (\n  asset_purchase_id bigserial PRIMARY KEY,\n  purchase_date date NOT NULL,\n  asset_name varchar(180) NOT NULL,\n  asset_category varchar(80) NOT NULL,\n  amount numeric(12,2) NOT NULL,\n  vendor_name varchar(120),\n  reference_no varchar(120),\n  useful_life_months integer,\n  notes text,\n  created_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX IF NOT EXISTS idx_finance_asset_purchase_date\n  ON public.finance_asset_purchase (purchase_date DESC, asset_category);\n\n-- =========================\n-- Leave policy defaults/overrides\n-- =========================\nCREATE TABLE IF NOT EXISTS public.leave_role_quota (\n  role_quota_id bigserial PRIMARY KEY,\n  role_name varchar(80) NOT NULL,\n  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,\n  annual_quota numeric(8,2) NOT NULL,\n  active boolean NOT NULL DEFAULT true,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE (role_name, leave_type_id)\n);\n\nCREATE TABLE IF NOT EXISTS public.leave_employee_quota_override (\n  override_id bigserial PRIMARY KEY,\n  account_type varchar(20) NOT NULL,\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,\n  annual_quota numeric(8,2) NOT NULL,\n  active boolean NOT NULL DEFAULT true,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT leave_employee_override_account_type_check\n    CHECK (account_type IN ('staff', 'doctor')),\n  CONSTRAINT leave_employee_override_ref_check\n    CHECK (\n      (\n        account_type = 'staff'\n        AND staff_id IS NOT NULL\n        AND doctor_id IS NULL\n        AND person_id = staff_id\n      )\n      OR\n      (\n        account_type = 'doctor'\n        AND doctor_id IS NOT NULL\n        AND staff_id IS NULL\n        AND person_id = doctor_id\n      )\n    ),\n  UNIQUE (account_type, person_id, leave_type_id)\n);\n\n-- =========================\n-- Backward-compatible leave balance extension\n-- =========================\nALTER TABLE public.staff_leave_balances\n  ADD COLUMN IF NOT EXISTS account_type varchar(20),\n  ADD COLUMN IF NOT EXISTS person_id integer,\n  ADD COLUMN IF NOT EXISTS doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;\n\nUPDATE public.staff_leave_balances\nSET account_type = COALESCE(account_type, 'staff'),\n    person_id = COALESCE(person_id, staff_id)\nWHERE account_type IS NULL OR person_id IS NULL;\n\nALTER TABLE public.staff_leave_balances\n  ALTER COLUMN account_type SET DEFAULT 'staff';\n\nALTER TABLE public.staff_leave_balances\n  ALTER COLUMN account_type SET NOT NULL;\n\nALTER TABLE public.staff_leave_balances\n  ALTER COLUMN person_id SET NOT NULL;\n\nDO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1\n    FROM pg_constraint\n    WHERE conname = 'staff_leave_balances_account_type_check'\n      AND conrelid = 'public.staff_leave_balances'::regclass\n  ) THEN\n    ALTER TABLE public.staff_leave_balances\n      ADD CONSTRAINT staff_leave_balances_account_type_check\n      CHECK (account_type IN ('staff', 'doctor'));\n  END IF;\nEND $$;\n\nDO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_indexes\n    WHERE schemaname = 'public'\n      AND indexname = 'uq_staff_leave_balance'\n  ) THEN\n    DROP INDEX public.uq_staff_leave_balance;\n  END IF;\nEND $$;\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_staff_leave_balance_account_person\n  ON public.staff_leave_balances (account_type, person_id, leave_type_id, period_year);\n\n-- Seed role quotas from existing leave defaults for common workforce roles.\nINSERT INTO public.leave_role_quota (role_name, leave_type_id, annual_quota)\nSELECT role_name, lt.leave_type_id, COALESCE(lt.default_annual_quota, 0)\nFROM (VALUES\n  ('Receptionist'),\n  ('Lab_Technician'),\n  ('Admin'),\n  ('Super Admin'),\n  ('Cashier'),\n  ('Pharmacist'),\n  ('Nurse'),\n  ('Doctor'),\n  ('Front_Desk'),\n  ('Billing'),\n  ('Technician'),\n  ('Housekeeping')\n) AS roles(role_name)\nCROSS JOIN public.staff_leave_types lt\nON CONFLICT (role_name, leave_type_id) DO NOTHING;"}	workforce_finance_employee_portal_foundation	k224291@nu.edu.pk	\N	\N
20260324165615	{"-- Workforce finance static masters\n-- Date: 2026-03-24\n\ncreate table if not exists public.allowance_type_master (\n  code text primary key,\n  label text not null,\n  description text,\n  taxable boolean not null default true,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\ncreate table if not exists public.finance_expense_category (\n  code text primary key,\n  label text not null,\n  description text,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\ninsert into public.allowance_type_master (code, label, description, taxable)\nvalues\n  ('transport', 'Transport Allowance', 'Recurring or ad-hoc transport support', true),\n  ('meal', 'Meal Allowance', 'Meal subsidy or food support', true),\n  ('housing', 'Housing Allowance', 'Rent or housing support', true),\n  ('medical', 'Medical Allowance', 'General medical support for staff', false),\n  ('communication', 'Communication Allowance', 'Phone/internet reimbursement', true),\n  ('other', 'Other Allowance', 'Any custom allowance type', true)\non conflict (code) do update set\n  label = excluded.label,\n  description = excluded.description,\n  taxable = excluded.taxable,\n  updated_at = now();\n\ninsert into public.finance_expense_category (code, label, description)\nvalues\n  ('utilities', 'Utilities', 'Electricity, water, internet and utility bills'),\n  ('inventory', 'Inventory', 'General inventory not tracked as medicine purchase'),\n  ('maintenance', 'Maintenance', 'Repairs and upkeep'),\n  ('rent', 'Rent', 'Facility rent and related charges'),\n  ('equipment_service', 'Equipment Service', 'Machine service and AMC costs'),\n  ('salary_related', 'Salary Related', 'Payroll-linked overhead costs'),\n  ('other', 'Other', 'Any uncategorized operating expense')\non conflict (code) do update set\n  label = excluded.label,\n  description = excluded.description,\n  updated_at = now();"}	workforce_finance_default_masters	k224291@nu.edu.pk	\N	\N
20260324193702	{"-- Global system timezone governance\n-- Adds authoritative system_timezone key in system_settings.\n\nINSERT INTO public.system_settings (setting_key, setting_value, description)\nSELECT\n  'system_timezone',\n  COALESCE(\n    (SELECT setting_value FROM public.system_settings WHERE setting_key = 'attendance_timezone' LIMIT 1),\n    '\\"Asia/Karachi\\"'::jsonb\n  ),\n  'Global HMS timezone used for business-day boundaries and date/time rendering'\nON CONFLICT (setting_key) DO UPDATE\nSET\n  setting_value = EXCLUDED.setting_value,\n  description = EXCLUDED.description,\n  updated_at = NOW();"}	global_system_timezone	k224291@nu.edu.pk	\N	\N
20260325121958	{"-- Staff Management Compliance Modules (Credentialing + Documents + Lifecycle + Analytics foundations)\n\n-- =========================\n-- Credentialing\n-- =========================\n\nCREATE TABLE IF NOT EXISTS public.employee_credential_types (\n  credential_type_id serial PRIMARY KEY,\n  credential_code varchar(60) NOT NULL UNIQUE,\n  credential_name varchar(140) NOT NULL,\n  credential_category varchar(80),\n  issuing_authority_default varchar(160),\n  validity_months integer,\n  renewal_window_days integer NOT NULL DEFAULT 60,\n  active boolean NOT NULL DEFAULT true,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS public.employee_credentials (\n  credential_id bigserial PRIMARY KEY,\n  account_type varchar(20) NOT NULL DEFAULT 'staff',\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  credential_type_id integer NOT NULL REFERENCES public.employee_credential_types(credential_type_id) ON DELETE RESTRICT,\n  credential_number varchar(120) NOT NULL,\n  credential_title varchar(160),\n  issued_on date,\n  expires_on date,\n  issuing_authority varchar(160),\n  issuing_country varchar(80),\n  verification_status varchar(30) NOT NULL DEFAULT 'draft',\n  renewal_status varchar(30) NOT NULL DEFAULT 'not_due',\n  reminder_status varchar(30) NOT NULL DEFAULT 'none',\n  submitted_at timestamp without time zone,\n  reviewed_by integer REFERENCES public.staff(staff_id),\n  reviewed_at timestamp without time zone,\n  review_note text,\n  verified_at timestamp without time zone,\n  revoked_by integer REFERENCES public.staff(staff_id),\n  revoked_at timestamp without time zone,\n  revoke_reason text,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_credentials_account_type_check CHECK (\n    account_type::text = ANY (ARRAY['staff', 'doctor']::text[])\n  ),\n  CONSTRAINT employee_credentials_status_check CHECK (\n    verification_status::text = ANY (\n      ARRAY['draft', 'submitted', 'under_review', 'verified', 'rejected', 'revoked', 'expired']::text[]\n    )\n  ),\n  CONSTRAINT employee_credentials_renewal_status_check CHECK (\n    renewal_status::text = ANY (\n      ARRAY['not_due', 'due', 'in_progress', 'renewed', 'overdue', 'blocked']::text[]\n    )\n  ),\n  CONSTRAINT employee_credentials_employee_ref_check CHECK (\n    (\n      account_type = 'staff'\n      AND staff_id IS NOT NULL\n      AND doctor_id IS NULL\n      AND person_id = staff_id\n    )\n    OR\n    (\n      account_type = 'doctor'\n      AND doctor_id IS NOT NULL\n      AND staff_id IS NULL\n      AND person_id = doctor_id\n    )\n  )\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_employee_credentials_unique_number\n  ON public.employee_credentials (credential_type_id, credential_number, account_type, person_id);\n\nCREATE INDEX IF NOT EXISTS idx_employee_credentials_expiry\n  ON public.employee_credentials (expires_on, verification_status);\n\nCREATE INDEX IF NOT EXISTS idx_employee_credentials_employee\n  ON public.employee_credentials (account_type, person_id, verification_status);\n\nCREATE TABLE IF NOT EXISTS public.employee_credential_events (\n  credential_event_id bigserial PRIMARY KEY,\n  credential_id bigint NOT NULL REFERENCES public.employee_credentials(credential_id) ON DELETE CASCADE,\n  actor_staff_id integer REFERENCES public.staff(staff_id),\n  event_type varchar(40) NOT NULL,\n  from_status varchar(30),\n  to_status varchar(30),\n  event_note text,\n  payload jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX IF NOT EXISTS idx_employee_credential_events_credential\n  ON public.employee_credential_events (credential_id, created_at DESC);\n\n-- =========================\n-- Documents\n-- =========================\n\nCREATE TABLE IF NOT EXISTS public.employee_document_types (\n  document_type_id serial PRIMARY KEY,\n  document_code varchar(60) NOT NULL UNIQUE,\n  document_name varchar(140) NOT NULL,\n  document_category varchar(80),\n  required_default boolean NOT NULL DEFAULT false,\n  requires_expiry boolean NOT NULL DEFAULT false,\n  retention_days integer,\n  active boolean NOT NULL DEFAULT true,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS public.employee_documents (\n  document_id bigserial PRIMARY KEY,\n  account_type varchar(20) NOT NULL DEFAULT 'staff',\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  document_type_id integer NOT NULL REFERENCES public.employee_document_types(document_type_id) ON DELETE RESTRICT,\n  document_title varchar(180) NOT NULL,\n  document_description text,\n  review_status varchar(30) NOT NULL DEFAULT 'draft',\n  visibility varchar(20) NOT NULL DEFAULT 'internal',\n  current_version_no integer NOT NULL DEFAULT 0,\n  effective_from date,\n  effective_to date,\n  expires_on date,\n  required_by date,\n  submitted_by integer REFERENCES public.staff(staff_id),\n  submitted_at timestamp without time zone,\n  reviewed_by integer REFERENCES public.staff(staff_id),\n  reviewed_at timestamp without time zone,\n  review_note text,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_documents_account_type_check CHECK (\n    account_type::text = ANY (ARRAY['staff', 'doctor']::text[])\n  ),\n  CONSTRAINT employee_documents_review_status_check CHECK (\n    review_status::text = ANY (\n      ARRAY['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'archived']::text[]\n    )\n  ),\n  CONSTRAINT employee_documents_visibility_check CHECK (\n    visibility::text = ANY (ARRAY['internal', 'restricted', 'confidential']::text[])\n  ),\n  CONSTRAINT employee_documents_employee_ref_check CHECK (\n    (\n      account_type = 'staff'\n      AND staff_id IS NOT NULL\n      AND doctor_id IS NULL\n      AND person_id = staff_id\n    )\n    OR\n    (\n      account_type = 'doctor'\n      AND doctor_id IS NOT NULL\n      AND staff_id IS NULL\n      AND person_id = doctor_id\n    )\n  )\n);\n\nCREATE INDEX IF NOT EXISTS idx_employee_documents_status\n  ON public.employee_documents (review_status, expires_on);\n\nCREATE INDEX IF NOT EXISTS idx_employee_documents_employee\n  ON public.employee_documents (account_type, person_id, document_type_id);\n\nCREATE TABLE IF NOT EXISTS public.employee_document_versions (\n  version_id bigserial PRIMARY KEY,\n  document_id bigint NOT NULL REFERENCES public.employee_documents(document_id) ON DELETE CASCADE,\n  version_no integer NOT NULL,\n  storage_path text,\n  file_url text,\n  file_name varchar(255),\n  mime_type varchar(120),\n  file_size_bytes bigint,\n  checksum_sha256 varchar(128),\n  uploaded_by integer REFERENCES public.staff(staff_id),\n  uploaded_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  is_active boolean NOT NULL DEFAULT true,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  CONSTRAINT employee_document_versions_version_no_check CHECK (version_no > 0)\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_employee_document_versions_doc_version\n  ON public.employee_document_versions (document_id, version_no);\n\nCREATE INDEX IF NOT EXISTS idx_employee_document_versions_document\n  ON public.employee_document_versions (document_id, uploaded_at DESC);\n\nCREATE TABLE IF NOT EXISTS public.employee_document_reviews (\n  document_review_id bigserial PRIMARY KEY,\n  document_id bigint NOT NULL REFERENCES public.employee_documents(document_id) ON DELETE CASCADE,\n  version_id bigint REFERENCES public.employee_document_versions(version_id) ON DELETE SET NULL,\n  reviewer_staff_id integer REFERENCES public.staff(staff_id),\n  review_action varchar(30) NOT NULL,\n  review_note text,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_document_reviews_action_check CHECK (\n    review_action::text = ANY (\n      ARRAY['submitted', 'under_review', 'approved', 'rejected', 'requested_changes', 'archived']::text[]\n    )\n  )\n);\n\nCREATE INDEX IF NOT EXISTS idx_employee_document_reviews_document\n  ON public.employee_document_reviews (document_id, created_at DESC);\n\nCREATE TABLE IF NOT EXISTS public.employee_document_requirements (\n  requirement_id bigserial PRIMARY KEY,\n  document_type_id integer NOT NULL REFERENCES public.employee_document_types(document_type_id) ON DELETE CASCADE,\n  target_type varchar(30) NOT NULL,\n  target_value varchar(120),\n  mandatory boolean NOT NULL DEFAULT true,\n  due_days_from_joining integer,\n  recurrence_days integer,\n  active boolean NOT NULL DEFAULT true,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_document_requirements_target_type_check CHECK (\n    target_type::text = ANY (ARRAY['global', 'role', 'department', 'facility', 'account_type']::text[])\n  )\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_employee_document_requirement_scope\n  ON public.employee_document_requirements (document_type_id, target_type, COALESCE(target_value, ''));\n\n-- =========================\n-- Lifecycle\n-- =========================\n\nCREATE TABLE IF NOT EXISTS public.employee_lifecycle_templates (\n  lifecycle_template_id bigserial PRIMARY KEY,\n  template_code varchar(60) NOT NULL UNIQUE,\n  template_name varchar(140) NOT NULL,\n  lifecycle_type varchar(30) NOT NULL,\n  applies_to varchar(20) NOT NULL DEFAULT 'both',\n  role_code varchar(80),\n  department varchar(120),\n  facility_code varchar(80),\n  is_active boolean NOT NULL DEFAULT true,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_by integer REFERENCES public.staff(staff_id),\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_lifecycle_templates_type_check CHECK (\n    lifecycle_type::text = ANY (ARRAY['onboarding', 'offboarding', 'probation', 'transfer']::text[])\n  ),\n  CONSTRAINT employee_lifecycle_templates_applies_to_check CHECK (\n    applies_to::text = ANY (ARRAY['staff', 'doctor', 'both']::text[])\n  )\n);\n\nCREATE TABLE IF NOT EXISTS public.employee_lifecycle_template_tasks (\n  lifecycle_template_task_id bigserial PRIMARY KEY,\n  lifecycle_template_id bigint NOT NULL REFERENCES public.employee_lifecycle_templates(lifecycle_template_id) ON DELETE CASCADE,\n  task_code varchar(80) NOT NULL,\n  task_name varchar(180) NOT NULL,\n  task_group varchar(80),\n  sequence_no integer NOT NULL DEFAULT 1,\n  default_owner_role varchar(80),\n  mandatory boolean NOT NULL DEFAULT true,\n  due_offset_days integer,\n  requires_document_type_id integer REFERENCES public.employee_document_types(document_type_id) ON DELETE SET NULL,\n  blocks_transition boolean NOT NULL DEFAULT true,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_employee_lifecycle_template_task_code\n  ON public.employee_lifecycle_template_tasks (lifecycle_template_id, task_code);\n\nCREATE TABLE IF NOT EXISTS public.employee_lifecycle_runs (\n  lifecycle_run_id bigserial PRIMARY KEY,\n  account_type varchar(20) NOT NULL DEFAULT 'staff',\n  person_id integer NOT NULL,\n  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,\n  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,\n  lifecycle_template_id bigint REFERENCES public.employee_lifecycle_templates(lifecycle_template_id) ON DELETE SET NULL,\n  lifecycle_type varchar(30) NOT NULL,\n  run_status varchar(30) NOT NULL DEFAULT 'draft',\n  started_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  completed_at timestamp without time zone,\n  initiated_by integer REFERENCES public.staff(staff_id),\n  summary_note text,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_lifecycle_runs_account_type_check CHECK (\n    account_type::text = ANY (ARRAY['staff', 'doctor']::text[])\n  ),\n  CONSTRAINT employee_lifecycle_runs_type_check CHECK (\n    lifecycle_type::text = ANY (ARRAY['onboarding', 'offboarding', 'probation', 'transfer']::text[])\n  ),\n  CONSTRAINT employee_lifecycle_runs_status_check CHECK (\n    run_status::text = ANY (ARRAY['draft', 'in_progress', 'blocked', 'completed', 'cancelled']::text[])\n  ),\n  CONSTRAINT employee_lifecycle_runs_employee_ref_check CHECK (\n    (\n      account_type = 'staff'\n      AND staff_id IS NOT NULL\n      AND doctor_id IS NULL\n      AND person_id = staff_id\n    )\n    OR\n    (\n      account_type = 'doctor'\n      AND doctor_id IS NOT NULL\n      AND staff_id IS NULL\n      AND person_id = doctor_id\n    )\n  )\n);\n\nCREATE INDEX IF NOT EXISTS idx_employee_lifecycle_runs_status\n  ON public.employee_lifecycle_runs (run_status, lifecycle_type, started_at DESC);\n\nCREATE INDEX IF NOT EXISTS idx_employee_lifecycle_runs_employee\n  ON public.employee_lifecycle_runs (account_type, person_id, run_status);\n\nCREATE TABLE IF NOT EXISTS public.employee_lifecycle_tasks (\n  lifecycle_task_id bigserial PRIMARY KEY,\n  lifecycle_run_id bigint NOT NULL REFERENCES public.employee_lifecycle_runs(lifecycle_run_id) ON DELETE CASCADE,\n  lifecycle_template_task_id bigint REFERENCES public.employee_lifecycle_template_tasks(lifecycle_template_task_id) ON DELETE SET NULL,\n  task_code varchar(80) NOT NULL,\n  task_name varchar(180) NOT NULL,\n  task_group varchar(80),\n  owner_staff_id integer REFERENCES public.staff(staff_id),\n  task_status varchar(30) NOT NULL DEFAULT 'pending',\n  due_at timestamp without time zone,\n  completed_at timestamp without time zone,\n  completed_by integer REFERENCES public.staff(staff_id),\n  completion_note text,\n  evidence_document_id bigint REFERENCES public.employee_documents(document_id) ON DELETE SET NULL,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT employee_lifecycle_tasks_status_check CHECK (\n    task_status::text = ANY (\n      ARRAY['pending', 'in_progress', 'completed', 'skipped', 'blocked', 'cancelled', 'overdue']::text[]\n    )\n  )\n);\n\nCREATE UNIQUE INDEX IF NOT EXISTS uq_employee_lifecycle_tasks_run_task_code\n  ON public.employee_lifecycle_tasks (lifecycle_run_id, task_code);\n\nCREATE INDEX IF NOT EXISTS idx_employee_lifecycle_tasks_status_due\n  ON public.employee_lifecycle_tasks (task_status, due_at);\n\nCREATE TABLE IF NOT EXISTS public.employee_lifecycle_events (\n  lifecycle_event_id bigserial PRIMARY KEY,\n  lifecycle_run_id bigint REFERENCES public.employee_lifecycle_runs(lifecycle_run_id) ON DELETE CASCADE,\n  lifecycle_task_id bigint REFERENCES public.employee_lifecycle_tasks(lifecycle_task_id) ON DELETE CASCADE,\n  actor_staff_id integer REFERENCES public.staff(staff_id),\n  event_type varchar(40) NOT NULL,\n  from_status varchar(30),\n  to_status varchar(30),\n  event_note text,\n  payload jsonb,\n  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX IF NOT EXISTS idx_employee_lifecycle_events_run\n  ON public.employee_lifecycle_events (lifecycle_run_id, created_at DESC);\n\n-- =========================\n-- Seed defaults\n-- =========================\n\nINSERT INTO public.employee_credential_types (credential_code, credential_name, credential_category, issuing_authority_default, validity_months, renewal_window_days, active)\nVALUES\n  ('MED_LICENSE', 'Medical License', 'license', 'Medical Council', 12, 90, true),\n  ('BLS', 'Basic Life Support', 'certification', 'Accredited Provider', 24, 60, true),\n  ('ACLS', 'Advanced Cardiac Life Support', 'certification', 'Accredited Provider', 24, 60, true),\n  ('DEA', 'Controlled Substance Registration', 'license', 'Regulatory Authority', 36, 120, true)\nON CONFLICT (credential_code) DO NOTHING;\n\nINSERT INTO public.employee_document_types (document_code, document_name, document_category, required_default, requires_expiry, retention_days, active)\nVALUES\n  ('ID_PROOF', 'Government ID Proof', 'identity', true, false, 3650, true),\n  ('CONTRACT', 'Employment Contract', 'employment', true, false, 3650, true),\n  ('LICENSE_COPY', 'Professional License Copy', 'compliance', true, true, 3650, true),\n  ('BACKGROUND_CHECK', 'Background Verification', 'compliance', false, true, 1825, true)\nON CONFLICT (document_code) DO NOTHING;\n\nINSERT INTO public.employee_lifecycle_templates (template_code, template_name, lifecycle_type, applies_to, is_active, metadata)\nVALUES\n  ('ONBOARD_STD', 'Standard Onboarding', 'onboarding', 'both', true, '{\\"version\\":\\"v1\\"}'::jsonb),\n  ('OFFBOARD_STD', 'Standard Offboarding', 'offboarding', 'both', true, '{\\"version\\":\\"v1\\"}'::jsonb)\nON CONFLICT (template_code) DO NOTHING;\n\nINSERT INTO public.employee_lifecycle_template_tasks (\n  lifecycle_template_id,\n  task_code,\n  task_name,\n  task_group,\n  sequence_no,\n  default_owner_role,\n  mandatory,\n  due_offset_days,\n  blocks_transition,\n  metadata\n)\nSELECT t.lifecycle_template_id, x.task_code, x.task_name, x.task_group, x.sequence_no, x.default_owner_role, x.mandatory, x.due_offset_days, x.blocks_transition, x.metadata\nFROM public.employee_lifecycle_templates t\nJOIN (\n  VALUES\n    ('ONBOARD_STD', 'CREATE_ACCOUNT', 'Create User Account', 'it', 1, 'Admin', true, 0, true, '{\\"module\\":\\"access\\"}'::jsonb),\n    ('ONBOARD_STD', 'COLLECT_DOCS', 'Collect Mandatory Documents', 'hr', 2, 'Admin', true, 7, true, '{\\"module\\":\\"documents\\"}'::jsonb),\n    ('ONBOARD_STD', 'VERIFY_CREDENTIALS', 'Verify Credentials', 'compliance', 3, 'Admin', true, 14, true, '{\\"module\\":\\"credentialing\\"}'::jsonb),\n    ('OFFBOARD_STD', 'REVOKE_ACCESS', 'Revoke System Access', 'it', 1, 'Admin', true, 0, true, '{\\"module\\":\\"security\\"}'::jsonb),\n    ('OFFBOARD_STD', 'ASSET_HANDOVER', 'Complete Asset Handover', 'operations', 2, 'Admin', true, 2, true, '{\\"module\\":\\"lifecycle\\"}'::jsonb),\n    ('OFFBOARD_STD', 'ARCHIVE_RECORDS', 'Archive Employee Records', 'hr', 3, 'Admin', true, 5, true, '{\\"module\\":\\"documents\\"}'::jsonb)\n) AS x(template_code, task_code, task_name, task_group, sequence_no, default_owner_role, mandatory, due_offset_days, blocks_transition, metadata)\n  ON x.template_code = t.template_code\nWHERE NOT EXISTS (\n  SELECT 1\n  FROM public.employee_lifecycle_template_tasks existing\n  WHERE existing.lifecycle_template_id = t.lifecycle_template_id\n    AND existing.task_code = x.task_code\n);"}	staff_management_compliance_modules_2026_03_25	k224291@nu.edu.pk	\N	\N
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: attendance_regularization_requests_regularization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_regularization_requests_regularization_id_seq', 1, false);


--
-- Name: batch_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.batch_seq', 24, true);


--
-- Name: bill_bill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_bill_id_seq', 63, true);


--
-- Name: bill_charge_source_bill_charge_source_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_charge_source_bill_charge_source_id_seq', 1, false);


--
-- Name: bill_item_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_item_item_id_seq', 1, false);


--
-- Name: bill_pharmacy_sale_bill_pharmacy_sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_pharmacy_sale_bill_pharmacy_sale_id_seq', 1, false);


--
-- Name: cashier_audit_event_cashier_audit_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_audit_event_cashier_audit_event_id_seq', 1, false);


--
-- Name: cashier_idempotency_cashier_idempotency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_idempotency_cashier_idempotency_id_seq', 1, false);


--
-- Name: cashier_payment_allocation_cashier_payment_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_payment_allocation_cashier_payment_allocation_id_seq', 1, false);


--
-- Name: cashier_payment_txn_cashier_payment_txn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cashier_payment_txn_cashier_payment_txn_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.doctor_doctor_id_seq', 5, true);


--
-- Name: doctor_encounter_note_doctor_encounter_note_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.doctor_encounter_note_doctor_encounter_note_id_seq', 27, true);


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
-- Name: finance_asset_purchase_asset_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.finance_asset_purchase_asset_purchase_id_seq', 1, false);


--
-- Name: finance_expense_entry_expense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.finance_expense_entry_expense_id_seq', 1, false);


--
-- Name: invoice_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoice_seq', 7834, true);


--
-- Name: lab_order_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_order_order_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.lab_test_results_result_id_seq', 1, false);


--
-- Name: leave_employee_quota_override_override_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_employee_quota_override_override_id_seq', 1, false);


--
-- Name: leave_role_quota_role_quota_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_role_quota_role_quota_id_seq', 72, true);


--
-- Name: medicine_batch_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_batch_batch_id_seq', 24, true);


--
-- Name: medicine_category_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_category_category_id_seq', 8, true);


--
-- Name: medicine_form_form_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_form_form_id_seq', 4, true);


--
-- Name: medicine_manufacturer_manufacturer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_manufacturer_manufacturer_id_seq', 5, true);


--
-- Name: medicine_medicine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_medicine_id_seq', 12, true);


--
-- Name: medicine_purchase_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_purchase_detail_id_seq', 21, true);


--
-- Name: medicine_purchase_purchase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_purchase_purchase_id_seq', 18, true);


--
-- Name: medicine_transaction_txn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicine_transaction_txn_id_seq', 131, true);


--
-- Name: menstrual_history_menstrual_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menstrual_history_menstrual_history_id_seq', 1, true);


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

SELECT pg_catalog.setval('public.party_party_id_seq', 6, true);


--
-- Name: party_payment_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.party_payment_payment_id_seq', 1, true);


--
-- Name: patient_patient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_patient_id_seq', 15, true);


--
-- Name: patient_vitals_vital_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patient_vitals_vital_id_seq', 9, true);


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

SELECT pg_catalog.setval('public.pos_audit_log_log_id_seq', 196, true);


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
-- Name: sale_return_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_return_detail_id_seq', 14, true);


--
-- Name: sale_return_return_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_return_return_id_seq', 13, true);


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

SELECT pg_catalog.setval('public.staff_staff_id_seq', 7, true);


--
-- Name: visit_status_history_visit_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visit_status_history_visit_status_id_seq', 29, true);


--
-- Name: visit_visit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visit_visit_id_seq', 71, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: allowance_type_master allowance_type_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowance_type_master
    ADD CONSTRAINT allowance_type_master_pkey PRIMARY KEY (code);


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
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


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
-- Name: idx_finance_asset_purchase_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_asset_purchase_date ON public.finance_asset_purchase USING btree (purchase_date DESC, asset_category);


--
-- Name: idx_finance_expense_entry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_expense_entry_date ON public.finance_expense_entry USING btree (expense_date DESC, category);


--
-- Name: idx_lab_order_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_order_visit_id ON public.lab_order USING btree (visit_id);


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
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


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
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict TlFAP4q3uQX5zntOx8YftIUA4jL1kB3C6ebG1bjDvOdxzQwJvghwGG94H5zVkiZ

