# Login Interface Management - Multiple Interfaces with Service Binding

## Task: Multiple Login Interfaces - Full Stack
**What you'll see:** Interface library page where multiple login designs can be created, saved, and bound to services with many-to-one relationships

**Changes:**
1. **Schema**: Create `loginInterfaces` table (id, name, description, title, subtitle, logoUrl, defaultMethod, isDefault, createdBy)
2. **Schema**: Create `serviceLoginInterfaces` junction table (serviceId, interfaceId, boundAt) with unique constraint on serviceId
3. **Schema**: Rename `service_auth_methods` to `interface_auth_methods` (update foreign key to interfaceId)
4. **Backend**: Create `GET /api/admin/login-interfaces` endpoint (returns all interfaces with service count)
5. **Backend**: Create `POST /api/admin/login-interfaces` endpoint (create new interface)
6. **Backend**: Create `PUT /api/admin/services/:serviceId/interface` endpoint (bind interface to service)
7. **Backend**: Update `GET /api/login-config?service_id=...` to resolve service → interface → configuration
8. **Frontend**: Create interface library page at `/admin/interfaces` with card grid
9. **Frontend**: Add "Login Interfaces" link to admin navbar
10. **Frontend**: Interface cards show name, description, "Used by X services" badge
11. **Frontend**: Add interface selector to service settings page
12. **Test in browser**:
    - Create interface "Enterprise Dark" → appears in library
    - Bind Service A to "Enterprise Dark" → card shows "Used by 1 service"
    - Bind Service B to same interface → card shows "Used by 2 services"
    - Edit interface branding → both services reflect changes immediately

**Database:**
```typescript
// shared/schema.ts
export const loginInterfaces = pgTable("login_interfaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  title: varchar("title").notNull().default("Welcome"),
  defaultMethod: varchar("default_method").notNull().default("uuid"),
  isDefault: boolean("is_default").notNull().default(false),
});

export const serviceLoginInterfaces = pgTable("service_login_interfaces", {
  serviceId: varchar("service_id").references(() => globalServices.id, { onDelete: "cascade" }),
  interfaceId: varchar("interface_id").references(() => loginInterfaces.id, { onDelete: "restrict" }),
}, (table) => ({ uniqueServiceInterface: unique().on(table.serviceId) }));

// Rename service_auth_methods → interface_auth_methods
export const interfaceAuthMethods = pgTable("interface_auth_methods", {
  interfaceId: varchar("interface_id").references(() => loginInterfaces.id),
  // ... rest of columns unchanged
});
```

**Relationship Logic:**
- One interface → Many services (one-to-many)
- One service → One interface (enforced by unique constraint)
- Deleting service removes binding (CASCADE)
- Deleting interface fails if services use it (RESTRICT)

**UI Location:** New page at /admin/interfaces + interface selector in service settings

**Acceptance:** Multiple services can share one interface, interface changes propagate to all bound services, interface library shows usage counts
