\set ON_ERROR_STOP on

-- Passwords are set outside the DO block: an error inside it logs the executed
-- statement as CONTEXT, which no log setting suppresses.
SET log_min_error_statement = panic;

DO $monitoring$
DECLARE
  monitoring_user text := :'app_db_monitoring_user';
  database_name text := current_database();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = monitoring_user) THEN
    EXECUTE format('CREATE ROLE %I', monitoring_user);
  END IF;

  EXECUTE format(
    'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3',
    monitoring_user
  );
  EXECUTE format('ALTER ROLE %I SET default_transaction_read_only = on', monitoring_user);

  EXECUTE format('GRANT pg_monitor TO %I', monitoring_user);
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM %I', database_name, monitoring_user);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', database_name, monitoring_user);
END
$monitoring$;

SELECT format('ALTER ROLE %I PASSWORD %L', :'app_db_monitoring_user', :'app_db_monitoring_password') \gexec
