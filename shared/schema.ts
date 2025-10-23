import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role enum
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

// Users table - stores user credentials and UUIDs
// Email and password are optional for anonymous UUID-only users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  password: text("password"),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// API Keys table - for SaaS products to authenticate with the service
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Services table - configured service cards that appear after login
// Each service belongs to a specific user
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  redirectUrl: text("redirect_url"), // Redirect URL after authentication (defaults to service URL)
  icon: text("icon").notNull().default("Globe"),
  color: text("color"),
  secret: text("secret"), // AES-256-GCM encrypted secret for JWT signing (encrypted at application layer)
  secretPreview: text("secret_preview"), // Truncated secret for display (e.g., "sk_abc...xyz")
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// RBAC Models table - stores custom RBAC model definitions
// Each model is a container for roles and permissions that can be applied to services
export const rbacModels = pgTable("rbac_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  role: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).optional(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  name: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  userId: true, // User ID is set from authenticated user, not from form
  createdAt: true,
  secret: true, // Secret is auto-generated, not provided by user
  secretPreview: true, // Preview is auto-generated from secret
}).extend({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Description is required"),
  url: z.string().url("Invalid URL format"),
  redirectUrl: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().url("Invalid URL format").optional()
  ),
  icon: z.string().default("Globe"),
  color: z.string().optional(),
});

export const insertRbacModelSchema = createInsertSchema(rbacModels).omit({
  id: true,
  createdBy: true, // Set from authenticated admin user
  createdAt: true,
}).extend({
  name: z.string().min(1, "Model name is required"),
  description: z.string().min(1, "Description is required"),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// UUID login schema - can optionally provide a UUID, or auto-generate one
export const uuidLoginSchema = z.object({
  uuid: z.string().uuid("Invalid UUID format").optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertRbacModel = z.infer<typeof insertRbacModelSchema>;
export type RbacModel = typeof rbacModels.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UuidLogin = z.infer<typeof uuidLoginSchema>;
