# User Management with Service Enablement - Implementation Plan

## Overview
Transform AuthHub from a system where all users have equal access to a role-based system where:
- Admins manage a global service catalog
- Admins control which services each user can access
- First registered user is auto-promoted to admin
- Regular users only see services explicitly enabled for them

## Architecture Changes

### Current State
- Services are user-specific (each user has their own services via `userId` foreign key)
- No role-based access control
- All users see all functionality

### Target State
- Services are global (managed by admins)
- Users have roles: `admin` or `user`
- Junction table `userServices` maps user access to services
- Admins can enable/disable services for any user
- Regular users only see their enabled services

---

## Task Breakdown

### Task 1: Data Model Design & Documentation
**Scope:** Define the complete target schema and migration strategy

**Deliverables:**
- Document new `role` enum (`admin` | `user`) for users table
- Document global services table (remove `userId` foreign key)
- Document `userServices` junction table schema:
  - `userId` (foreign key to users, CASCADE delete)
  - `serviceId` (foreign key to services, CASCADE delete)
  - `enabledAt` timestamp
- Define migration rules:
  - First user by `createdAt` becomes admin
  - All existing user-specific services become global services
  - Create userServices entries for each user's current services
  - Preserve encrypted secrets during migration
- Update replit.md with new architecture

**Dependencies:** None

**Acceptance Criteria:**
- [ ] Clear documentation of all schema changes
- [ ] Migration strategy defined and documented
- [ ] Edge cases identified (duplicate services, orphaned data)

---

### Task 2: Database Schema Implementation
**Scope:** Update shared/schema.ts with new data model

**Deliverables:**
- Add `userRoleEnum` enum type (`admin`, `user`)
- Add `role` field to `users` table (default: `user`)
- Remove `userId` field from `services` table
- Create `userServices` junction table with:
  - Composite primary key or unique constraint on (userId, serviceId)
  - `enabledAt` timestamp
- Update all insert schemas and types
- Update Zod validation schemas

**Dependencies:** Task 1

**Acceptance Criteria:**
- [ ] TypeScript types are correct and compile
- [ ] Zod schemas validate correctly
- [ ] No breaking changes to existing valid data shapes

---

### Task 3: Storage Layer Updates
**Scope:** Extend IStorage interface and DatabaseStorage implementation

**Deliverables:**
- Add role-aware user methods:
  - `getUsersByRole(role: 'admin' | 'user')`
  - `updateUserRole(userId: string, role: 'admin' | 'user')`
  - `getAdminCount()` - for preventing last admin deletion
- Update service methods (remove userId parameters):
  - `getAllServices()` - global catalog
  - `createService(data)` - no userId
  - `updateService(id, data)`
  - `deleteService(id)`
- Add userServices methods:
  - `enableServiceForUser(userId: string, serviceId: string)`
  - `disableServiceForUser(userId: string, serviceId: string)`
  - `getUserServices(userId: string)` - returns Service[]
  - `getServiceUsers(serviceId: string)` - returns User[]
  - `isServiceEnabledForUser(userId: string, serviceId: string)`

**Dependencies:** Task 2

**Acceptance Criteria:**
- [ ] All methods properly typed
- [ ] Database queries use correct JOIN logic for userServices
- [ ] Error handling for missing records

---

### Task 4: Data Migration Script
**Scope:** Create idempotent migration to transform existing data

**Deliverables:**
- Create `server/migrate-to-rbac.ts` script:
  1. Find earliest user by `createdAt`, set role to `admin`
  2. Remove duplicate services (same name/url) keeping one
  3. Remove `userId` from all services (make them global)
  4. For each user, create userServices entries for their original services
  5. Preserve all encrypted secrets and metadata
- Add safety checks:
  - Backup check (warn if no backup exists)
  - Dry-run mode to preview changes
  - Rollback instructions in comments
- Add npm script: `"migrate:rbac": "tsx server/migrate-to-rbac.ts"`

**Dependencies:** Task 3

**Acceptance Criteria:**
- [ ] Script is idempotent (safe to run multiple times)
- [ ] No data loss - all services preserved
- [ ] All encrypted secrets remain intact
- [ ] First user correctly promoted to admin
- [ ] Console output shows migration summary

---

### Task 5: Authentication Routes Update
**Scope:** Add auto-admin promotion and include role in auth responses

**Deliverables:**
- Update `POST /api/auth/register`:
  - After creating user, check if this is the first user (admin count = 0)
  - If yes, promote to admin immediately
  - Include `role` in response payload
- Update `POST /api/auth/login`:
  - Include `role` in response payload
- Update `POST /api/auth/uuid-login`:
  - Check if new UUID user is first user
  - Auto-promote to admin if first
  - Include `role` in response payload
- Update JWT payload to include `role` field
- Remove old service seeding logic (services are now global, not user-specific)

**Dependencies:** Task 4 (migration must run first)

**Acceptance Criteria:**
- [ ] First registered user gets `role: 'admin'`
- [ ] Subsequent users get `role: 'user'`
- [ ] JWT tokens include role claim
- [ ] UUID authentication still takes precedence (no flow changes)
- [ ] Response payloads include role field

---

### Task 6: RBAC Middleware
**Scope:** Create server-side authorization guards

**Deliverables:**
- Create `requireAdmin` middleware in server/routes.ts:
  - Checks `req.user.role === 'admin'`
  - Returns 403 if not admin
  - Works with existing `verifyToken` middleware
- Create `requireAuth` middleware (already exists as `verifyToken`, may need renaming)
- Ensure UUID authentication passes through correctly

**Dependencies:** Task 5

**Acceptance Criteria:**
- [ ] Middleware correctly identifies admin vs user
- [ ] 403 errors return clear messages
- [ ] UUID-based auth works with middleware
- [ ] Middleware can be chained easily

---

### Task 7: Admin API Endpoints
**Scope:** Create protected endpoints for user/service management

**Deliverables:**
- `GET /api/admin/users` - List all users with roles and service counts
- `GET /api/admin/users/:userId/services` - Get services for specific user
- `POST /api/admin/users/:userId/services/:serviceId` - Enable service for user
- `DELETE /api/admin/users/:userId/services/:serviceId` - Disable service for user
- `PATCH /api/admin/users/:userId/role` - Update user role (with last-admin check)
- `GET /api/admin/services` - Get global service catalog (same as existing GET /api/services)
- All endpoints protected with `requireAdmin` middleware
- Last admin protection: prevent role change/deletion if only one admin exists

**Dependencies:** Task 6

**Acceptance Criteria:**
- [ ] All endpoints require admin role
- [ ] Cannot remove admin role from last admin
- [ ] Service enable/disable updates userServices table
- [ ] Proper error messages for unauthorized access
- [ ] All mutations invalidate relevant caches

---

### Task 8: Frontend Data Layer Updates
**Scope:** Update TanStack Query hooks for new endpoints

**Deliverables:**
- Create `client/src/lib/admin-queries.ts`:
  - `useUsers()` - fetches all users
  - `useUserServices(userId)` - fetches services for user
  - `useEnableService(userId, serviceId)` - mutation
  - `useDisableService(userId, serviceId)` - mutation
  - `useUpdateUserRole(userId)` - mutation
- Update `client/src/lib/auth.ts`:
  - Store and retrieve user role from auth response
  - Add `getUserRole()` helper
- Update `client/src/pages/dashboard.tsx`:
  - Fetch only user's enabled services (not all services)
  - For admins: decide if they see all services or only enabled ones
- Add role-based navigation guards:
  - Hide admin links for non-admin users

**Dependencies:** Task 7

**Acceptance Criteria:**
- [ ] All queries properly typed with Service/User types
- [ ] Mutations invalidate correct query keys
- [ ] Loading and error states handled
- [ ] Role is persisted and accessible on frontend
- [ ] Cache invalidation works correctly

---

### Task 9: User Management Page (Admin UI)
**Scope:** Build admin-only user management interface

**Deliverables:**
- Create `client/src/pages/user-management.tsx`:
  - Table showing all users (email/UUID, role, created date)
  - For each user, show list of enabled services
  - Toggle switches to enable/disable services per user
  - Role badge (Admin/User)
  - Cannot change role of last admin (disable the control)
- Add to navbar (admin-only):
  - "User Management" link only visible to admins
- Use data-testid attributes:
  - `table-users`
  - `row-user-{userId}`
  - `badge-role-{userId}`
  - `toggle-service-{userId}-{serviceId}`
  - `button-role-change-{userId}`
- Add route in App.tsx: `/admin/users`

**Dependencies:** Task 8

**Acceptance Criteria:**
- [ ] Page only accessible to admins (redirect others)
- [ ] Shows all users with their current service access
- [ ] Can enable/disable services via toggle
- [ ] Visual feedback during mutations
- [ ] Cannot modify last admin's role
- [ ] All interactive elements have data-testid
- [ ] Mobile responsive layout

---

### Task 10: Dashboard Updates & Final Integration
**Scope:** Update dashboard to respect service enablement and verify entire system

**Deliverables:**
- Update `client/src/pages/dashboard.tsx`:
  - Regular users: fetch and display only enabled services via `GET /api/services/enabled`
  - Admins: fetch all services OR enabled services (make a UX decision)
  - Update service cards to not show "edit/delete" for regular users
  - Admins can still manage global service catalog
- Update metrics if needed (user counts by role, etc.)
- Create `GET /api/services/enabled` endpoint:
  - Returns services from userServices junction for current user
- Manual QA checklist:
  - [ ] First user registration → becomes admin
  - [ ] Second user registration → becomes regular user
  - [ ] Admin can see User Management page
  - [ ] Regular user cannot access User Management
  - [ ] Admin can enable/disable services for users
  - [ ] User sees only enabled services on dashboard
  - [ ] Cannot remove admin role from last admin
  - [ ] UUID login still works (precedence maintained)
  - [ ] Service secrets remain encrypted
  - [ ] Existing services migrated correctly

**Dependencies:** Task 9

**Acceptance Criteria:**
- [ ] Regular users only see enabled services
- [ ] Admins can manage everything
- [ ] No regressions in existing auth flows
- [ ] All manual QA items pass
- [ ] Documentation updated (replit.md)

---

## Migration Checklist

Before running migration script:
- [ ] Backup database
- [ ] Review migration script dry-run output
- [ ] Confirm first user to be promoted to admin
- [ ] Stop all workflows

After migration:
- [ ] Verify admin user exists
- [ ] Verify all services are global
- [ ] Verify userServices entries created
- [ ] Test login/registration flows
- [ ] Test service enablement
- [ ] Run `npm run db:push` to sync schema if needed

---

## Key Design Decisions

1. **Global vs User-Specific Services:** Services become global resources managed by admins
2. **Auto-Admin Promotion:** First user (by registration time) automatically becomes admin
3. **Service Access Model:** Explicit opt-in via userServices junction table
4. **Admin Dashboard Access:** Admins can either see all services or only enabled ones (decide in Task 10)
5. **Last Admin Protection:** System must always have at least one admin user
6. **UUID Auth Precedence:** No changes to auth flow priority (UUID first, then email/password)

---

## Rollback Plan

If migration fails:
1. Restore database from backup
2. Revert schema changes in shared/schema.ts
3. Run `npm run db:push --force` to sync to old schema
4. Review migration errors and fix before retry
