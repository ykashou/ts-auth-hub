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

## Task 3: Admin Menu in Navbar - Full Stack
**What you'll see:** Admins see "User Management" link, regular users don't

**Changes:**
1. **Backend**: Create `requireAdmin` middleware (returns 403 if not admin)
2. **Backend**: Create placeholder endpoint `GET /api/admin/users` (returns empty array for now)
3. **Frontend**: Add "Admin" section in navbar (conditional on role)
4. **Frontend**: Add "User Management" link (routes to /admin/users)
5. **Frontend**: Create empty User Management page showing "Admin Controls"
6. **Test in browser**:
   - Login as admin → see "User Management" in navbar
   - Login as regular user → navbar item hidden
   - Try accessing /admin/users as regular user → redirect to dashboard

**UI Change:** Navbar now has conditional admin section

**Acceptance:** Admin-only navigation visible only to admins

---

## Task 4: View All Users Table - Full Stack
**What you'll see:** Admin can see table of all users with their roles

**Changes:**
1. **Backend**: Implement `GET /api/admin/users` (returns all users)
2. **Frontend**: Build table in User Management page
3. **Frontend**: Show: email/UUID, role badge, created date
4. **Frontend**: Add data-testid attributes
5. **Test in browser**:
   - Login as admin → see table with all users
   - Register new user → appears in table immediately
   - Regular user can't access page (gets redirected)

**Table Columns:**
- User (email or UUID)
- Role (Admin/User badge)
- Created
- Services (count - shows "0" for now)

**Acceptance:** Admin sees live-updating user table

---

## Task 5: Global Services & Admin Service Manager - Full Stack
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

## Task 6: Service Enablement for Users - Full Stack
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

## Task 7: Users See Only Enabled Services - Full Stack
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

## Task 8: Role Management UI - Full Stack
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

## Task 9: Migrate Existing Services to Global Catalog - Full Stack
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

## Task 10: Service Auto-Enablement for New Users - Full Stack
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
