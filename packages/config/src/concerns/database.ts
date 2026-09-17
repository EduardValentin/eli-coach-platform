import { z } from "zod";

const databasePortSchema = z.coerce.number().int().positive();

export const databaseShape = {
  DATABASE_HOST: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_PORT: databasePortSchema.optional(),
  DATABASE_USER: z.string().optional(),
};

export type DatabaseConfig = z.infer<z.ZodObject<typeof databaseShape>>;

export const databaseBootstrapEnvironmentSchema = z.object({
  POSTGRES_DB: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_USER: z.string(),
  APP_DB_SCHEMA: z.string(),
  APP_DB_APP_USER: z.string(),
  APP_DB_APP_PASSWORD: z.string(),
  APP_DB_MIGRATION_USER: z.string(),
  APP_DB_MIGRATION_PASSWORD: z.string(),
});

export type DatabaseBootstrapEnvironment = z.infer<
  typeof databaseBootstrapEnvironmentSchema
>;

export type DatabaseUserCredentials = {
  name: string;
  password: string;
};

export type DatabaseConnection = {
  credentials: DatabaseUserCredentials;
  database: string;
  host: string;
  port: number;
};
