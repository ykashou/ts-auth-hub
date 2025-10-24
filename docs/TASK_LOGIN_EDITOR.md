# Login Page Editor - Admin Customization Interface

## Principle: Complete Control Over Authentication Experience
Admins can customize every aspect of the login page: branding, enabled methods, ordering, text, and appearance - all without touching code.

---

## Task: Login Page Editor & Configuration System - Full Stack
**What you'll see:** Admin page with live preview and drag-and-drop configuration for the login page

**Current State:**
- Login page has hardcoded authentication methods (UUID, Email, Nostr, BlueSky, WebAuthn, Magic Link)
- All methods shown regardless of whether they're implemented
- Branding is fixed (AuthHub logo, hardcoded title/description)
- No way to customize without editing code
- All placeholder methods show "Coming Soon" badge

**Goal State:**
- Admin can toggle authentication methods on/off individually
- Admin can reorder authentication methods via drag-and-drop
- Admin can customize branding (logo, title, description, colors)
- Admin can set default authentication method (which tab is selected by default)
- Admin can customize button text and labels
- Live preview shows exactly how login page will appear to users
- Changes saved to database and applied immediately
- Non-implemented methods can be hidden from users

---

## Database Schema Changes

### 1. Login Page Configuration Table
```typescript
// shared/schema.ts
export const loginPageConfig = pgTable("login_page_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id), // Admin who made last change
});

export const insertLoginPageConfigSchema = createInsertSchema(loginPageConfig);
export type LoginPageConfig = typeof loginPageConfig.$inferSelect;
export type InsertLoginPageConfig = z.infer<typeof insertLoginPageConfigSchema>;
```

### 2. Authentication Methods Table
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
  
  // Status
  enabled: boolean("enabled").notNull().default(false), // Can users see this method?
  implemented: boolean("implemented").notNull().default(false), // Is backend ready?
  
  // Customization
  buttonText: varchar("button_text").notNull(), // e.g., "Login with Nostr"
  buttonVariant: varchar("button_variant").notNull().default("outline"), // "default" | "outline" | "ghost"
  showComingSoonBadge: boolean("show_coming_soon_badge").notNull().default(true),
  
  // Help text shown below method selector
  helpText: varchar("help_text"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAuthMethodSchema = createInsertSchema(authMethods);
export type AuthMethod = typeof authMethods.$inferSelect;
export type InsertAuthMethod = z.infer<typeof insertAuthMethodSchema>;
```

---

## Backend Implementation

### 1. Seed Default Configuration
```typescript
// server/storage.ts
async seedLoginPageConfig() {
  // Check if config already exists
  const existing = await db.select().from(loginPageConfig).limit(1);
  if (existing.length > 0) return;
  
  // Seed default configuration
  await db.insert(loginPageConfig).values({
    title: "Welcome to AuthHub",
    description: "Choose your preferred authentication method",
    defaultMethod: "uuid",
    methodOrder: ["uuid", "email", "nostr", "bluesky", "webauthn", "magic_link"],
  });
  
  // Seed authentication methods
  const methods = [
    {
      id: "uuid",
      name: "UUID Login",
      description: "Use an existing Account ID or generate a new one for anonymous authentication",
      icon: "KeyRound",
      type: "uuid",
      enabled: true,
      implemented: true,
      buttonText: "UUID Login",
      showComingSoonBadge: false,
    },
    {
      id: "email",
      name: "Email Login",
      description: "Sign in with your email and password",
      icon: "Mail",
      type: "email",
      enabled: true,
      implemented: true,
      buttonText: "Email Login",
      showComingSoonBadge: false,
    },
    {
      id: "nostr",
      name: "Nostr",
      description: "Authenticate using your Nostr public key with cryptographic signatures",
      icon: "Zap",
      type: "nostr",
      enabled: true,
      implemented: false,
      buttonText: "Login with Nostr",
      showComingSoonBadge: true,
      helpText: "Requires Nostr browser extension (Alby or nos2x)",
    },
    {
      id: "bluesky",
      name: "BlueSky",
      description: "Sign in with your BlueSky ATProtocol identity",
      icon: "Cloud",
      type: "bluesky",
      enabled: true,
      implemented: false,
      buttonText: "Login with BlueSky",
      showComingSoonBadge: true,
    },
    {
      id: "webauthn",
      name: "WebAuthn",
      description: "Passwordless authentication using biometrics or security keys",
      icon: "Fingerprint",
      type: "webauthn",
      enabled: true,
      implemented: false,
      buttonText: "Login with WebAuthn",
      showComingSoonBadge: true,
    },
    {
      id: "magic_link",
      name: "Magic Link",
      description: "Receive a one-time login link via email",
      icon: "Sparkles",
      type: "magic_link",
      enabled: true,
      implemented: false,
      buttonText: "Login with Magic Link",
      showComingSoonBadge: true,
    },
  ];
  
  await db.insert(authMethods).values(methods);
}
```

### 2. API Endpoints (Admin Only)

```typescript
// server/routes.ts

// ==================== Login Page Configuration Routes ====================

// Get current login page configuration
app.get("/api/admin/login-config", verifyToken, requireAdmin, async (req, res) => {
  try {
    const config = await storage.getLoginPageConfig();
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    res.json(config);
  } catch (error: any) {
    console.error("Get login config error:", error);
    res.status(500).json({ error: "Failed to fetch login configuration" });
  }
});

// Update login page configuration
app.patch("/api/admin/login-config", verifyToken, requireAdmin, async (req, res) => {
  try {
    const validatedData = insertLoginPageConfigSchema.partial().parse(req.body);
    const updated = await storage.updateLoginPageConfig({
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

// Get all authentication methods
app.get("/api/admin/auth-methods", verifyToken, requireAdmin, async (req, res) => {
  try {
    const methods = await storage.getAllAuthMethods();
    res.json(methods);
  } catch (error: any) {
    console.error("Get auth methods error:", error);
    res.status(500).json({ error: "Failed to fetch authentication methods" });
  }
});

// Update authentication method
app.patch("/api/admin/auth-methods/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertAuthMethodSchema.partial().parse(req.body);
    const updated = await storage.updateAuthMethod(id, {
      ...validatedData,
      updatedAt: new Date(),
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Update auth method error:", error);
    res.status(400).json({ error: error.message || "Failed to update authentication method" });
  }
});

// Public endpoint for login page (used by login page itself)
app.get("/api/login-config", async (req, res) => {
  try {
    const config = await storage.getLoginPageConfig();
    const methods = await storage.getEnabledAuthMethods(); // Only return enabled methods
    
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
- Tabs: Branding, Authentication Methods, Advanced Settings
- Drag-and-drop to reorder authentication methods
- Toggle switches to enable/disable methods
- Real-time preview updates as you make changes
- Save/Reset buttons

**UI Components:**

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

**Changes:**
- Fetch configuration from `/api/login-config` on mount
- Dynamically render only enabled authentication methods
- Apply custom branding (title, description, logo, colors)
- Respect method ordering from config
- Show/hide "Coming Soon" badges based on config
- Set default tab based on config

```typescript
// client/src/pages/login.tsx
const { data: loginConfig } = useQuery({
  queryKey: ["/api/login-config"],
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});

// Filter to only enabled methods, sorted by configured order
const enabledMethods = useMemo(() => {
  if (!loginConfig?.methods) return [];
  
  const methodMap = new Map(loginConfig.methods.map(m => [m.id, m]));
  const order = loginConfig.config.methodOrder || [];
  
  return order
    .map(id => methodMap.get(id))
    .filter(m => m && m.enabled);
}, [loginConfig]);

// Apply branding
const title = loginConfig?.config?.title || "Welcome to AuthHub";
const description = loginConfig?.config?.description || "Choose your preferred authentication method";
const logoUrl = loginConfig?.config?.logoUrl;
const primaryColor = loginConfig?.config?.primaryColor;
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

### Test 1: Basic Configuration
1. Login as admin → navigate to `/admin/login-editor`
2. See current configuration loaded in editor
3. Change title from "Welcome to AuthHub" to "Sign In to MyApp"
4. See preview update immediately
5. Click "Save Changes" → see success toast
6. Open login page in incognito window → see new title

**Expected:** Title changes persist and appear on actual login page

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
- `login_page_config` table with default row
- `auth_methods` table with 6 default methods
- Seeds configuration on first run

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

## Advanced Features (Optional Enhancements)

### 1. A/B Testing
- Create multiple login page variants
- Track conversion rates per configuration
- Analytics dashboard showing which config performs better

### 2. Conditional Logic
- Show different methods based on user location
- Hide methods during maintenance windows
- Enable methods based on time of day

### 3. Custom CSS
- Text area for custom CSS injection
- Override specific element styles
- Preview custom CSS in real-time

### 4. Multi-Language Support
- Configure text in multiple languages
- Auto-detect user language
- Language switcher on login page

### 5. SSO Integration
- Add OAuth providers (Google, GitHub, Microsoft)
- Configure callback URLs
- Test SSO flow from editor

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

## Notes

- This feature gives admins complete control without requiring code changes
- The login page becomes a "product" that can be customized per deployment
- Enables white-labeling for different environments/customers
- Configuration is environment-specific (dev/staging/prod can have different configs)
- Future: Export/import configurations for easy deployment migration
