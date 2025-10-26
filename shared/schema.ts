import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, uniqueIndex, boolean, integer, unique } from "drizzle-orm/pg-core";
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
  isSystem: boolean("is_system").notNull().default(false), // System services cannot be deleted
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Global Services table - Admin-managed service catalog (no userId)
// Services exist once in the catalog and users get access via junction table
export const globalServices = pgTable("global_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  isSystem: true, // System flag is controlled by application, not user
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

export const insertGlobalServiceSchema = createInsertSchema(globalServices).omit({
  id: true,
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

// ==================== LOGIN PAGE EDITOR TABLES ====================

// Authentication Methods table - Global definitions auto-synced from StrategyRegistry
// NOTE: Methods are auto-discovered from registered strategies + placeholders
export const authMethods = pgTable("auth_methods", {
  id: varchar("id").primaryKey(), // "uuid", "email", "nostr", "bluesky", "webauthn", "magic_link"
  name: varchar("name").notNull(), // Display name: "UUID Login", "Email Login", etc.
  description: varchar("description").notNull(), // Description shown to users
  icon: varchar("icon").notNull(), // Lucide icon name: "KeyRound", "Mail", "Zap", etc.
  category: varchar("category").notNull().default("standard"), // "standard" | "alternative"
  
  // Global defaults
  implemented: boolean("implemented").notNull().default(false), // Is backend strategy registered?
  defaultButtonText: varchar("default_button_text").notNull(), // Default: "Login with Nostr"
  defaultButtonVariant: varchar("default_button_variant").notNull().default("outline"),
  defaultHelpText: varchar("default_help_text"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Login Page Configuration table
// Configurations can optionally be assigned to services
// Only the default AuthHub login config is tied to a service by default
export const loginPageConfig = pgTable("login_page_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Service Association - OPTIONAL (can be assigned later from service management)
  serviceId: varchar("service_id").references(() => services.id, { onDelete: "cascade" }).unique(),
  
  // Branding
  title: varchar("title").notNull().default("Welcome to AuthHub"),
  description: varchar("description").notNull().default("Choose your preferred authentication method"),
  logoUrl: varchar("logo_url"), // Optional custom logo URL
  primaryColor: varchar("primary_color"), // CSS color value
  
  // Default behavior
  defaultMethod: varchar("default_method").notNull().default("uuid"), // "uuid" | "email" | "nostr" | etc.
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id), // Admin who made last change
});

// Service Auth Methods table - Service-specific overrides and ordering
export const serviceAuthMethods = pgTable("service_auth_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Relations
  loginConfigId: varchar("login_config_id").notNull().references(() => loginPageConfig.id, { onDelete: "cascade" }),
  authMethodId: varchar("auth_method_id").notNull().references(() => authMethods.id, { onDelete: "cascade" }),
  
  // Service-specific settings
  enabled: boolean("enabled").notNull().default(true), // Is this method visible for this service?
  showComingSoonBadge: boolean("show_coming_soon_badge").notNull().default(false),
  methodCategory: varchar("method_category").notNull().default("alternative"), // "primary" | "secondary" | "alternative"
  
  // Optional overrides (null = use defaults from auth_methods table)
  buttonText: varchar("button_text"), // Override default button text
  buttonVariant: varchar("button_variant"), // Override default variant
  helpText: varchar("help_text"), // Override default help text
  
  // Display order within this config (for drag-and-drop ordering)
  displayOrder: integer("display_order").notNull().default(0),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: one entry per config+method combination
  uniqueConfigMethod: unique().on(table.loginConfigId, table.authMethodId),
}));

// Insert schemas for login page editor
export const insertAuthMethodSchema = createInsertSchema(authMethods);
export const insertLoginPageConfigSchema = createInsertSchema(loginPageConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertServiceAuthMethodSchema = createInsertSchema(serviceAuthMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertGlobalService = z.infer<typeof insertGlobalServiceSchema>;
export type GlobalService = typeof globalServices.$inferSelect;
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
export type InsertAuthMethod = z.infer<typeof insertAuthMethodSchema>;
export type AuthMethod = typeof authMethods.$inferSelect;
export type InsertLoginPageConfig = z.infer<typeof insertLoginPageConfigSchema>;
export type LoginPageConfig = typeof loginPageConfig.$inferSelect;
export type InsertServiceAuthMethod = z.infer<typeof insertServiceAuthMethodSchema>;
export type ServiceAuthMethod = typeof serviceAuthMethods.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UuidLogin = z.infer<typeof uuidLoginSchema>;
