import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const polls = pgTable(
  'polls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    question: text('question').notNull(),
    kind: text('kind').notNull(), // 'single' | 'multi' | 'ranked'
    maxChoices: integer('max_choices'),
    integrity: text('integrity').notNull(), // 'open' | 'device' | 'verified'
    visibility: text('visibility').notNull(), // 'always' | 'after_vote' | 'after_close'
    allowRevision: boolean('allow_revision').notNull().default(true),
    opensAt: timestamp('opens_at', { withTimezone: true }).notNull().defaultNow(),
    closesAt: timestamp('closes_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    creatorTokenHash: text('creator_token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_polls_closes_at_open').on(table.closesAt).where(sql`${table.closedAt} IS NULL`),
  ]
);

export const options = pgTable(
  'options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: text('label').notNull(),
  },
  (table) => [
    unique('uq_options_poll_pos').on(table.pollId, table.position),
  ]
);

export const ballots = pgTable(
  'ballots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    ballotTokenHash: text('ballot_token_hash').notNull(),
    choice: jsonb('choice').notNull(), // string[]
    receiptCode: text('receipt_code').notNull(),
    castAt: timestamp('cast_at', { withTimezone: true }).notNull().defaultNow(),
    revisedAt: timestamp('revised_at', { withTimezone: true }),
    ipHash: text('ip_hash'),
    uaHash: text('ua_hash'),
  },
  (table) => [
    unique('uq_ballots_poll_token').on(table.pollId, table.ballotTokenHash),
    unique('uq_ballots_poll_receipt').on(table.pollId, table.receiptCode),
    index('idx_ballots_poll_cast_at').on(table.pollId, table.castAt),
  ]
);

export const tallies = pgTable(
  'tallies',
  {
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    optionId: uuid('option_id')
      .notNull()
      .references(() => options.id, { onDelete: 'cascade' }),
    count: integer('count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.pollId, table.optionId] }),
  ]
);

export const pollResults = pgTable(
  'poll_results',
  {
    pollId: uuid('poll_id')
      .primaryKey()
      .references(() => polls.id, { onDelete: 'cascade' }),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
    payload: jsonb('payload').notNull(), // IRVResult
  }
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    googleId: text('google_id').notNull().unique(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    avatar: text('avatar'),
    birthYear: integer('birth_year'),
    birthMonth: integer('birth_month'),
    birthDay: integer('birth_day'),
    birthPrecision: text('birth_precision'), // 'year' | 'month' | 'day'
    ageCohort: text('age_cohort'), // '18-24' | '25-34' | '35-49' | '50+'
    stateId: text('state_id'),
    stateCode: text('state_code'),
    district: text('district'),
    districtId: text('district_id'),
    city: text('city'),
    region: text('region'),
    role: text('role'),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_users_google_id').on(table.googleId),
    index('idx_users_email').on(table.email),
  ]
);

