export type RuntimeStage = {
  ENVIRONMENT: string;
  NODE_ENV: "development" | "production" | "test";
};

export function isProductionRuntime(environment: RuntimeStage): boolean {
  return (
    environment.ENVIRONMENT === "production" ||
    (environment.NODE_ENV === "production" &&
      environment.ENVIRONMENT !== "local")
  );
}
