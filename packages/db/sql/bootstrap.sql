\set ON_ERROR_STOP on

DO $bootstrap$
DECLARE
  application_schema text := :'app_db_schema';
  application_user text := :'app_db_app_user';
  application_password text := :'app_db_app_password';
  migration_user text := :'app_db_migration_user';
  migration_password text := :'app_db_migration_password';
  database_name text := current_database();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = application_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', application_user, application_password);
  ELSE
    EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', application_user, application_password);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = migration_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', migration_user, migration_password);
  ELSE
    EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', migration_user, migration_password);
  END IF;

  EXECUTE format('REVOKE ALL ON DATABASE %I FROM %I', database_name, application_user);
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM %I', database_name, migration_user);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', database_name, application_user);
  EXECUTE format('GRANT CONNECT, CREATE ON DATABASE %I TO %I', database_name, migration_user);

  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', application_schema, migration_user);
  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', application_schema, migration_user);

  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', application_user);
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', migration_user);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', application_user);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', migration_user);

  EXECUTE format('REVOKE ALL ON SCHEMA %I FROM %I', application_schema, application_user);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', application_schema, application_user);
  EXECUTE format('REVOKE CREATE ON SCHEMA %I FROM %I', application_schema, application_user);
  EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', application_schema, migration_user);

  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I', application_schema, application_user);
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I', application_schema, application_user);

  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
    migration_user,
    application_schema,
    application_user
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO %I',
    migration_user,
    application_schema,
    application_user
  );
END
$bootstrap$;
