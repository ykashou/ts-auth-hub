# Login Page Editor - Admin Customization Interface

## Principle: Complete Control Over Authentication Experience
Admins can customize every aspect of the login page: branding, enabled methods, ordering, text, and appearance - all without touching code.

## Architecture: Service-Specific Login Pages
Login page configurations can be assigned to specific services, similar to RBAC models. Each service gets its own branded login experience with custom authentication methods, while a default configuration serves the main AuthHub login.

## Architecture: Unified Authentication Strategy Pattern
All authentication methods (UUID, Email, Nostr, BlueSky, WebAuthn, Magic Links) implement a common `AuthStrategy` interface. The `StrategyRegistry` serves as the single source of truth for available auth methods, eliminating code duplication and enabling auto-discovery. When a new strategy is registered, it automatically:
- Appears in the login editor UI
- Gets synced to the `auth_methods` database table
- Is marked as `implemented: true`
- Becomes available on the login page

This unified approach ensures authentication methods are defined once and propagate everywhere automatically.

---

## Task: Login Page Editor & Configuration System - Full Stack
**What you'll see:** Admin page with live preview and drag-and-drop configuration for the login page

**Current State:**
- Login page has hardcoded authentication methods (UUID, Email, Nostr, BlueSky, WebAuthn, Magic Link)
- All methods shown regardless of whether they're implemented
- Branding is fixed (AuthHub logo, hardcoded title/description)
- No way to customize without editing code
- All placeholder methods show "Coming Soon" badge
- Same login page shown for all services

**Goal State:**
- Admin can create service-specific login page configurations
- Admin can toggle authentication methods on/off per service
- Admin can reorder authentication methods via drag-and-drop
- Admin can customize branding (logo, title, description, colors) per service
- Admin can set default authentication method per service
- Admin can customize button text and labels
- Live preview shows exactly how login page will appear to users
- Changes saved to database and applied immediately
- Default configuration used when no service specified
- Service-specific configuration overrides default when `service_id` query parameter present

---

## Strategy Pattern Architecture

### Overview
Before implementing database tables and UI, we establish a unified authentication system using the Strategy design pattern. This eliminates code duplication and creates a single source of truth for authentication methods.

### 1. Strategy Interface & Metadata

```typescript
// server/auth/AuthStrategy.ts

export interface AuthStrategyMetadata {
  id: string;                    // Unique identifier: "uuid", "email", "nostr"
  name: string;                  // Display name: "UUID Login", "Email Login"
  description: string;           // User-facing description
  icon: string;                  // Lucide icon name: "KeyRound", "Mail", "Zap"
  buttonText: string;            // Default button text: "Login with Nostr"
  buttonVariant: "default" | "outline" | "ghost";
  helpText?: string;             // Optional help text shown to users
  category: "primary" | "alternative";  // UI grouping
}

export interface AuthStrategy {
  // Metadata (single source of truth - no duplication!)
  readonly metadata: AuthStrategyMetadata;
  
  // Validate request data (using Zod schemas)
  validateRequest(data: any): any;
  
  // Authenticate user and return result
  authenticate(credentials: any): Promise<AuthResult>;
}

export interface AuthResult {
  userId: string;
  email: string | null;
  role: "admin" | "user";
  isNewUser: boolean;
}
```

### 2. Concrete Strategy Implementations

```typescript
// server/auth/strategies/EmailPasswordStrategy.ts
import { AuthStrategy, AuthStrategyMetadata, AuthResult } from "../AuthStrategy";
import { loginSchema } from "@shared/schema";
import bcrypt from "bcrypt";

export class EmailPasswordStrategy implements AuthStrategy {
  readonly metadata: AuthStrategyMetadata = {
    id: "email",
    name: "Email Login",
    description: "Sign in with your email and password",
    icon: "Mail",
    buttonText: "Email Login",
    buttonVariant: "default",
    category: "primary",
  };
  
  validateRequest(data: any) {
    return loginSchema.parse(data);
  }
  
  async authenticate(credentials: { email: string; password: string }): Promise<AuthResult> {
    const user = await storage.getUserByEmail(credentials.email);
    if (!user || !user.password) {
      throw new Error("Invalid email or password");
    }
    
    const isValid = await bcrypt.compare(credentials.password, user.password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }
    
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      isNewUser: false,
    };
  }
}

// server/auth/strategies/UuidStrategy.ts
export class UuidStrategy implements AuthStrategy {
  readonly metadata: AuthStrategyMetadata = {
    id: "uuid",
    name: "UUID Login",
    description: "Use an existing Account ID or generate a new one for anonymous authentication",
    icon: "KeyRound",
    buttonText: "UUID Login",
    buttonVariant: "default",
    category: "primary",
  };
  
  validateRequest(data: any) {
    return uuidLoginSchema.parse(data);
  }
  
  async authenticate(credentials: { uuid?: string }): Promise<AuthResult> {
    let user;
    let isNewUser = false;
    
    if (credentials.uuid) {
      user = await storage.getUser(credentials.uuid);
      if (!user) {
        const userCount = await storage.getUserCount();
        const role = userCount === 0 ? "admin" : "user";
        user = await storage.createUserWithUuid(credentials.uuid, role);
        isNewUser = true;
      }
    } else {
      const userCount = await storage.getUserCount();
      const role = userCount === 0 ? "admin" : "user";
      user = await storage.createAnonymousUser(role);
      isNewUser = true;
    }
    
    return {
      userId: user.id,
      email: user.email || null,
      role: user.role,
      isNewUser,
    };
  }
}

// server/auth/strategies/NostrStrategy.ts
export class NostrStrategy implements AuthStrategy {
  readonly metadata: AuthStrategyMetadata = {
    id: "nostr",
    name: "Nostr",
    description: "Authenticate using your Nostr public key with cryptographic signatures",
    icon: "Zap",
    buttonText: "Login with Nostr",
    buttonVariant: "outline",
    helpText: "Requires Nostr browser extension (Alby or nos2x)",
    category: "alternative",
  };
  
  validateRequest(data: any) {
    return nostrLoginSchema.parse(data);
  }
  
  async authenticate(credentials: { pubkey: string; signature: string }): Promise<AuthResult> {
    // Verify Nostr signature
    const isValid = await verifyNostrSignature(credentials.pubkey, credentials.signature);
    if (!isValid) {
      throw new Error("Invalid Nostr signature");
    }
    
    // Find or create user by Nostr pubkey
    let user = await storage.getUserByNostrPubkey(credentials.pubkey);
    let isNewUser = false;
    
    if (!user) {
      const userCount = await storage.getUserCount();
      const role = userCount === 0 ? "admin" : "user";
      user = await storage.createNostrUser(credentials.pubkey, role);
      isNewUser = true;
    }
    
    return {
      userId: user.id,
      email: null,
      role: user.role,
      isNewUser,
    };
  }
}

// NOTE: NostrStrategy shown above is a FUTURE example - not implemented in Phase 0
// BlueSkyStrategy, WebAuthnStrategy, MagicLinkStrategy follow the same pattern
// These will be created when actually implementing those auth methods
```

### 3. Strategy Registry (Single Source of Truth)

```typescript
// server/auth/StrategyRegistry.ts
import { AuthStrategy, AuthStrategyMetadata } from "./AuthStrategy";

class StrategyRegistry {
  private strategies = new Map<string, AuthStrategy>();
  
  register(strategy: AuthStrategy): void {
    this.strategies.set(strategy.metadata.id, strategy);
    console.log(`[StrategyRegistry] Registered: ${strategy.metadata.name} (${strategy.metadata.id})`);
  }
  
  get(id: string): AuthStrategy | undefined {
    return this.strategies.get(id);
  }
  
  getAll(): AuthStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  getAllMetadata(): AuthStrategyMetadata[] {
    return this.getAll().map(s => s.metadata);
  }
  
  isImplemented(id: string): boolean {
    return this.strategies.has(id);
  }
  
  getImplementedIds(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// Singleton instance
export const strategyRegistry = new StrategyRegistry();

// Auto-register ONLY implemented strategies
import { EmailPasswordStrategy } from "./strategies/EmailPasswordStrategy";
import { UuidStrategy } from "./strategies/UuidStrategy";

strategyRegistry.register(new EmailPasswordStrategy());
strategyRegistry.register(new UuidStrategy());

// DO NOT register placeholder strategies (Nostr, BlueSky, WebAuthn, Magic Links)
// They remain "Coming Soon" on the login page until actually implemented
// When you implement WebAuthnStrategy:
//   1. Create the strategy class
//   2. Import it here
//   3. Register it - that's it! It auto-syncs everywhere.
```

### 4. Unified Authentication Handler

```typescript
// server/auth/AuthHandler.ts
import { strategyRegistry } from "./StrategyRegistry";
import { generateAuthToken } from "../utils/jwt";

export class AuthHandler {
  async authenticate(
    methodId: string,
    credentials: any,
    serviceId?: string
  ): Promise<{ token: string; user: any }> {
    // Get strategy from registry
    const strategy = strategyRegistry.get(methodId);
    if (!strategy) {
      throw new Error(`Unknown authentication method: ${methodId}`);
    }
    
    // Validate request
    const validatedData = strategy.validateRequest(credentials);
    
    // Authenticate using strategy
    const { userId, email, role, isNewUser } = await strategy.authenticate(validatedData);
    
    // Get full user details
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found after authentication");
    
    // Run post-authentication hooks (same for ALL methods - no duplication!)
    await this.runPostAuthHooks(user, isNewUser);
    
    // Generate JWT token (with service secret if provided)
    const token = await generateAuthToken(user.id, email, role, serviceId);
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }
  
  private async runPostAuthHooks(user: any, isNewUser: boolean): Promise<void> {
    // Auto-seed services if user has none
    const userServices = await storage.getAllServicesByUser(user.id);
    if (userServices.length === 0) {
      await seedServices(user.id);
    }
    
    // Seed RBAC models for first admin
    if (user.role === 'admin' && isNewUser) {
      await storage.seedDefaultRbacModels(user.id);
    }
  }
}

export const authHandler = new AuthHandler();
```

### 5. Benefits of Strategy Pattern

✅ **Single Source of Truth** - Each auth method defined once in its strategy class  
✅ **Zero Code Duplication** - Post-auth hooks (seeding, token generation) written once  
✅ **Auto-Discovery** - New strategies automatically appear in login editor and database  
✅ **Easy to Extend** - Add new auth method = create one strategy class + register it  
✅ **Consistent API** - All methods use unified `/api/auth/authenticate` endpoint  
✅ **Type-Safe** - TypeScript enforces strategy interface  
✅ **Testable** - Each strategy can be unit tested independently  
✅ **Maintainable** - Changes to auth flow apply to all methods automatically  

---

## Database Schema Changes

### 1. Login Page Configuration Table
```typescript
// shared/schema.ts
export const loginPageConfig = pgTable("login_page_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Service Association (null = default/global configuration)
  serviceId: varchar("service_id").references(() => globalServices.id, { onDelete: "cascade" }),
  
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

// Unique constraint: one config per service (or one global if serviceId is null)
export const loginPageConfigConstraints = pgTable("login_page_config", {
  // ... columns ...
}, (table) => ({
  uniqueServiceConfig: unique().on(table.serviceId),
}));

export const insertLoginPageConfigSchema = createInsertSchema(loginPageConfig);
export type LoginPageConfig = typeof loginPageConfig.$inferSelect;
export type InsertLoginPageConfig = z.infer<typeof insertLoginPageConfigSchema>;
```

### 2. Authentication Methods Table (Global Definitions)
```typescript
// shared/schema.ts
// NOTE: No hardcoded enum - methods are auto-discovered from StrategyRegistry
export const authMethods = pgTable("auth_methods", {
  id: varchar("id").primaryKey(), // "uuid", "email", "nostr", etc.
  name: varchar("name").notNull(), // Display name: "UUID Login", "Email Login", etc.
  description: varchar("description").notNull(), // Description shown to users
  icon: varchar("icon").notNull(), // Lucide icon name: "KeyRound", "Mail", "Zap", etc.
  category: varchar("category").notNull().default("standard"), // "standard" | "alternative" | "enterprise"
  
  // Global defaults
  implemented: boolean("implemented").notNull().default(false), // Is backend ready?
  defaultButtonText: varchar("default_button_text").notNull(), // Default: "Login with Nostr"
  defaultButtonVariant: varchar("default_button_variant").notNull().default("outline"),
  defaultHelpText: varchar("default_help_text"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAuthMethodSchema = createInsertSchema(authMethods);
export type AuthMethod = typeof authMethods.$inferSelect;
export type InsertAuthMethod = z.infer<typeof insertAuthMethodSchema>;
```

### 3. Service Auth Methods Table (Service-Specific Overrides)
```typescript
// shared/schema.ts
export const serviceAuthMethods = pgTable("service_auth_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Relations
  loginConfigId: varchar("login_config_id").notNull().references(() => loginPageConfig.id, { onDelete: "cascade" }),
  authMethodId: varchar("auth_method_id").notNull().references(() => authMethods.id, { onDelete: "cascade" }),
  
  // Service-specific settings
  enabled: boolean("enabled").notNull().default(true), // Is this method visible for this service?
  showComingSoonBadge: boolean("show_coming_soon_badge").notNull().default(false),
  
  // Optional overrides (null = use defaults from auth_methods table)
  buttonText: varchar("button_text"), // Override default button text
  buttonVariant: varchar("button_variant"), // Override default variant
  helpText: varchar("help_text"), // Override default help text
  
  // Display order within this config (for fine-grained control)
  displayOrder: integer("display_order").notNull().default(0),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueConfigMethod: unique().on(table.loginConfigId, table.authMethodId),
}));

export const insertServiceAuthMethodSchema = createInsertSchema(serviceAuthMethods);
export type ServiceAuthMethod = typeof serviceAuthMethods.$inferSelect;
export type InsertServiceAuthMethod = z.infer<typeof insertServiceAuthMethodSchema>;
```

---

## Backend Implementation

### 1. Auto-Sync Auth Methods from Strategy Registry

```typescript
// server/storage.ts
import { strategyRegistry } from "./auth/StrategyRegistry";

/**
 * Syncs auth_methods table with registered strategies
 * Called on server startup to ensure database reflects code
 */
async syncAuthMethodsFromRegistry() {
  const registeredStrategies = strategyRegistry.getAllMetadata();
  
  console.log(`[Storage] Syncing ${registeredStrategies.length} auth methods from strategy registry...`);
  
  for (const metadata of registeredStrategies) {
    // Upsert to auth_methods table (insert or update if exists)
    await db.insert(authMethods)
      .values({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        category: metadata.category,
        implemented: true,  // If it's registered, it's implemented!
        defaultButtonText: metadata.buttonText,
        defaultButtonVariant: metadata.buttonVariant,
        defaultHelpText: metadata.helpText,
      })
      .onConflictDoUpdate({
        target: authMethods.id,
        set: {
          // Update metadata in case it changed
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon,
          category: metadata.category,
          implemented: true,  // Auto-mark as implemented
          defaultButtonText: metadata.buttonText,
          defaultButtonVariant: metadata.buttonVariant,
          defaultHelpText: metadata.helpText,
          updatedAt: new Date(),
        },
      });
    
    console.log(`[Storage] Synced: ${metadata.name} (${metadata.id})`);
  }
}

/**
 * Seeds default login page configuration
 * Only runs if no default config exists
 */
async seedLoginPageConfig() {
  // First, sync auth methods from strategy registry
  await this.syncAuthMethodsFromRegistry();
  
  // Check if default login config exists (serviceId = null)
  const existingDefaultConfig = await db.select()
    .from(loginPageConfig)
    .where(isNull(loginPageConfig.serviceId))
    .limit(1);
    
  if (existingDefaultConfig.length > 0) {
    console.log("[Storage] Default login config already exists");
    return;
  }
  
  // Create default login page configuration
  const implementedMethods = strategyRegistry.getImplementedIds();
  
  const [defaultConfig] = await db.insert(loginPageConfig).values({
    serviceId: null, // Default/global configuration
    title: "Welcome to AuthHub",
    description: "Choose your preferred authentication method",
    defaultMethod: implementedMethods[0] || "uuid", // Use first implemented method
  }).returning();
  
  console.log("[Storage] Created default login config");
  
  // Seed service auth methods for default config
  const allMethods = await db.select().from(authMethods);
  const serviceAuthMethodsData = allMethods.map((method, index) => ({
    loginConfigId: defaultConfig.id,
    authMethodId: method.id,
    enabled: method.implemented, // Only enable implemented methods
    showComingSoonBadge: false,  // No badges by default
    displayOrder: index,
  }));
  
  if (serviceAuthMethodsData.length > 0) {
    await db.insert(serviceAuthMethods).values(serviceAuthMethodsData);
    console.log(`[Storage] Created ${serviceAuthMethodsData.length} default service auth methods`);
  }
}
```

**Key Improvements:**
- ✅ No hardcoded arrays - auth methods come from strategy registry
- ✅ Auto-discovery - new strategies automatically synced to database
- ✅ Auto-implementation detection - registered = implemented
- ✅ Upsert logic - safe to run multiple times, updates metadata if changed
- ✅ Logging for visibility during startup

### 2. Storage Methods for Login Configuration

```typescript
// server/storage.ts

/**
 * Get enabled auth methods for a login config with enriched data from auth_methods table
 * Results are ordered by displayOrder ASC
 */
async getEnabledServiceAuthMethods(loginConfigId: string) {
  const results = await db
    .select({
      // From service_auth_methods (service-specific overrides)
      id: serviceAuthMethods.id,
      loginConfigId: serviceAuthMethods.loginConfigId,
      authMethodId: serviceAuthMethods.authMethodId,
      enabled: serviceAuthMethods.enabled,
      showComingSoonBadge: serviceAuthMethods.showComingSoonBadge,
      buttonText: serviceAuthMethods.buttonText,
      buttonVariant: serviceAuthMethods.buttonVariant,
      helpText: serviceAuthMethods.helpText,
      displayOrder: serviceAuthMethods.displayOrder,
      
      // From auth_methods (global defaults)
      name: authMethods.name,
      description: authMethods.description,
      icon: authMethods.icon,
      category: authMethods.category,
      implemented: authMethods.implemented,
      defaultButtonText: authMethods.defaultButtonText,
      defaultButtonVariant: authMethods.defaultButtonVariant,
      defaultHelpText: authMethods.defaultHelpText,
    })
    .from(serviceAuthMethods)
    .innerJoin(authMethods, eq(serviceAuthMethods.authMethodId, authMethods.id))
    .where(
      and(
        eq(serviceAuthMethods.loginConfigId, loginConfigId),
        eq(serviceAuthMethods.enabled, true)
      )
    )
    .orderBy(asc(serviceAuthMethods.displayOrder)); // CRITICAL: Ensures methods are sorted
    
  return results;
}

/**
 * Get ALL auth methods for a login config (including disabled ones)
 * Used by admin login editor to show all methods with toggles
 */
async getServiceAuthMethods(loginConfigId: string) {
  const results = await db
    .select({
      // Same fields as above
      id: serviceAuthMethods.id,
      loginConfigId: serviceAuthMethods.loginConfigId,
      authMethodId: serviceAuthMethods.authMethodId,
      enabled: serviceAuthMethods.enabled,
      showComingSoonBadge: serviceAuthMethods.showComingSoonBadge,
      buttonText: serviceAuthMethods.buttonText,
      buttonVariant: serviceAuthMethods.buttonVariant,
      helpText: serviceAuthMethods.helpText,
      displayOrder: serviceAuthMethods.displayOrder,
      
      name: authMethods.name,
      description: authMethods.description,
      icon: authMethods.icon,
      category: authMethods.category,
      implemented: authMethods.implemented,
      defaultButtonText: authMethods.defaultButtonText,
      defaultButtonVariant: authMethods.defaultButtonVariant,
      defaultHelpText: authMethods.defaultHelpText,
    })
    .from(serviceAuthMethods)
    .innerJoin(authMethods, eq(serviceAuthMethods.authMethodId, authMethods.id))
    .where(eq(serviceAuthMethods.loginConfigId, loginConfigId))
    .orderBy(asc(serviceAuthMethods.displayOrder)); // CRITICAL: Ensures methods are sorted
    
  return results;
}

// Additional storage methods...
async getLoginPageConfigByServiceId(serviceId: string) { /* ... */ }
async getDefaultLoginPageConfig() { /* ... */ }
async getAllLoginPageConfigs() { /* ... */ }
async updateServiceAuthMethod(id: string, data: Partial<InsertServiceAuthMethod>) { /* ... */ }
```

### 3. Unified Authentication Endpoint

```typescript
// server/routes.ts
import { authHandler } from "./auth/AuthHandler";
import { strategyRegistry } from "./auth/StrategyRegistry";

// ==================== Authentication Routes ====================

// Get all available authentication methods (auto-discovered from registry)
app.get("/api/auth/methods", async (req, res) => {
  try {
    const methods = strategyRegistry.getAllMetadata();
    res.json(methods);
  } catch (error: any) {
    console.error("Get auth methods error:", error);
    res.status(500).json({ error: "Failed to fetch authentication methods" });
  }
});

// Unified authentication endpoint (replaces separate /login, /uuid-login, etc.)
app.post("/api/auth/authenticate", async (req, res) => {
  try {
    const { method, serviceId, ...credentials } = req.body;
    
    if (!method) {
      return res.status(400).json({ error: "Authentication method is required" });
    }
    
    // Authenticate using strategy pattern
    const result = await authHandler.authenticate(method, credentials, serviceId);
    
    res.json(result);
  } catch (error: any) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: error.message || "Authentication failed" });
  }
});

// Legacy endpoints for backward compatibility (optional - can redirect to unified endpoint)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { serviceId, ...credentials } = req.body;
    const result = await authHandler.authenticate("email", credentials, serviceId);
    res.json(result);
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({ error: error.message || "Login failed" });
  }
});

app.post("/api/auth/uuid-login", async (req, res) => {
  try {
    const { serviceId, ...credentials } = req.body;
    const result = await authHandler.authenticate("uuid", credentials, serviceId);
    res.json(result);
  } catch (error: any) {
    console.error("UUID login error:", error);
    res.status(401).json({ error: error.message || "UUID login failed" });
  }
});

// ==================== Login Page Configuration Routes ====================

// Get all login page configurations (Admin only - for management UI)
app.get("/api/admin/login-configs", verifyToken, requireAdmin, async (req, res) => {
  try {
    const configs = await storage.getAllLoginPageConfigs(); // Returns all configs with service info
    res.json(configs);
  } catch (error: any) {
    console.error("Get login configs error:", error);
    res.status(500).json({ error: "Failed to fetch login configurations" });
  }
});

// Get login page configuration by ID or service ID (Admin only)
app.get("/api/admin/login-config/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId } = req.query;
    
    let config;
    if (serviceId) {
      config = await storage.getLoginPageConfigByServiceId(serviceId as string);
    } else {
      config = await storage.getLoginPageConfigById(id);
    }
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    
    // Also fetch associated auth methods with overrides
    const methods = await storage.getServiceAuthMethods(config.id);
    
    res.json({ config, methods });
  } catch (error: any) {
    console.error("Get login config error:", error);
    res.status(500).json({ error: "Failed to fetch login configuration" });
  }
});

// Create new login page configuration for a service (Admin only)
app.post("/api/admin/login-config", verifyToken, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertLoginPageConfigSchema.parse(req.body);
    
    // Check if config already exists for this service
    if (validatedData.serviceId) {
      const existing = await storage.getLoginPageConfigByServiceId(validatedData.serviceId);
      if (existing) {
        return res.status(409).json({ error: "Configuration already exists for this service" });
      }
    }
    
    const newConfig = await storage.createLoginPageConfig({
      ...validatedData,
      updatedBy: (req as any).user.id,
    });
    
    // Auto-create default service auth methods entries
    const allMethods = await storage.getAllAuthMethods();
    const serviceAuthMethodsData = allMethods.map((method, index) => ({
      loginConfigId: newConfig.id,
      authMethodId: method.id,
      enabled: method.implemented,
      showComingSoonBadge: !method.implemented,
      displayOrder: index,
    }));
    
    await storage.createServiceAuthMethods(serviceAuthMethodsData);
    
    res.status(201).json(newConfig);
  } catch (error: any) {
    console.error("Create login config error:", error);
    res.status(400).json({ error: error.message || "Failed to create configuration" });
  }
});

// Update login page configuration (Admin only)
app.patch("/api/admin/login-config/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertLoginPageConfigSchema.partial().parse(req.body);
    const updated = await storage.updateLoginPageConfig(id, {
      ...validatedData,
      updatedBy: (req as any).user.id,
      updatedAt: new Date(),
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Update login config error:", error);
    res.status(400).json({ error: error.message || "Failed to update configuration" });
  }
});

// Delete login page configuration (Admin only)
app.delete("/api/admin/login-config/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting default config
    const config = await storage.getLoginPageConfigById(id);
    if (!config.serviceId) {
      return res.status(400).json({ error: "Cannot delete default configuration" });
    }
    
    await storage.deleteLoginPageConfig(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete login config error:", error);
    res.status(500).json({ error: "Failed to delete configuration" });
  }
});

// Get all global authentication methods (Admin only)
app.get("/api/admin/auth-methods", verifyToken, requireAdmin, async (req, res) => {
  try {
    const methods = await storage.getAllAuthMethods();
    res.json(methods);
  } catch (error: any) {
    console.error("Get auth methods error:", error);
    res.status(500).json({ error: "Failed to fetch authentication methods" });
  }
});

// Update service auth method configuration (Admin only)
app.patch("/api/admin/service-auth-methods/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertServiceAuthMethodSchema.partial().parse(req.body);
    const updated = await storage.updateServiceAuthMethod(id, {
      ...validatedData,
      updatedAt: new Date(),
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Update service auth method error:", error);
    res.status(400).json({ error: error.message || "Failed to update service auth method" });
  }
});

// ==================== Public Login Configuration Endpoint ====================

// Public endpoint for login page (used by login page itself)
app.get("/api/login-config", async (req, res) => {
  try {
    const { service_id } = req.query;
    
    let config;
    if (service_id) {
      // Try to get service-specific config
      config = await storage.getLoginPageConfigByServiceId(service_id as string);
    }
    
    // Fall back to default config if no service-specific config exists
    if (!config) {
      config = await storage.getDefaultLoginPageConfig();
    }
    
    if (!config) {
      return res.status(404).json({ error: "No login configuration found" });
    }
    
    // Get enabled auth methods for this config (with enriched data from global auth_methods)
    const methods = await storage.getEnabledServiceAuthMethods(config.id);
    
    res.json({
      config,
      methods,
    });
  } catch (error: any) {
    console.error("Get public login config error:", error);
    res.status(500).json({ error: "Failed to fetch login configuration" });
  }
});
```

---

## Frontend Implementation

### 1. Login Page Editor (`/admin/login-editor`)

**Features:**
- Split-screen layout: Editor on left, Live Preview on right
- Service selector dropdown at top (Default, or select from Global Services)
- Tabs: Branding, Authentication Methods, Advanced Settings
- Drag-and-drop to reorder authentication methods
- Toggle switches to enable/disable methods per service
- Service-specific overrides for button text and help text
- Real-time preview updates as you make changes
- Save/Reset buttons
- Copy configuration from another service
- Create new service-specific configuration

**UI Components:**

#### Service Selector (Top of Page)
```
┌───────────────────────────────────────────────────────────┐
│ Editing Login Page For:                                   │
│ ┌─────────────────────────────────────────────────┐       │
│ │ Default (AuthHub)                           ▼   │       │
│ └─────────────────────────────────────────────────┘       │
│   Options:                                                │
│   - Default (AuthHub)                                     │
│   - Service 1: My SaaS App                                │
│   - Service 2: Partner Portal                             │
│   [+ Create New Service Configuration]                    │
└───────────────────────────────────────────────────────────┘
```

#### Branding Tab
```
┌─────────────────────────────────────┐
│ Branding Configuration              │
├─────────────────────────────────────┤
│ Title                               │
│ [Welcome to AuthHub_______________] │
│                                     │
│ Description                         │
│ [Choose your preferred auth method] │
│                                     │
│ Logo URL (Optional)                 │
│ [https://example.com/logo.png_____] │
│ 📤 Upload Logo                      │
│                                     │
│ Primary Color (Optional)            │
│ [hsl(248, 100%, 28%)______________] │
│ 🎨 Color Picker                     │
│                                     │
│ Default Auth Method                 │
│ ┌─────────────────────────────┐    │
│ │ UUID Login             ▼    │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Copy from Another Service ▼]      │
└─────────────────────────────────────┘
```

#### Authentication Methods Tab
```
┌─────────────────────────────────────────────────────────┐
│ Authentication Methods                                  │
├─────────────────────────────────────────────────────────┤
│ Drag to reorder. Disabled methods are hidden from users│
│                                                         │
│ ┌─── ⋮⋮ UUID Login ─────────────────────────────┐     │
│ │ 🔑 KeyRound | Implemented    [●] Enabled       │     │
│ │ Button Text: [UUID Login__________________]    │     │
│ │ Help Text: [Use an existing Account ID...]     │     │
│ │ ☐ Show "Coming Soon" Badge                     │     │
│ └────────────────────────────────────────────────┘     │
│                                                         │
│ ┌─── ⋮⋮ Email Login ────────────────────────────┐     │
│ │ ✉️ Mail | Implemented        [●] Enabled       │     │
│ │ Button Text: [Email Login_________________]    │     │
│ │ Help Text: [Sign in with your email...]        │     │
│ │ ☐ Show "Coming Soon" Badge                     │     │
│ └────────────────────────────────────────────────┘     │
│                                                         │
│ ┌─── ⋮⋮ Login with Nostr ───────────────────────┐     │
│ │ ⚡ Zap | Not Implemented   [○] Enabled         │     │
│ │ Button Text: [Login with Nostr____________]    │     │
│ │ Help Text: [Requires Nostr browser ext...]     │     │
│ │ ☑ Show "Coming Soon" Badge                     │     │
│ └────────────────────────────────────────────────┘     │
│                                                         │
│ [+ Add Custom Authentication Method]                   │
└─────────────────────────────────────────────────────────┘
```

#### Live Preview Panel
```
┌─────────────────────────────────────┐
│          LIVE PREVIEW               │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │      [Logo/Icon]            │   │
│  │  Welcome to AuthHub         │   │
│  │  Choose your preferred      │   │
│  │  authentication method      │   │
│  │                             │   │
│  │  [UUID Login] [Email Login] │   │
│  │                             │   │
│  │  [Form based on selection]  │   │
│  │                             │   │
│  │  OR AUTHENTICATE WITH       │   │
│  │                             │   │
│  │  [⚡ Login with Nostr]       │   │
│  │  [☁️ Login with BlueSky]     │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 2. Updated Login Page (`/login`)

**URL Patterns:**
- `/login` - Shows default AuthHub login page
- `/login?service_id=<service_id>` - Shows service-specific branded login page

**Changes:**
- Fetch configuration from `/api/login-config?service_id=<id>` on mount
- Extract `service_id` from URL query parameters
- Dynamically render only enabled authentication methods for that service
- Apply service-specific branding (title, description, logo, colors)
- Respect method ordering from service config
- Show/hide "Coming Soon" badges based on service config
- Set default tab based on service config
- Fall back to default config if service doesn't have custom config

```typescript
// client/src/pages/login.tsx
import { useLocation, useSearch } from "wouter";

export default function Login() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const serviceId = params.get("service_id");
  
  // Fetch service-specific or default login configuration
  const { data: loginConfig, isLoading } = useQuery({
    queryKey: ["/api/login-config", serviceId],
    queryFn: async () => {
      const url = serviceId 
        ? `/api/login-config?service_id=${serviceId}`
        : "/api/login-config";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch login config");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter to only enabled methods, sorted by configured order
  const enabledMethods = useMemo(() => {
    if (!loginConfig?.methods) return [];
    
    // Methods come pre-sorted from backend based on displayOrder
    return loginConfig.methods.filter(m => m.enabled);
  }, [loginConfig]);

  // Apply service-specific branding
  const title = loginConfig?.config?.title || "Welcome to AuthHub";
  const description = loginConfig?.config?.description || "Choose your preferred authentication method";
  const logoUrl = loginConfig?.config?.logoUrl;
  const primaryColor = loginConfig?.config?.primaryColor;
  const defaultMethod = loginConfig?.config?.defaultMethod || "uuid";
  
  // ... rest of component
}
```

---

## UI/UX Details

### Drag-and-Drop Reordering
- Use `@dnd-kit/core` and `@dnd-kit/sortable` libraries
- Visual indicators during drag (ghost preview, drop zones)
- Smooth animations on reorder
- Instantly updates preview panel

### Toggle States
- **Implemented + Enabled**: Method fully functional and visible to users
- **Implemented + Disabled**: Method functional but hidden from login page
- **Not Implemented + Enabled**: Shows with "Coming Soon" badge (placeholder)
- **Not Implemented + Disabled**: Completely hidden

### Save/Reset Behavior
- "Save Changes" button in top-right (disabled when no changes)
- "Reset to Defaults" button (shows confirmation dialog)
- Auto-save notification toast on successful save
- Unsaved changes warning when navigating away

### Responsive Design
- Desktop: Side-by-side editor and preview
- Tablet: Tabs to switch between editor and preview
- Mobile: Full-screen editor with preview accessible via button

---

## Testing Scenarios

### Test 1: Default Configuration
1. Login as admin → navigate to `/admin/login-editor`
2. See "Default (AuthHub)" selected in service dropdown
3. Change title from "Welcome to AuthHub" to "Sign In to AuthHub"
4. See preview update immediately
5. Click "Save Changes" → see success toast
6. Open `/login` in incognito window → see new title

**Expected:** Default configuration changes persist and appear on login page

### Test 1B: Service-Specific Configuration
1. In login editor, select "Service 1: My SaaS App" from dropdown
2. Change title to "Welcome to My SaaS App"
3. Change logo and primary color
4. Disable Nostr and BlueSky methods (enable only UUID and Email)
5. Save changes
6. Open `/login?service_id=<service1_id>` → see custom branding
7. Verify only UUID and Email methods are shown
8. Open `/login` (no service_id) → see default AuthHub branding

**Expected:** Service-specific config shows when service_id present, default shows otherwise

### Test 2: Toggle Authentication Methods
1. In editor, disable "Login with Nostr" (toggle off)
2. See preview update - Nostr button disappears
3. Save changes
4. Refresh actual login page → Nostr button not shown
5. Re-enable in editor → appears again
6. Save and verify on login page

**Expected:** Toggling methods controls visibility on login page

### Test 3: Reorder Methods
1. Drag "Email Login" above "UUID Login"
2. See preview update immediately
3. Save changes
4. Check actual login page → Email tab appears first
5. Drag alternative auth buttons to new order
6. Save and verify order persists

**Expected:** Drag-and-drop changes method display order

### Test 4: Custom Branding
1. Upload custom logo image
2. Change primary color to brand color
3. Update title and description
4. See all changes in live preview
5. Save configuration
6. Open login page → see fully branded experience

**Expected:** Complete white-label customization works

### Test 5: Default Method Selection
1. Set default method to "email" in dropdown
2. Save changes
3. Open login page → Email tab is selected by default (not UUID)

**Expected:** Users see configured default method first

### Test 6: Hide Non-Implemented Methods
1. Disable all placeholder methods (Nostr, BlueSky, WebAuthn, Magic Link)
2. Save configuration
3. Login page shows only UUID and Email
4. No "Coming Soon" placeholders visible

**Expected:** Clean login page with only functional methods

### Test 7: Mobile Responsiveness
1. Open login editor on mobile device
2. Switch between editor and preview tabs
3. Make changes on mobile
4. Save successfully
5. View login page on mobile → changes applied

**Expected:** Full mobile editing experience

---

## Database Migration

```bash
# After adding schema changes
npm run db:push --force
```

**Migration creates:**
- `auth_methods` table (auto-populated from strategy registry - initially 2 methods: Email + UUID)
- `login_page_config` table with unique constraint on serviceId (nullable)
- `service_auth_methods` junction table with unique constraint on (loginConfigId, authMethodId)
- Default configuration row with serviceId = null (global/AuthHub config)
- Default service_auth_methods entries linking all registered auth methods to default config

**Important Relationships:**
- Each `login_page_config` can reference ONE `global_service` (or null for default)
- Each service can have only ONE `login_page_config` (unique constraint)
- When a `global_service` is deleted, its `login_page_config` is cascade deleted
- When a `login_page_config` is deleted, all its `service_auth_methods` are cascade deleted
- The default config (serviceId = null) CANNOT be deleted

---

## Navigation Updates

### Add to Admin Navbar
```typescript
// client/src/components/Navbar.tsx
const settingsItems = [
  { path: "/admin/login-editor", label: "Login Page", icon: Shield, testId: "button-login-editor" },
  // ... other settings
];
```

---

## Acceptance Criteria

✅ **Strategy Pattern Implementation:**
- All auth methods implement `AuthStrategy` interface
- Strategy registry singleton manages all strategies
- Each strategy defines metadata once (no duplication)
- Unified `/api/auth/authenticate` endpoint handles all methods
- Post-auth hooks (seeding, JWT) execute for all methods without duplication
- Legacy endpoints work for backward compatibility
- `GET /api/auth/methods` returns auto-discovered strategies
- Database auto-syncs from registry on startup
- Adding new auth method requires only creating strategy class + registering

✅ **Configuration Management:**
- Admin can view current login page configuration
- All settings saved to database (not hardcoded)
- Changes persist across server restarts
- Service-specific configurations supported
- Default configuration serves as fallback

✅ **Branding Customization:**
- Admin can change title and description per service
- Admin can upload/set custom logo per service
- Admin can customize primary color per service
- All branding changes appear in live preview
- Service selector dropdown shows all global services

✅ **Authentication Method Control:**
- Admin can enable/disable any auth method per service
- Admin can reorder methods via drag-and-drop
- Admin can customize button text and help text per service
- Method order and enabled state saved correctly
- Only implemented strategies appear (auto-detected)

✅ **Live Preview:**
- Preview updates in real-time as changes are made
- Preview accurately reflects actual login page
- Preview is responsive (shows desktop/tablet/mobile views)
- Preview reflects service-specific configurations

✅ **User Experience:**
- Login page fetches configuration via `?service_id=...` parameter
- Only enabled methods shown to users for that service
- Methods appear in configured order
- Default method tab is selected on page load
- No hardcoded values - all driven by configuration and strategy registry
- Login page uses unified `/api/auth/authenticate` endpoint

✅ **Security:**
- All configuration endpoints require admin authentication
- Public endpoint only returns enabled methods
- No sensitive data exposed in public endpoint
- Service-specific configs cascade delete with service

✅ **Responsiveness:**
- Editor works on desktop, tablet, and mobile
- Preview panel adapts to screen size
- Drag-and-drop works on touch devices

✅ **Data Integrity:**
- Validation prevents invalid configurations
- Reset to defaults works correctly
- Unsaved changes warning prevents data loss
- Database seeding creates sensible defaults from registry
- Upsert logic ensures safe multi-run syncing

✅ **Extensibility:**
- Adding new auth method is straightforward (one class + registration)
- Strategy metadata propagates everywhere automatically
- No need to update multiple files when adding auth methods
- Type safety enforced via TypeScript interfaces

---

## Implementation Order

### **Phase 0: Strategy Pattern Refactor (Foundation)**
   **Critical: Must be done first before other phases**
   
   1. Create strategy interface and types
      - Create `server/auth/AuthStrategy.ts` with interfaces
      - Define `AuthStrategyMetadata`, `AuthStrategy`, `AuthResult`
   
   2. Create concrete strategy implementations
      - Refactor existing auth to `EmailPasswordStrategy.ts`
      - Refactor existing auth to `UuidStrategy.ts`
      - **DO NOT** create or register placeholder strategies yet
      - Placeholders stay "Coming Soon" until actually implemented
   
   3. Create strategy registry
      - Implement `StrategyRegistry.ts`
      - Register ONLY Email and UUID strategies on startup
      - Leave Nostr, BlueSky, WebAuthn, MagicLink as unregistered placeholders
   
   4. Create unified auth handler
      - Implement `AuthHandler.ts` with common post-auth hooks
      - Replace duplicate logic in routes
   
   5. Update API routes
      - Add `POST /api/auth/authenticate` unified endpoint
      - Keep legacy endpoints for backward compatibility
      - Add `GET /api/auth/methods` for auto-discovery
   
   6. Test strategy pattern
      - Verify email/password login works via unified endpoint
      - Verify UUID login works via unified endpoint
      - Verify all post-auth hooks still execute

### **Phase 1: Database & Backend**
   - Add schema tables (login_page_config, service_auth_methods)
   - Implement auto-sync from strategy registry
   - Create login config API endpoints
   - Seed default configuration from registry

### **Phase 2: Login Page Updates**
   - Add config fetching to login page
   - Make login page render dynamically based on config
   - Support service_id query parameter
   - Update to use unified `/api/auth/authenticate` endpoint

### **Phase 3: Admin Editor UI**
   - Create login editor page with service selector
   - Build branding tab
   - Build authentication methods tab (shows registry data)
   - Implement live preview panel

### **Phase 4: Drag & Drop**
   - Install dnd-kit library
   - Implement sortable auth methods list
   - Wire up reordering logic

### **Phase 5: Save/Reset Logic**
   - Implement save mutations
   - Add reset to defaults
   - Add unsaved changes detection
   - Copy from another service feature

### **Phase 6: Polish & Testing**
   - Add loading states
   - Add error handling
   - Add validation
   - Test all scenarios (especially service-specific configs)
   - Mobile optimization
   - Test strategy extensibility (add a new auth method)

---

## Dependencies

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

Install with:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

---

## Service Integration & OAuth Flow

### How It Works with Services:

When an external service redirects users to AuthHub for authentication:

```
1. External app redirects to:
   https://authhub.example.com/login?service_id=abc123&redirect_uri=...

2. AuthHub login page fetches service-specific config:
   GET /api/login-config?service_id=abc123

3. User sees branded login experience (custom logo, colors, enabled methods)

4. After authentication, user is redirected back with token:
   https://external-app.com/callback?token=...
```

### Admin Workflow for New Service:

1. Admin creates global service in `/admin/global-services`
2. Admin assigns RBAC model to service (if needed)
3. Admin creates custom login page for service in `/admin/login-editor`
   - Select service from dropdown
   - Customize branding
   - Enable/disable auth methods
   - Save configuration
4. Service can now redirect users to AuthHub with branded experience

### Relationship to RBAC Models:

```
Global Service
├── Login Page Config (1:1) - How users see the login page
├── RBAC Model (1:1) - What permissions users get after login
└── User-Service-Role Assignments (many) - Which users have access
```

Both login page configurations and RBAC models are assigned to services independently:
- **Login Page Config**: Controls the authentication UX
- **RBAC Model**: Controls permissions after authentication

---

## Notes

### Admin Experience
- Admins have complete control over login pages without requiring code changes
- Each service can have its own branded login experience
- Services can enable different authentication methods (e.g., one service allows Nostr, another doesn't)
- The login page becomes a "product" that can be customized per service/customer
- Default configuration serves as both the AuthHub login and fallback for unconfigured services
- Configuration is database-driven and environment-specific (dev/staging/prod can differ)
- Service-specific configs are automatically deleted when the service is deleted (cascade)

### Developer Experience (Strategy Pattern Benefits)
- **Adding a new auth method is trivial:**
  1. Create one strategy class (e.g., `WebAuthnStrategy.ts`)
  2. Register it: `strategyRegistry.register(new WebAuthnStrategy())`
  3. **DONE!** It automatically:
     - Appears in login editor UI
     - Syncs to database with `implemented: true`
     - Becomes available on login page
     - Works with service-specific configurations
     - Inherits all post-auth hooks (seeding, JWT, etc.)

- **Zero code duplication:**
  - Post-auth logic (service seeding, RBAC seeding, JWT generation) written once
  - All auth methods share the same flow via `AuthHandler`
  - Unified `/api/auth/authenticate` endpoint handles all methods

- **Type-safe and maintainable:**
  - TypeScript enforces `AuthStrategy` interface
  - Each strategy is independently testable
  - Changes to auth flow automatically apply to all methods

- **Auto-discovery:**
  - `GET /api/auth/methods` returns live data from registry
  - Login editor shows only registered strategies
  - Database auto-syncs on startup

### Current State vs Proposed Architecture

**Current Implementation (Code Duplication):**
```typescript
// server/routes.ts - CURRENT STATE

// Email/Password Login - ~100 lines
app.post("/api/auth/login", async (req, res) => {
  // 1. Extract serviceId from body
  // 2. Validate with loginSchema
  // 3. Check user exists, verify password
  // 4. Check if first user → assign admin
  // 5. Auto-seed services
  // 6. Auto-seed RBAC models if admin
  // 7. Generate JWT token
  // 8. Return { token, user }
});

// UUID Login - ~100 lines  
app.post("/api/auth/uuid-login", async (req, res) => {
  // 1. Extract serviceId from body
  // 2. Validate with uuidLoginSchema
  // 3. Find or create user with UUID
  // 4. Check if first user → assign admin
  // 5. Auto-seed services (DUPLICATED!)
  // 6. Auto-seed RBAC models if admin (DUPLICATED!)
  // 7. Generate JWT token (DUPLICATED!)
  // 8. Return { token, user } (DUPLICATED!)
});

// Problem: Steps 4-8 are identical and duplicated!
// Adding Nostr would duplicate them again in /api/auth/nostr-login
```

**Proposed Implementation (Strategy Pattern):**
```typescript
// server/auth/strategies/EmailPasswordStrategy.ts - ~30 lines
export class EmailPasswordStrategy implements AuthStrategy {
  readonly metadata = {
    id: "email",
    name: "Email Login",
    icon: "Mail",
    buttonText: "Email Login",
    // All UI metadata in one place
  };
  
  async authenticate(credentials) {
    // Only email-specific logic here
    const user = await storage.getUserByEmail(credentials.email);
    const isValid = await bcrypt.compare(credentials.password, user.password);
    return { userId: user.id, email: user.email, ... };
  }
}

// server/auth/strategies/WebAuthnStrategy.ts - ~30 lines
export class WebAuthnStrategy implements AuthStrategy {
  readonly metadata = {
    id: "webauthn",
    name: "WebAuthn",
    icon: "Fingerprint",
    buttonText: "Login with WebAuthn",
  };
  
  async authenticate(credentials) {
    // Only WebAuthn-specific logic here
    const verified = await verifyWebAuthnAssertion(credentials);
    return { userId: verified.userId, ... };
  }
}

// server/auth/AuthHandler.ts - ~50 lines (SHARED BY ALL)
export class AuthHandler {
  async authenticate(method, credentials, serviceId) {
    const strategy = strategyRegistry.get(method);
    const result = await strategy.authenticate(credentials);
    
    // Common post-auth logic - written ONCE, used by ALL methods
    await this.runPostAuthHooks(result.user, result.isNewUser);
    const token = await generateAuthToken(...);
    return { token, user };
  }
}

// server/routes.ts - ~15 lines total for ALL auth methods
app.post("/api/auth/authenticate", async (req, res) => {
  const { method, serviceId, ...credentials } = req.body;
  const result = await authHandler.authenticate(method, credentials, serviceId);
  res.json(result);
});

// Adding WebAuthn = Create 1 strategy class + 1 registration line
// Post-auth hooks automatically apply - zero duplication!
```

### What Gets Built

**Phase 0 (Refactor existing auth):**
- Extract email/UUID logic into strategy classes
- Eliminate ~150 lines of duplicated code
- Create foundation for adding new methods

**Phase 1-6 (Login Editor):**
- Build UI for managing login pages (doesn't exist yet)
- Service-specific configurations (new feature)
- Auto-discovery from strategy registry (new feature)
- Drag-and-drop method ordering (new feature)

The strategy pattern is the **foundation** that makes the login editor possible and maintainable.
