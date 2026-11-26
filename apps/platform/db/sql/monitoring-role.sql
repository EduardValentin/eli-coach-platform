\set ON_ERROR_STOP on

DO $monitoring$
DECLARE
  monitoring_user text := :'app_db_monitoring_user';
  monitoring_password text := :'app_db_monitoring_password';
  database_name text := current_database();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = monitoring_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', monitoring_user, monitoring_password);
  ELSE
    EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', monitoring_user, monitoring_password);
  END IF;

  EXECUTE format(
    'ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3',
    monitoring_user
  );
  EXECUTE format('ALTER ROLE %I SET default_transaction_read_only = on', monitoring_user);

  EXECUTE format('GRANT pg_monitor TO %I', monitoring_user);
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM %I', database_name, monitoring_user);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', database_name, monitoring_user);
END
$monitoring$;
