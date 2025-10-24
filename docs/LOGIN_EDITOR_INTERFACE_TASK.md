# Login Interface Management - Multiple Interfaces & Service Binding

## Principle: Reusable Login Experiences
Create multiple branded login interfaces that can be shared across services. One interface can be bound to many services, enabling consistent branding across related applications while minimizing configuration duplication.

---

## Task 1: Login Interfaces - Independent Entity Model - Full Stack
**What you'll see:** Interface library page showing multiple login designs as independent entities

**Changes:**
1. **Schema**: Create `loginInterfaces` table (id, name, description, title, subtitle, logoUrl, primaryColor, backgroundColor, defaultMethod, isTemplate, createdBy, updatedBy, createdAt, updatedAt)
2. **Schema**: Create `serviceLoginInterfaces` junction table (id, serviceId, interfaceId, boundAt, boundBy) with unique constraint on serviceId
3. **Schema**: Rename `serviceAuthMethods` to `interfaceAuthMethods` (id, interfaceId, authMethodId, enabled, displayOrder, buttonText, buttonVariant, helpText, updatedAt)
4. **Backend**: Create `GET /api/admin/login-interfaces` endpoint (returns all interfaces with usage counts)
5. **Backend**: Create `GET /api/admin/login-interfaces/:id` endpoint (returns interface with auth methods)
6. **Backend**: Create `POST /api/admin/login-interfaces` endpoint (create new interface)
7. **Backend**: Create `PATCH /api/admin/login-interfaces/:id` endpoint (update interface branding)
8. **Backend**: Create `DELETE /api/admin/login-interfaces/:id` endpoint (fails if services use it - onDelete: RESTRICT)
9. **Frontend**: Create interface library page at `/admin/interfaces` with card grid
10. **Frontend**: Add "Login Interfaces" link to admin navbar
11. **Frontend**: Each card shows interface name, description, usage count badge, preview thumbnail
12. **Frontend**: Add "Create Interface" button and dialog (name + description + branding)
13. **Frontend**: Add edit/delete/clone actions per card
14. **Frontend**: Show empty state when no interfaces exist
15. **Test in browser**:
    - Login as admin → see "Login Interfaces" in navbar
    - Click link → see interface library with cards
    - Create interface "Enterprise Dark" → appears as card
    - Card shows "Used by 0 services" badge
    - Edit interface → changes persist
    - Try to delete interface in use → see error message
    - Delete unused interface → removed from library

**Database Schema:**
```typescript
// shared/schema.ts
export const loginInterfaces = pgTable("login_interfaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: varchar("description"),
  title: varchar("title").notNull().default("Welcome"),
  subtitle: varchar("subtitle").notNull().default("Choose your authentication method"),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color"),
  backgroundColor: varchar("background_color"),
  defaultMethod: varchar("default_method").notNull().default("uuid"),
  isTemplate: boolean("is_template").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const serviceLoginInterfaces = pgTable("service_login_interfaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").notNull().references(() => globalServices.id, { onDelete: "cascade" }),
  interfaceId: varchar("interface_id").notNull().references(() => loginInterfaces.id, { onDelete: "restrict" }),
  boundAt: timestamp("bound_at").notNull().defaultNow(),
  boundBy: varchar("bound_by").references(() => users.id),
}, (table) => ({
  uniqueServiceInterface: unique().on(table.serviceId),
  interfaceIdIdx: index("interface_id_idx").on(table.interfaceId),
}));
```

**UI Location:** New page at /admin/interfaces with interface card grid

**Acceptance:** Admin can create and manage multiple login interfaces as independent entities

---

## Task 2: Service Binding System - Many-to-Many Relationship - Full Stack
**What you'll see:** Multiple services can share the same login interface, interface changes affect all bound services

**Changes:**
1. **Backend**: Create `PUT /api/admin/services/:serviceId/interface` endpoint (bind interface to service)
2. **Backend**: Create `DELETE /api/admin/services/:serviceId/interface` endpoint (unbind interface from service)
3. **Backend**: Create `GET /api/admin/services/:serviceId/interface` endpoint (get bound interface for service)
4. **Backend**: Create `GET /api/admin/login-interfaces/:id/services` endpoint (get all services using this interface)
5. **Backend**: Update `GET /api/login-config?service_id=...` to resolve service → interface → configuration
6. **Frontend**: Add "Login Interface" section to service settings page
7. **Frontend**: Dropdown selector showing all available interfaces
8. **Frontend**: Display currently bound interface with preview
9. **Frontend**: "Unbind" button to remove interface binding
10. **Frontend**: Warning when unbinding: "This service will use default interface"
11. **Frontend**: Update interface library cards to show list of services using each interface
12. **Frontend**: Add click-through from interface card to see all services using it
13. **Test in browser**:
    - Create interface "Modern Light"
    - Navigate to service settings for "Service A"
    - Select "Modern Light" from interface dropdown → binding created
    - Navigate to "Service B" settings → select same "Modern Light" interface
    - Interface library card now shows "Used by 2 services"
    - Click on interface card → see list: Service A, Service B
    - Edit interface branding → changes immediately reflected on both service login pages
    - Unbind interface from Service A → only Service B uses it
    - Try to delete interface while Service B uses it → see error "Cannot delete - used by 1 service"

**Binding Logic:**
```typescript
// One interface can be bound to many services
// One service can only be bound to one interface (UNIQUE constraint)
// Deleting service removes binding (CASCADE)
// Deleting interface fails if services use it (RESTRICT)
```

**UI Changes:**
- Service settings page shows interface selector
- Interface library cards show service count and list
- Login page resolves service → interface transparently

**UI Location:** Service settings page + interface library page enhancements

**Acceptance:** Multiple services can share one interface, changes propagate to all bound services

---

## Task 3: Interface Cloning & Templates - Full Stack
**What you'll see:** Clone existing interfaces to create variations, mark interfaces as templates for reuse

**Changes:**
1. **Backend**: Create `POST /api/admin/login-interfaces/:id/clone` endpoint (creates duplicate with new name)
2. **Backend**: Cloning copies all branding settings and auth method configurations
3. **Backend**: Cloned interface gets name suffix " (Copy)" or " (Clone)"
4. **Backend**: Cloned interface is not bound to any services (fresh start)
5. **Frontend**: Add "Clone" button to each interface card
6. **Frontend**: Clone dialog asks for new interface name (pre-filled with "X (Copy)")
7. **Frontend**: Add "Mark as Template" toggle to interface editor
8. **Frontend**: Templates get special badge on interface cards
9. **Frontend**: Add "Templates" filter to interface library (show only templates)
10. **Frontend**: Add "Clone & Customize" button prominently displayed for templates
11. **Test in browser**:
    - Create interface "Enterprise Dark" with complete branding
    - Mark it as template → badge appears on card
    - Filter library to show only templates → "Enterprise Dark" visible
    - Click "Clone" → dialog appears with "Enterprise Dark (Copy)" pre-filled
    - Change name to "Partner Portal Dark" → create clone
    - Clone has identical branding but zero service bindings
    - Edit clone independently → original template unchanged
    - Create service "Partner API" → bind to cloned interface
    - Original template still shows "Used by 0 services"

**Cloning Behavior:**
- Copies interface branding settings (title, subtitle, logo, colors)
- Copies auth method configurations (enabled, displayOrder, customizations)
- Creates new UUID for cloned interface
- Does NOT copy service bindings (clone starts with zero bindings)
- Templates are just regular interfaces with `isTemplate: true` flag

**UI Components:**
- Clone button on interface cards
- Clone dialog with name input
- Template badge and filter
- "Clone & Customize" prominent button for templates

**UI Location:** Interface library page with clone/template functionality

**Acceptance:** Admin can clone interfaces to create variations and mark interfaces as reusable templates

---

## Task 4: Migration from Service-Specific to Interface-Based - Full Stack
**What you'll see:** Existing service login configurations migrate cleanly to new interface-based system

**Changes:**
1. **Backend**: Create migration script `server/migrations/migrate-to-interfaces.ts`
2. **Backend**: Script creates one interface per existing `login_page_config` entry
3. **Backend**: Script binds each service to its corresponding interface
4. **Backend**: Script migrates all `service_auth_methods` to `interface_auth_methods`
5. **Backend**: Script creates default interface for global config (serviceId: null)
6. **Backend**: Add migration status check endpoint `GET /api/admin/migration-status`
7. **Backend**: Keep old tables temporarily with `_deprecated` suffix for rollback
8. **Frontend**: Add migration status banner to admin dashboard if migration not completed
9. **Frontend**: "Run Migration" button visible only to admins
10. **Frontend**: Migration progress indicator showing steps
11. **Frontend**: Success message after migration completes
12. **Test in browser**:
    - Start with 3 services having login_page_config entries
    - Run migration → see progress: "Creating interfaces... Binding services... Migrating auth methods..."
    - Migration completes → see success message
    - Navigate to interface library → see 3 new interfaces (one per service)
    - Each interface has service name: "Service A Login", "Service B Login", "Service C Login"
    - Each interface shows "Used by 1 service" (its original service)
    - All existing login pages work unchanged (transparent to end users)
    - Old tables marked deprecated but kept for rollback

**Migration Script Logic:**
```typescript
// For each login_page_config entry:
// 1. Create new loginInterfaces entry with same branding
// 2. Create serviceLoginInterfaces binding
// 3. Migrate service_auth_methods to interface_auth_methods
// 4. Handle global config (serviceId: null) separately
// 5. Verify all data migrated correctly
// 6. Rename old tables with _deprecated suffix
```

**Migration Steps:**
```
1. Create interfaces from configs (3/3 created)
2. Bind services to interfaces (3/3 bound)
3. Migrate auth method configs (12/12 migrated)
4. Verify data integrity (✓ All checks passed)
5. Rename old tables (✓ Complete)
```

**UI Location:** Admin dashboard migration banner + /admin/migration page

**Acceptance:** All existing service login configs migrate to new interface system without data loss or breaking changes

---

## Task 5: Interface Editor with Multi-Service Impact Warning - Full Stack
**What you'll see:** Editing shared interfaces shows clear warnings about which services will be affected

**Changes:**
1. **Frontend**: Update interface editor to show "Services Using This Interface" section at top
2. **Frontend**: Display list of all services bound to this interface
3. **Frontend**: Show count badge: "Changes will affect X services"
4. **Frontend**: Add prominent warning banner when interface is used by multiple services
5. **Frontend**: Warning text: "⚠️ This interface is shared by X services. Changes will affect all of them."
6. **Frontend**: List service names with links to service settings
7. **Frontend**: Add "View Login Page" preview button for each service
8. **Frontend**: Preview opens in new tab with `?service_id=...` parameter
9. **Frontend**: Save button shows confirmation dialog if interface affects multiple services
10. **Frontend**: Confirmation dialog lists all affected services
11. **Test in browser**:
    - Create interface "Shared Enterprise"
    - Bind it to 3 services: "API Gateway", "Admin Portal", "Partner API"
    - Navigate to interface editor
    - Top section shows badge: "Used by 3 services"
    - See list: API Gateway, Admin Portal, Partner API (all with links)
    - Orange warning banner: "⚠️ This interface is shared by 3 services..."
    - Click "Preview" next to "API Gateway" → opens login page in new tab
    - Make branding change → click Save
    - Confirmation dialog appears: "This will affect 3 services: API Gateway, Admin Portal, Partner API. Continue?"
    - Confirm → changes saved and propagated
    - Visit all 3 service login pages → all show updated branding

**Warning UI Components:**
- Services count badge (e.g., "🔗 3 services")
- Warning banner (orange/yellow background)
- Service list with preview buttons
- Confirmation dialog on save

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Shared Interface Warning                    │
│ This interface is used by 3 services. Changes  │
│ will affect all of them.                       │
│                                                 │
│ Services using this interface:                 │
│ • API Gateway          [Preview]               │
│ • Admin Portal         [Preview]               │
│ • Partner API          [Preview]               │
└─────────────────────────────────────────────────┘
```

**UI Location:** Interface editor page with enhanced service impact visibility

**Acceptance:** Admins see clear warnings when editing shared interfaces and can preview impact across services

---

## Task 6: Default Interface System - Full Stack
**What you'll see:** Services without explicit interface binding use a fallback default interface

**Changes:**
1. **Schema**: Add `isDefault` boolean field to `loginInterfaces` table with unique constraint
2. **Backend**: Ensure only one interface can be marked as default (database constraint)
3. **Backend**: Update `GET /api/login-config?service_id=...` to fallback to default interface if no binding exists
4. **Backend**: Create `PUT /api/admin/login-interfaces/:id/set-default` endpoint
5. **Backend**: Auto-create default interface during first-time setup
6. **Frontend**: Add "Set as Default" button to interface cards
7. **Frontend**: Show special "Default" badge on default interface card
8. **Frontend**: Warning when setting new default: "This will replace the current default interface"
9. **Frontend**: Service settings show: "Using default interface" when no explicit binding
10. **Frontend**: Default interface cannot be deleted (show error message)
11. **Test in browser**:
    - Create interface "AuthHub Standard"
    - Click "Set as Default" → interface gets "Default" badge
    - Create new service "Test Service" without binding interface
    - Visit login page for "Test Service" → uses default interface
    - Try to delete default interface → error: "Cannot delete default interface"
    - Set different interface as default → "AuthHub Standard" loses badge, new interface gains it
    - "Test Service" login page automatically switches to new default

**Default Interface Logic:**
```typescript
// Only one interface can be isDefault: true (database constraint)
// Services without explicit binding use default interface
// Default interface cannot be deleted
// Changing default affects all non-bound services immediately
```

**UI Enhancements:**
- "Default" badge on interface cards
- "Set as Default" button
- Delete disabled for default interface
- "Using default" indicator in service settings

**UI Location:** Interface library + service settings pages

**Acceptance:** Services automatically use default interface when no explicit binding exists, admin can change default interface
