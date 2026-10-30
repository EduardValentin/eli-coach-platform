export interface ThingsFacade {
  list(): Promise<string[]>;
}
