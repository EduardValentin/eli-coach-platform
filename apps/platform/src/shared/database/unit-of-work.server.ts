import { AsyncLocalStorage } from "node:async_hooks";

import type { UnitOfWork } from "~/shared/http/unit-of-work";

import type {
  DatabaseClient,
  DatabaseExecutor,
  DatabaseTransaction,
} from "./database-client";

const ambientTransaction = new AsyncLocalStorage<DatabaseTransaction>();

export function createUnitOfWork(database: DatabaseClient): UnitOfWork {
  return (work) =>
    executorOf(database).transaction((transaction) =>
      ambientTransaction.run(transaction, work),
    );
}

export function executorOf(database: DatabaseClient): DatabaseExecutor {
  return ambientTransaction.getStore() ?? database;
}
