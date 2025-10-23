import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
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

// Roles table - stores roles within an RBAC model
// Each role belongs to a specific RBAC model
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rbacModelId: varchar("rbac_model_id").notNull().references(() => rbacModels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Permissions table - stores permissions within an RBAC model
// Each permission belongs to a specific RBAC model
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rbacModelId: varchar("rbac_model_id").notNull().references(() => rbacModels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Role-Permission junction table - defines which permissions each role has
export const rolePermissions = pgTable("role_permissions", {
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

// Service-RbacModel junction table - links services to their assigned RBAC models
// Each service can have one RBAC model assigned
export const serviceRbacModels = pgTable("service_rbac_models", {
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: "cascade" }).unique(),
  rbacModelId: varchar("rbac_model_id").notNull().references(() => rbacModels.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

// User-Service-Role junction table - assigns users to roles within specific services
// Users can have multiple roles across different services
// Unique constraint ensures one user can't be assigned the same role multiple times for the same service
export const userServiceRoles = pgTable("user_service_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
}, (table) => {
  return {
    uniqueUserServiceRole: uniqueIndex("user_service_role_unique_idx").on(table.userId, table.serviceId, table.roleId)
  };
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

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  rbacModelId: true, // Set from URL parameter or context
  createdAt: true,
}).extend({
  name: z.string().min(1, "Role name is required"),
  description: z.string().min(1, "Description is required"),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  rbacModelId: true, // Set from URL parameter or context
  createdAt: true,
}).extend({
  name: z.string().min(1, "Permission name is required"),
  description: z.string().min(1, "Description is required"),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions);

export const insertServiceRbacModelSchema = createInsertSchema(serviceRbacModels).omit({
  assignedAt: true, // Auto-generated timestamp
});

export const insertUserServiceRoleSchema = createInsertSchema(userServiceRoles).omit({
  id: true, // Auto-generated UUID
  assignedAt: true, // Auto-generated timestamp
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
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertServiceRbacModel = z.infer<typeof insertServiceRbacModelSchema>;
export type ServiceRbacModel = typeof serviceRbacModels.$inferSelect;
export type InsertUserServiceRole = z.infer<typeof insertUserServiceRoleSchema>;
export type UserServiceRole = typeof userServiceRoles.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UuidLogin = z.infer<typeof uuidLoginSchema>;
