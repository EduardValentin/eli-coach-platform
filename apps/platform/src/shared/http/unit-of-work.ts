export type UnitOfWork = <T>(work: () => Promise<T>) => Promise<T>;
