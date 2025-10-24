# Login Page Editor - Admin Customization Interface

## Principle: Complete Control Over Authentication Experience
Admins can customize every aspect of the login page: branding, enabled methods, ordering, text, and appearance - all without touching code.

## Architecture: Service-Specific Login Pages
Login page configurations can be assigned to specific services, similar to RBAC models. Each service gets its own branded login experience with custom authentication methods, while a default configuration serves the main AuthHub login.

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
  
  // Method ordering (JSON array of method IDs in display order)
  methodOrder: json("method_order").$type<string[]>().notNull().default(sql`'["uuid","email","nostr","bluesky","webauthn","magic_link"]'::json`),
  
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
export const authMethodsEnum = pgEnum("auth_method_type", [
  "uuid",
  "email", 
  "nostr",
  "bluesky",
  "webauthn",
  "magic_link"
]);

export const authMethods = pgTable("auth_methods", {
  id: varchar("id").primaryKey(), // "uuid", "email", "nostr", etc.
  name: varchar("name").notNull(), // Display name: "UUID Login", "Email Login", etc.
  description: varchar("description").notNull(), // Description shown to users
  icon: varchar("icon").notNull(), // Lucide icon name: "KeyRound", "Mail", "Zap", etc.
  type: authMethodsEnum("type").notNull(),
  
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

### 1. Seed Default Configuration
```typescript
// server/storage.ts
async seedLoginPageConfig() {
  // Seed global authentication methods (if not already seeded)
  const existingMethods = await db.select().from(authMethods).limit(1);
  if (existingMethods.length === 0) {
    const methods = [
      {
        id: "uuid",
        name: "UUID Login",
        description: "Use an existing Account ID or generate a new one for anonymous authentication",
        icon: "KeyRound",
        type: "uuid",
        implemented: true,
        defaultButtonText: "UUID Login",
        defaultButtonVariant: "default",
      },
      {
        id: "email",
        name: "Email Login",
        description: "Sign in with your email and password",
        icon: "Mail",
        type: "email",
        implemented: true,
        defaultButtonText: "Email Login",
        defaultButtonVariant: "default",
      },
      {
        id: "nostr",
        name: "Nostr",
        description: "Authenticate using your Nostr public key with cryptographic signatures",
        icon: "Zap",
        type: "nostr",
        implemented: false,
        defaultButtonText: "Login with Nostr",
        defaultButtonVariant: "outline",
        defaultHelpText: "Requires Nostr browser extension (Alby or nos2x)",
      },
      {
        id: "bluesky",
        name: "BlueSky",
        description: "Sign in with your BlueSky ATProtocol identity",
        icon: "Cloud",
        type: "bluesky",
        implemented: false,
        defaultButtonText: "Login with BlueSky",
        defaultButtonVariant: "outline",
      },
      {
        id: "webauthn",
        name: "WebAuthn",
        description: "Passwordless authentication using biometrics or security keys",
        icon: "Fingerprint",
        type: "webauthn",
        implemented: false,
        defaultButtonText: "Login with WebAuthn",
        defaultButtonVariant: "outline",
      },
      {
        id: "magic_link",
        name: "Magic Link",
        description: "Receive a one-time login link via email",
        icon: "Sparkles",
        type: "magic_link",
        implemented: false,
        defaultButtonText: "Login with Magic Link",
        defaultButtonVariant: "outline",
      },
    ];
    
    await db.insert(authMethods).values(methods);
  }
  
  // Seed default login page configuration (serviceId = null)
  const existingDefaultConfig = await db.select()
    .from(loginPageConfig)
    .where(isNull(loginPageConfig.serviceId))
    .limit(1);
    
  if (existingDefaultConfig.length === 0) {
    const [defaultConfig] = await db.insert(loginPageConfig).values({
      serviceId: null, // Default configuration
      title: "Welcome to AuthHub",
      description: "Choose your preferred authentication method",
      defaultMethod: "uuid",
      methodOrder: ["uuid", "email", "nostr", "bluesky", "webauthn", "magic_link"],
    }).returning();
    
    // Seed service auth methods for default config
    const allMethods = await db.select().from(authMethods);
    const serviceAuthMethodsData = allMethods.map((method, index) => ({
      loginConfigId: defaultConfig.id,
      authMethodId: method.id,
      enabled: method.implemented, // Only enable implemented methods by default
      showComingSoonBadge: !method.implemented, // Show badge for non-implemented
      displayOrder: index,
    }));
    
    await db.insert(serviceAuthMethods).values(serviceAuthMethodsData);
  }
}
```

### 2. API Endpoints

```typescript
// server/routes.ts

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
- `auth_methods` table with 6 global authentication method definitions
- `login_page_config` table with unique constraint on serviceId (nullable)
- `service_auth_methods` junction table with unique constraint on (loginConfigId, authMethodId)
- Default configuration row with serviceId = null (global/AuthHub config)
- Default service_auth_methods entries linking all 6 auth methods to default config

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

✅ **Configuration Management:**
- Admin can view current login page configuration
- All settings saved to database (not hardcoded)
- Changes persist across server restarts

✅ **Branding Customization:**
- Admin can change title and description
- Admin can upload/set custom logo
- Admin can customize primary color
- All branding changes appear in live preview

✅ **Authentication Method Control:**
- Admin can enable/disable any auth method
- Admin can reorder methods via drag-and-drop
- Admin can customize button text and help text
- Admin can toggle "Coming Soon" badges
- Method order and enabled state saved correctly

✅ **Live Preview:**
- Preview updates in real-time as changes are made
- Preview accurately reflects actual login page
- Preview is responsive (shows desktop/tablet/mobile views)

✅ **User Experience:**
- Login page fetches and applies configuration on load
- Only enabled methods shown to users
- Methods appear in configured order
- Default method tab is selected on page load
- No hardcoded values - all driven by configuration

✅ **Security:**
- All configuration endpoints require admin authentication
- Public endpoint only returns enabled methods
- No sensitive data exposed in public endpoint

✅ **Responsiveness:**
- Editor works on desktop, tablet, and mobile
- Preview panel adapts to screen size
- Drag-and-drop works on touch devices

✅ **Data Integrity:**
- Validation prevents invalid configurations
- Reset to defaults works correctly
- Unsaved changes warning prevents data loss
- Database seeding creates sensible defaults

---

## Implementation Order

1. **Phase 1: Database & Backend**
   - Add schema tables
   - Implement storage methods
   - Create API endpoints
   - Seed default configuration

2. **Phase 2: Login Page Updates**
   - Add config fetching to login page
   - Make login page render dynamic based on config
   - Test with hardcoded config first

3. **Phase 3: Admin Editor UI**
   - Create login editor page
   - Build branding tab
   - Build authentication methods tab
   - Implement live preview panel

4. **Phase 4: Drag & Drop**
   - Install dnd-kit library
   - Implement sortable auth methods list
   - Wire up reordering logic

5. **Phase 5: Save/Reset Logic**
   - Implement save mutations
   - Add reset to defaults
   - Add unsaved changes detection

6. **Phase 6: Polish & Testing**
   - Add loading states
   - Add error handling
   - Add validation
   - Test all scenarios
   - Mobile optimization

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

- This feature gives admins complete control without requiring code changes
- Each service can have its own branded login experience
- Services can enable different authentication methods (e.g., one service allows Nostr, another doesn't)
- The login page becomes a "product" that can be customized per service/customer
- Default configuration serves as both the AuthHub login and fallback for unconfigured services
- Configuration is database-driven and environment-specific (dev/staging/prod can differ)
- Service-specific configs are automatically deleted when the service is deleted (cascade)
