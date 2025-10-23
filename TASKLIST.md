# User Management with Service Enablement - Tightly Coupled Iterative Plan

## Principle: Every Backend Change Has Immediate UI Reflection
No table, field, or endpoint exists without being visible and usable in the UI in the same task.

---

## Task 1: Add User Roles - Full Stack
**What you'll see:** Role badge appears in dashboard showing "Admin" or "User"

**Changes:**
1. **Schema**: Add `role` enum + field to users table (default: "user")
2. **Backend**: Update auth endpoints to return `role` in response
3. **Backend**: Add `role` to JWT payload
4. **Frontend**: Store role in auth state
5. **Frontend**: Add role badge to dashboard header
6. **Test in browser**: Register → see "User" badge appear

**Database:**
```typescript
// shared/schema.ts
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
role: userRoleEnum("role").notNull().default("user")
```

**API Response:**
```json
{ "token": "...", "user": { "id": "...", "email": "...", "role": "user" } }
```

**UI Location:** Dashboard header (top right near services)

**Acceptance:** Role badge visible for all logged-in users

---

## Task 2: First User Auto-Admin - Full Stack
**What you'll see:** First registered user gets "Admin" badge, second user gets "User" badge

**Changes:**
1. **Backend**: In register/uuid-login, check user count
2. **Backend**: If count = 0, set role to "admin"
3. **Frontend**: Show toast when promoted: "You are the first user - promoted to Admin!"
4. **Test in browser**: 
   - Delete all users from DB
   - Register → see "Admin" badge + toast
   - Register second user → see "User" badge

**Logic:**
```typescript
const userCount = await storage.getUserCount();
const role = userCount === 0 ? "admin" : "user";
```

**Acceptance:** First user is admin, subsequent users are regular users, visible immediately

---

## Task 3: Differentiate Admin vs User Dashboard - Full Stack
**What you'll see:** Admins see full dashboard, regular users see empty dashboard with removed sections

**Changes:**
1. **Frontend**: Add role-based conditional rendering to dashboard
2. **Frontend**: For admin: Show all sections (services, config, API docs, widget)
3. **Frontend**: For user: Show empty state with message
4. **Frontend**: Hide services card grid for regular users
5. **Frontend**: Hide config section for regular users
6. **Frontend**: Hide API docs section for regular users
7. **Frontend**: Hide widget section for regular users
8. **Frontend**: Remove navigation links to hidden sections for users
9. **Test in browser**:
   - Login as admin → see full dashboard with all sections
   - Login as regular user → see empty dashboard
   - Regular user can't access /config, /api-docs, /widget (redirect to dashboard)

**Empty State Message:**
```
"Welcome to AuthHub"
"Your account is set up. Access to services is managed by your administrator."
```

**UI Changes:**
- Dashboard page has conditional rendering based on `userRole`
- Navigation links hidden for regular users
- Protected routes redirect non-admins to dashboard

**Acceptance:** Regular users see minimal empty dashboard, admins see everything

---

## Task 4: User Management Page with Admin Navbar - Full Stack
**What you'll see:** Admins see "User Management" link in navbar leading to a page with all users in a table

**Changes:**
1. **Backend**: Create `requireAdmin` middleware (returns 403 if not admin)
2. **Backend**: Create endpoint `GET /api/admin/users` (returns all users with role info)
3. **Frontend**: Add "User Management" link to navbar (conditional on admin role)
4. **Frontend**: Create User Management page at `/admin/users` with full user table
5. **Frontend**: Add route protection (redirects non-admins to dashboard)
6. **Frontend**: Table shows: UUID, email, role badge, created date, services count (0 for now)
7. **Frontend**: Add search functionality to filter users
8. **Test in browser**:
   - Login as admin → see "User Management" in navbar
   - Click link → see table with all users and their roles
   - Register new user → appears in table immediately
   - Login as regular user → navbar item hidden, direct access redirected to dashboard

**Table Columns:**
- UUID (with copy button)
- Email (or "Anonymous")
- Role (Admin/User badge)
- Created (date + time)
- Services (count - shows "0" for now)

**UI Location:** New navbar link + new page at /admin/users

**Acceptance:** Admin can view and search all users in dedicated management page

---

## Task 5: Enhanced User Management with Advanced Table Features - Full Stack
**What you'll see:** Full-fledged user management with filtering, sorting, bulk actions, and inline editing

**Changes:**
1. **Frontend**: Add advanced filtering controls (role filter, date range filter, service count filter)
2. **Frontend**: Add table sorting by clicking column headers (UUID, email, role, created date, services)
3. **Frontend**: Add bulk selection with checkboxes for multi-user actions
4. **Frontend**: Add action dropdown for each user (Edit, Delete, Change Role)
5. **Frontend**: Implement inline editing modal/dialog for user details (email, role)
6. **Frontend**: Add pagination controls (10/25/50 users per page)
7. **Frontend**: Add bulk actions toolbar (Delete selected, Export to CSV)
8. **Backend**: Create `PATCH /api/admin/users/:id` endpoint for updating user details
9. **Backend**: Create `DELETE /api/admin/users/:id` endpoint for deleting users
10. **Backend**: Add validation to prevent deleting last admin
11. **Test in browser**:
    - Filter users by role → see only admins or only regular users
    - Click column headers → table sorts by that column
    - Select multiple users → bulk actions appear
    - Click "Edit" on a user → modal opens with user details
    - Update user email → changes persist and table refreshes
    - Try to delete last admin → see error message
    - Delete regular user → user removed from table
    - Export users to CSV → download file with user data

**New UI Components:**
- Filter controls bar (role dropdown, date picker, service count slider)
- Sortable table headers with up/down arrows
- Checkbox column for bulk selection
- Action menu (three dots) in each row
- Edit user dialog/modal
- Confirmation dialogs for destructive actions
- Pagination controls at table footer
- Bulk actions toolbar

**Table Enhancements:**
- Sortable: UUID, Email, Role, Created Date, Services Count
- Filterable: Role (Admin/User/All), Created Date Range, Services Count Range
- Selectable: Checkboxes for bulk operations
- Actionable: Edit, Delete, Change Role per user

**UI Location:** Enhanced /admin/users page with advanced table features

**Acceptance:** Admin has full control over users with filtering, sorting, editing, and bulk operations

---

## Task 6: Role-Based Access Control (RBAC) Configuration Page - Full Stack
**What you'll see:** Admin page for configuring permissions and access control policies

**Changes:**
1. **Schema**: Create `permissions` table (id, name, description, resource, action, createdAt)
2. **Schema**: Create `rolePermissions` junction table (roleId, permissionId, createdAt)
3. **Backend**: Create `GET /api/admin/rbac/permissions` endpoint (returns all permissions)
4. **Backend**: Create `POST /api/admin/rbac/permissions` endpoint (create new permission)
5. **Backend**: Create `GET /api/admin/rbac/roles` endpoint (returns roles with their permissions)
6. **Backend**: Create `PATCH /api/admin/rbac/roles/:role/permissions` endpoint (update role permissions)
7. **Frontend**: Create RBAC page at `/admin/rbac` with permission management UI
8. **Frontend**: Add "Access Control" link to admin navbar
9. **Frontend**: Display two-panel layout: Roles on left, Permissions on right
10. **Frontend**: Show permission matrix (roles vs permissions grid with checkboxes)
11. **Frontend**: Allow admins to grant/revoke permissions per role
12. **Frontend**: Add permission creation dialog for custom permissions
13. **Test in browser**:
    - Login as admin → see "Access Control" in navbar
    - Click link → see RBAC configuration page
    - View default permissions (e.g., "manage_users", "manage_services", "view_analytics")
    - Toggle permissions for "user" role → see changes persist
    - Create new permission → appears in matrix
    - Regular user can't access page (redirected to dashboard)

**Default Permissions:**
- Admin role: All permissions by default
- User role: Limited permissions (view own services, manage own profile)

**Permission Matrix UI:**
```
           | manage_users | manage_services | view_analytics | ...
-----------+--------------+-----------------+----------------+----
Admin      |      ✓       |        ✓        |       ✓        | ...
User       |      ✗       |        ✗        |       ✗        | ...
```

**UI Components:**
- Role cards/list on left sidebar
- Permission grid/table in main area
- Add Permission dialog
- Permission description tooltips
- Real-time toggle switches for grant/revoke

**UI Location:** New page at /admin/rbac with two-panel layout

**Acceptance:** Admin can view and configure role-based permissions through intuitive UI

---

## Task 7: Global Services & Admin Service Manager - Full Stack
**What you'll see:** Admin page showing all global services in a card grid

**Changes:**
1. **Schema**: Create `globalServices` table (id, name, description, url, icon, color, secret, createdAt)
2. **Backend**: Create `POST /api/admin/global-services` endpoint
3. **Backend**: Create `GET /api/admin/global-services` endpoint
4. **Backend**: Seed 7 default services when first admin registers
5. **Frontend**: Create "Service Catalog" page at /admin/services
6. **Frontend**: Display services in card grid (same style as dashboard)
7. **Frontend**: Add "Service Catalog" link to admin navbar
8. **Test in browser**:
   - Login as admin → click "Service Catalog"
   - See 7 seeded services in grid
   - Regular user can't access page

**UI Location:** New page at /admin/services with service cards

**Acceptance:** Global services visible in admin UI immediately after seeding

---

## Task 8: Service Enablement for Users - Full Stack
**What you'll see:** Admin can toggle services on/off for each user in User Management table

**Changes:**
1. **Schema**: Create `userServices` junction table (userId, serviceId, enabledAt)
2. **Backend**: Create `GET /api/admin/users/:userId/services` - returns enabled services
3. **Backend**: Create `POST /api/admin/users/:userId/services/:serviceId` - enable service
4. **Backend**: Create `DELETE /api/admin/users/:userId/services/:serviceId` - disable service
5. **Frontend**: Add expandable row in User Management table
6. **Frontend**: Show toggles for each global service
7. **Frontend**: When toggled → call enable/disable endpoint
8. **Frontend**: Update count in table immediately (optimistic UI)
9. **Test in browser**:
   - Login as admin → expand user row
   - See toggles for all 7 services (all OFF initially)
   - Toggle service ON → see API call + count update
   - Refresh page → toggle state persists

**Table Change:** "Services" column now clickable, expands to show toggle switches

**Acceptance:** Admin can enable/disable services per user, changes persist

---

## Task 9: Users See Only Enabled Services - Full Stack
**What you'll see:** Regular user dashboard shows only services enabled for them by admin

**Changes:**
1. **Backend**: Create `GET /api/services/enabled` endpoint
2. **Backend**: Returns services from userServices junction for current user
3. **Backend**: For admins: return all global services (admin override)
4. **Frontend**: Update dashboard to fetch from `/api/services/enabled`
5. **Frontend**: Show empty state if user has 0 enabled services
6. **Frontend**: Message: "No services enabled. Contact admin to request access."
7. **Test in browser**:
   - Login as admin → enable 2 services for User A
   - Login as User A → see only those 2 services
   - Login as admin → enable 1 more service for User A
   - User A refreshes → sees 3 services now
   - Login as User B with 0 enabled services → see empty state

**Dashboard Change:** Service cards now filtered by userServices assignments

**Acceptance:** Users see only their enabled services, admins see all

---

## Task 10: Role Management UI - Full Stack
**What you'll see:** Admin can promote users to admin or demote to regular user via dropdown

**Changes:**
1. **Backend**: Create `GET /api/admin/count` endpoint (returns number of admins)
2. **Backend**: Create `PATCH /api/admin/users/:userId/role` endpoint
3. **Backend**: Check admin count > 1 before allowing demotion
4. **Backend**: Return 400 error: "Cannot demote last admin"
5. **Frontend**: Add role dropdown in User Management table
6. **Frontend**: Fetch admin count to determine if dropdown should be disabled
7. **Frontend**: Show tooltip on disabled dropdown: "Cannot demote last admin"
8. **Frontend**: On role change → show toast + refresh table
9. **Test in browser**:
   - With 1 admin → dropdown disabled for that admin
   - Promote another user to admin → first admin's dropdown becomes enabled
   - Demote second admin → works fine
   - Try to demote last admin → see tooltip + disabled state

**Table Change:** Role badge becomes interactive dropdown for admins

**Acceptance:** Cannot remove last admin, role changes work for others

---

## Task 11: Migrate Existing Services to Global Catalog - Full Stack
**What you'll see:** Old user-specific services become global, users keep access via userServices

**Changes:**
1. **Backend**: Create migration script `server/migrate-services.ts`
2. **Backend**: Script logic:
   - Copy distinct services from old `services` table to `globalServices`
   - For each user's old services, create userServices entries
   - Preserve encrypted secrets
   - Deduplicate by name+url
3. **Backend**: Add npm script: `"migrate": "tsx server/migrate-services.ts"`
4. **Frontend**: Remove old service CRUD UI from dashboard
5. **Frontend**: Add note: "Services are now managed globally by admins"
6. **Test in browser**:
   - Run migration: `npm run migrate`
   - Login as existing user → see all their old services still work
   - Check User Management → see services correctly assigned
   - Check Service Catalog → see all unique services

**Migration Steps:**
1. Backup database
2. Run `npm run migrate`
3. Verify in UI
4. Drop old `services` table
5. Rename `globalServices` to `services`

**Acceptance:** Existing users retain access to their services after migration

---

## Task 12: Service Auto-Enablement for New Users - Full Stack
**What you'll see:** New users automatically get access to a default set of services

**Changes:**
1. **Backend**: Add config for default services (array of service IDs)
2. **Backend**: After user registration, auto-enable default services
3. **Backend**: Make this configurable (e.g., first 3 services alphabetically)
4. **Frontend**: Show indicator in Service Catalog which services are "default enabled"
5. **Frontend**: Add star icon or "Default" badge on default service cards
6. **Frontend**: In User Management, show which services were auto-enabled vs manually enabled
7. **Test in browser**:
   - Register new user
   - Login as that user → see 3 default services already enabled
   - Login as admin → User Management shows those 3 services toggled ON
   - Admin can still disable them manually

**Config Location:** Environment variable or database setting

**Acceptance:** New users immediately have access to default services without admin intervention

---

## Testing Protocol (After Each Task)

1. **Apply changes**: `npm run db:push` (or `--force` if needed)
2. **Restart workflow**: Automatic on file save
3. **Open browser**: Test the specific UI changes described
4. **Verify persistence**: Refresh page, changes should persist
5. **Check previous tasks**: Make sure nothing broke
6. **Check console**: No errors in browser console

---

## Rollback Strategy

Each task is atomic. If something breaks:
1. Revert code changes for that task only
2. Run `npm run db:push --force` if schema changed
3. All previous tasks remain working
4. Debug and retry

---

## Key Differences from Previous Plan

✅ **Every task has UI changes** - Nothing is backend-only
✅ **Immediate visibility** - Every change shows in browser right away
✅ **Tight coupling** - Schema + API + UI all in one task
✅ **Can demo after each task** - Show working feature after every task
✅ **Easy debugging** - Small changes, easy to find issues
