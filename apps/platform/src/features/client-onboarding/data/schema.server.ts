import { appSchema } from "@eli-coach-platform/db";
import type {
  OnboardingAnswersByForm,
  OnboardingFormId,
} from "@eli-coach-platform/domain/client-onboarding";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export const clientOnboardingConstraints = {
  submissionPerClient: "client_onboarding_submissions_client_id_unique",
  openDetailRequestPerClient:
    "client_onboarding_detail_requests_open_per_client_unique",
} as const;

export const clientOnboardingDraftsTable = appSchema.table(
  "client_onboarding_drafts",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clientsTable.id),
    answers: jsonb("answers").$type<OnboardingAnswersByForm>().notNull(),
    currentFormIndex: integer("current_form_index").notNull(),
    specialCategoryConsentedAt: timestamp("special_category_consented_at", {
      withTimezone: true,
    }),
    disclaimerConsentedAt: timestamp("disclaimer_consented_at", {
      withTimezone: true,
    }),
    progressPhotosConsentedAt: timestamp("progress_photos_consented_at", {
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
);

export const clientOnboardingSubmissionsTable = appSchema.table(
  "client_onboarding_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    answers: jsonb("answers").$type<OnboardingAnswersByForm>().notNull(),
    specialCategoryConsentedAt: timestamp("special_category_consented_at", {
      withTimezone: true,
    }),
    disclaimerConsentedAt: timestamp("disclaimer_consented_at", {
      withTimezone: true,
    }),
    progressPhotosConsentedAt: timestamp("progress_photos_consented_at", {
      withTimezone: true,
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex(clientOnboardingConstraints.submissionPerClient).on(
      table.clientId,
    ),
  ],
);

export const clientOnboardingReviewsTable = appSchema.table(
  "client_onboarding_reviews",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clientsTable.id),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
);

export const clientOnboardingDetailRequestsTable = appSchema.table(
  "client_onboarding_detail_requests",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    questionIds: jsonb("question_ids")
      .$type<{ formId: OnboardingFormId; fieldId: string }[]>()
      .notNull(),
    note: text("note").notNull(),
    askedAt: timestamp("asked_at", { withTimezone: true }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    index("client_onboarding_detail_requests_client_id_asked_at_idx").on(
      table.clientId,
      table.askedAt,
    ),
    uniqueIndex(clientOnboardingConstraints.openDetailRequestPerClient)
      .on(table.clientId)
      .where(sql`${table.answeredAt} is null`),
  ],
);
