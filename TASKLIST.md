# User Management with Service Enablement - Iterative Implementation Plan

## Approach: Vertical Slices
Each task implements a complete feature from database → backend → frontend → visible in UI.
You can stop at any task and have a working (though incomplete) system.

---

## Task 1: Add Role Field and Display in UI
**Goal:** Users have roles, and you can see them in the UI

**Backend:**
- Add `role` enum to shared/schema.ts: `pgEnum("user_role", ["admin", "user"])`
- Add `role` field to users table with default `"user"`
- Update insertUserSchema to include role
- Run `npm run db:push` to apply schema
- Update auth endpoints to return `role` in response payload
- Update JWT token payload to include `role`

**Frontend:**
- Update auth response types to include `role`
- Store role in localStorage alongside token
- Add role badge to dashboard header showing current user's role
- Add `getUserRole()` helper in client/src/lib/auth.ts

**Test:**
- Register new user → see "User" badge in dashboard
- Manually update a user's role to "admin" in database → see "Admin" badge

**Deliverable:** Role badge visible in dashboard for all users

---

## Task 2: Auto-Promote First User to Admin
**Goal:** First registered user automatically becomes admin

**Backend:**
- In `POST /api/auth/register`: check if user count = 0 before creating user
- If first user, set `role: "admin"` instead of default "user"
- In `POST /api/auth/uuid-login`: same logic for UUID users

**Frontend:**
- Show success toast when promoted to admin
- Badge automatically updates to "Admin"

**Test:**
- Delete all users from database
- Register new user → should see "Admin" badge
- Register second user → should see "User" badge
- UUID login as first user → should see "Admin" badge

**Deliverable:** First user gets admin role automatically, visible immediately in UI

---

## Task 3: Admin-Only Navigation Guard
**Goal:** Hide admin features from regular users

**Backend:**
- Create `requireAdmin` middleware in server/routes.ts
- Returns 403 if `req.user.role !== 'admin'`

**Frontend:**
- Update navbar to conditionally show "Admin" section
- Only show to users with `role === 'admin'`
- Add placeholder "User Management" link (goes nowhere yet)

**Test:**
- Login as admin → see "User Management" link in navbar
- Login as regular user → link is hidden
- Try to manually navigate to /admin/users as regular user → redirect to dashboard

**Deliverable:** Admin-only links visible only to admins

---

## Task 4: Admin User Directory (Read-Only)
**Goal:** Admins can see list of all users

**Backend:**
- Create `GET /api/admin/users` endpoint
- Protected with `requireAdmin` middleware
- Returns all users with id, email, role, createdAt

**Frontend:**
- Create `client/src/pages/user-management.tsx`
- Table showing all users with their roles
- Add route in App.tsx: `/admin/users`
- Use data-testid: `table-users`, `row-user-{userId}`, `badge-role-{userId}`

**Test:**
- Login as admin → navigate to /admin/users → see table of all users
- Login as regular user → try to access /admin/users → get 403 error
- Register new users → they appear in the table immediately

**Deliverable:** Admin can view all users in a table (no editing yet)

---

## Task 5: Create Global Services Table
**Goal:** Services are global, not user-specific

**Backend:**
- Create NEW table `global_services` in schema (don't modify existing services yet)
- Schema: id, name, description, url, redirectUrl, icon, color, secret, secretPreview, createdAt
- Create `GET /api/admin/global-services` endpoint (admin-only)
- Create `POST /api/admin/global-services` endpoint (admin-only)
- Seed 7 default global services when first admin registers

**Frontend:**
- Create simple admin page at `/admin/services` showing global services
- List view only (no create UI yet)
- Add link in admin navbar

**Test:**
- Login as admin → see 7 seeded global services
- Regular users can't access /admin/services

**Deliverable:** Global services table exists and is visible to admins

---

## Task 6: User-Service Assignments (Backend + Basic UI)
**Goal:** Track which users have access to which services

**Backend:**
- Create `userServices` junction table: userId, serviceId, enabledAt
- Create endpoints:
  - `GET /api/admin/users/:userId/services` - list enabled services for user
  - `POST /api/admin/users/:userId/services/:serviceId` - enable service
  - `DELETE /api/admin/users/:userId/services/:serviceId` - disable service
- All protected with `requireAdmin`

**Frontend:**
- In User Management table, add column showing count of enabled services
- Click count → expand row to show which services are enabled
- Simple list view only (no toggles yet)

**Test:**
- Manually enable services for users via API
- See enabled service count update in User Management table
- Expand row → see list of enabled services

**Deliverable:** Can track and view service assignments per user

---

## Task 7: Service Toggle UI (Full Admin Controls)
**Goal:** Admins can enable/disable services for users with toggle switches

**Frontend:**
- In User Management page, add toggle switches for each global service
- When toggled ON → call `POST /api/admin/users/:userId/services/:serviceId`
- When toggled OFF → call `DELETE /api/admin/users/:userId/services/:serviceId`
- Show loading state during toggle
- Optimistic UI updates
- data-testid: `toggle-service-{userId}-{serviceId}`

**Backend:**
- No changes needed (endpoints exist from Task 6)

**Test:**
- Login as admin → go to User Management
- Toggle service ON for user → see it reflect immediately
- Toggle service OFF → see it update
- Refresh page → toggles persist correctly

**Deliverable:** Admins can enable/disable services for any user via UI

---

## Task 8: User Dashboard Shows Only Enabled Services
**Goal:** Regular users only see services enabled for them

**Backend:**
- Create `GET /api/services/enabled` endpoint
- Returns services from userServices junction for authenticated user
- Admins: return all global services (or also filter by userServices - decide)

**Frontend:**
- Update dashboard.tsx to fetch from `/api/services/enabled` instead of `/api/services`
- Show message if user has 0 enabled services
- Admins see all services (or only enabled - UX decision)

**Test:**
- Login as regular user with 2 enabled services → see only those 2
- Admin enables another service → user refreshes → sees 3 services
- Login as admin → sees all services (or enabled services)
- Login as user with 0 enabled services → see empty state message

**Deliverable:** Users see only services enabled for them

---

## Task 9: Prevent Removing Last Admin
**Goal:** System always has at least one admin

**Backend:**
- Create `GET /api/admin/count` endpoint → returns admin count
- Update `PATCH /api/admin/users/:userId/role` endpoint (create if doesn't exist)
- Before changing admin → user, check if admin count = 1
- Return 400 error: "Cannot remove last admin"

**Frontend:**
- Add role change button in User Management table
- Fetch admin count before allowing role change
- If user is last admin, disable the button with tooltip: "Cannot remove last admin"
- data-testid: `button-role-change-{userId}`

**Test:**
- With only 1 admin → button is disabled
- Create second admin → first admin's button becomes enabled
- Try to demote second admin → works fine
- Try to demote last admin via API → get 400 error

**Deliverable:** Cannot remove admin role from last admin

---

## Task 10: Cleanup and Migration from Old Services
**Goal:** Migrate existing user-specific services to new system

**Backend:**
- Create `server/migrate-to-global-services.ts` script:
  1. Get all distinct services from old `services` table
  2. Create global_services entries (deduplicate by name+url)
  3. For each user's old services, create userServices assignments
  4. Preserve encrypted secrets
- Add npm script: `"migrate:services": "tsx server/migrate-to-global-services.ts"`

**Frontend:**
- Remove references to old user-specific services
- Update all service queries to use global services + userServices
- Remove old service creation/edit UI from dashboard (admins manage globally now)

**Migration Steps:**
1. Backup database
2. Run `npm run migrate:services`
3. Verify users can still access their services
4. Drop old `services` table after verification
5. Rename `global_services` to `services`

**Test:**
- Run migration with test data
- All users retain access to their original services
- No data loss
- Encrypted secrets still work

**Deliverable:** Complete migration from user-specific to global services with user-level enablement

---

## Testing Checklist (After Each Task)

After completing each task, verify:
- [ ] Backend changes applied (`npm run db:push` if schema changed)
- [ ] Frontend compiles without TypeScript errors
- [ ] Workflow restarts successfully
- [ ] Manual testing passes for that task's deliverable
- [ ] No console errors in browser
- [ ] Previous tasks still work (no regression)

---

## Rollback Strategy

Each task is independent. If a task fails:
1. Revert the code changes for that task only
2. Run `npm run db:push --force` if schema changed
3. Previous tasks remain functional
4. Fix the issue and retry

---

## Key Benefits of This Approach

1. **See progress immediately** - Each task shows something in the UI
2. **Test as you go** - Catch issues early
3. **Safe to stop** - Can pause at any task
4. **Easy debugging** - Small changes = easy to find issues
5. **No big bang** - No "build backend for weeks then build frontend"
