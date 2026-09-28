import type { DatabaseClient } from "@eli-coach-platform/db";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { PostgresClientRoster } from "./client-roster-reader.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");

const CLIENT_ROW = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
  welcomeSeenAt: null,
  onboardingSubmittedAt: SUBMITTED_AT,
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
  authSubjectId: "user_ana",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  country: "RO",
  phone: "+40700000000",
  primaryGoal: "build_strength",
  assessmentCallId: CALL_ID,
  bundleId: "3-months",
  months: 3,
  tier: "regular",
  paidAt: PAID_AT,
  startChoice: "immediate",
  subscriptionStatus: "not-started",
};

const ROSTER_ENTRY = {
  journey: {
    clientId: CLIENT_ID,
    firstName: "Ana",
    lastName: "Popescu",
    gender: "female",
    welcomeSeenAt: null,
    onboardingSubmittedAt: SUBMITTED_AT,
    reviewOpenedAt: null,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
  },
  accountBound: true,
  profile: {
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: "+40700000000",
    primaryGoal: "build_strength",
    assessmentCallId: CALL_ID,
  },
  subscription: {
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    paidAt: PAID_AT,
    startChoice: "immediate",
    status: "not-started",
  },
};

const dialect = new PgDialect();

describe("PostgresClientRoster#list", () => {
  it("reads every client with her journey, profile and subscription", async () => {
    // arrange
    const database = createDatabaseAnswering([CLIENT_ROW]);
    const roster = new PostgresClientRoster(database.client);

    // act
    const entries = await roster.list();

    // assert
    expect(entries).toEqual([ROSTER_ENTRY]);
  });

  it("joins each client to her open subscription", async () => {
    // arrange
    const database = createDatabaseAnswering([]);
    const roster = new PostgresClientRoster(database.client);

    // act
    await roster.list();

    // assert
    const [join] = database.joins;
    expect(dialect.sqlToQuery(join as SQL).sql).toBe(
      `("app"."coaching_subscriptions"."client_id" = "app"."clients"."id" and "app"."coaching_subscriptions"."status" <> 'ended')`,
    );
  });

  it("orders the most recently paid first and the clients without a payment last", async () => {
    // arrange
    const database = createDatabaseAnswering([]);
    const roster = new PostgresClientRoster(database.client);

    // act
    await roster.list();

    // assert
    expect(
      database.orderings.map((ordering) => dialect.sqlToQuery(ordering).sql),
    ).toEqual([
      `"app"."coaching_subscriptions"."paid_at" desc nulls last`,
      `"app"."clients"."created_at" desc`,
    ]);
  });

  it("reads a client whose account is not bound yet as unbound", async () => {
    // arrange
    const roster = new PostgresClientRoster(
      createDatabaseAnswering([{ ...CLIENT_ROW, authSubjectId: null }]).client,
    );

    // act
    const [entry] = await roster.list();

    // assert
    expect(entry?.accountBound).toBe(false);
  });

  it("reads no subscription for a client without an open one", async () => {
    // arrange
    const roster = new PostgresClientRoster(
      createDatabaseAnswering([
        {
          ...CLIENT_ROW,
          bundleId: null,
          months: null,
          tier: null,
          paidAt: null,
          startChoice: null,
          subscriptionStatus: null,
        },
      ]).client,
    );

    // act
    const [entry] = await roster.list();

    // assert
    expect(entry?.subscription).toBeNull();
  });
});

describe("PostgresClientRoster#findById", () => {
  it("reads the client with the given id", async () => {
    // arrange
    const database = createDatabaseAnswering([CLIENT_ROW]);
    const roster = new PostgresClientRoster(database.client);

    // act
    const entry = await roster.findById(CLIENT_ID);

    // assert
    expect(entry).toEqual(ROSTER_ENTRY);
    const [filter] = database.filters;
    const query = dialect.sqlToQuery(filter as SQL);
    expect(query.sql).toBe(`"app"."clients"."id" = $1`);
    expect(query.params).toEqual([CLIENT_ID]);
  });

  it("answers null for an unknown client", async () => {
    // arrange
    const roster = new PostgresClientRoster(createDatabaseAnswering([]).client);

    // act
    const entry = await roster.findById(CLIENT_ID);

    // assert
    expect(entry).toBeNull();
  });
});

function createDatabaseAnswering(rows: readonly Record<string, unknown>[]) {
  const joins: unknown[] = [];
  const filters: unknown[] = [];
  const orderings: SQL[] = [];
  const client = {
    select: (columns: Record<string, unknown>) => {
      const projected = rows.map((row) =>
        Object.fromEntries(
          Object.keys(columns).map((column) => [column, row[column]]),
        ),
      );
      const selection = {
        from: () => selection,
        leftJoin: (_table: unknown, condition: unknown) => {
          joins.push(condition);

          return selection;
        },
        where: (filter: unknown) => {
          filters.push(filter);

          return selection;
        },
        orderBy: (...columns: SQL[]) => {
          orderings.push(...columns);

          return selection;
        },
        limit: () => selection,
        then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
          Promise.resolve(projected).then(onFulfilled),
      };

      return selection;
    },
  } as unknown as DatabaseClient;

  return { client, filters, joins, orderings };
}
