import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 63 }).unique().notNull(),
  plan: varchar("plan", { length: 50 }).notNull().default("branded"),
  maxVessels: integer("max_vessels").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("engineer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    index("idx_users_tenant").on(table.tenantId),
  ]
);

export const vessels = pgTable(
  "vessels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    imo: varchar("imo", { length: 20 }),
    vesselType: varchar("vessel_type", { length: 100 }),
    flagState: varchar("flag_state", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_vessels_tenant").on(table.tenantId)]
);

export const equipment = pgTable(
  "equipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    manufacturer: varchar("manufacturer", { length: 255 }).notNull(),
    modelType: varchar("model_type", { length: 255 }).notNull(),
    serialNumber: varchar("serial_number", { length: 255 }),
    vesselId: uuid("vessel_id").references(() => vessels.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_equipment_tenant").on(table.tenantId)]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vesselId: uuid("vessel_id").references(() => vessels.id),
    title: varchar("title", { length: 500 }).notNull(),
    docType: varchar("doc_type", { length: 100 }).notNull(),
    scope: varchar("scope", { length: 20 }).notNull().default("vessel"),
    manufacturer: varchar("manufacturer", { length: 255 }),
    modelType: varchar("model_type", { length: 255 }),
    versionYear: varchar("version_year", { length: 20 }),
    s3Key: text("s3_key").notNull(),
    pageCount: integer("page_count"),
    ocrStatus: varchar("ocr_status", { length: 20 }).notNull().default("pending"),
    masterEligible: boolean("master_eligible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_documents_tenant").on(table.tenantId),
    index("idx_documents_vessel").on(table.vesselId),
    index("idx_documents_scope").on(table.tenantId, table.scope),
  ]
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    totalPages: integer("total_pages"),
    processedPages: integer("processed_pages").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_jobs_document").on(table.documentId)]
);

export const queryLog = pgTable(
  "query_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    vesselId: uuid("vessel_id").references(() => vessels.id),
    question: text("question").notNull(),
    answer: text("answer"),
    sources: jsonb("sources"),
    responseTimeMs: integer("response_time_ms"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_querylog_tenant").on(table.tenantId),
    index("idx_querylog_created").on(table.tenantId, table.createdAt),
  ]
);
