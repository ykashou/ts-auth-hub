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

## Task 6: RBAC Model Creation - Full Stack
**What you'll see:** Admin page for creating and listing RBAC models

**Changes:**
1. **Schema**: Create `rbacModels` table (id, name, description, createdBy, createdAt)
2. **Backend**: Create `GET /api/admin/rbac/models` endpoint (returns all RBAC models)
3. **Backend**: Create `POST /api/admin/rbac/models` endpoint (create new RBAC model)
4. **Backend**: Create `GET /api/admin/rbac/models/:id` endpoint (get single model)
5. **Backend**: Create `PATCH /api/admin/rbac/models/:id` endpoint (update model name/description)
6. **Backend**: Create `DELETE /api/admin/rbac/models/:id` endpoint (delete model)
7. **Frontend**: Create RBAC Models page at `/admin/rbac` with model list UI
8. **Frontend**: Add "RBAC Models" link to admin navbar
9. **Frontend**: Display model cards showing name, description, created date
10. **Frontend**: Add "Create Model" button and dialog (name + description fields)
11. **Frontend**: Add edit/delete actions per model card
12. **Frontend**: Show empty state when no models exist
13. **Test in browser**:
    - Login as admin → see "RBAC Models" in navbar
    - Click link → see empty state with "Create Model" button
    - Create model "Enterprise Access Control" → appears as card
    - Create model "Content Management" → appears as second card
    - Edit model name/description → changes persist
    - Delete model → removed from list
    - Regular user can't access page (redirected to dashboard)

**RBAC Model Concept:**
Each RBAC model is a container for a complete access control system. In this task, we only create the container (model definition). Roles and permissions will be added in next task.

**UI Components:**
- Model card grid (similar to service cards)
- Create Model dialog (name + description)
- Edit Model dialog
- Delete confirmation dialog

**UI Location:** New page at /admin/rbac with model card grid

**Acceptance:** Admin can create, view, edit, and delete RBAC model containers

---

## Task 7: RBAC Roles & Permissions - Full Stack
**What you'll see:** Within each RBAC model, admin can add roles and permissions, then assign permissions to roles

**Changes:**
1. **Schema**: Create `rbacRoles` table (id, modelId, name, description, createdAt)
2. **Schema**: Create `rbacPermissions` table (id, modelId, name, description, resource, action, createdAt)
3. **Schema**: Create `rbacRolePermissions` junction table (roleId, permissionId, createdAt)
4. **Backend**: Create `GET /api/admin/rbac/models/:id/roles` endpoint (get all roles for model)
5. **Backend**: Create `POST /api/admin/rbac/models/:id/roles` endpoint (add role to model)
6. **Backend**: Create `DELETE /api/admin/rbac/roles/:roleId` endpoint (delete role)
7. **Backend**: Create `GET /api/admin/rbac/models/:id/permissions` endpoint (get all permissions for model)
8. **Backend**: Create `POST /api/admin/rbac/models/:id/permissions` endpoint (add permission to model)
9. **Backend**: Create `DELETE /api/admin/rbac/permissions/:permissionId` endpoint (delete permission)
10. **Backend**: Create `GET /api/admin/rbac/roles/:roleId/permissions` endpoint (get permissions for role)
11. **Backend**: Create `PATCH /api/admin/rbac/roles/:roleId/permissions` endpoint (assign/revoke permissions)
12. **Frontend**: Add model detail view (click model card to expand/navigate to detail)
13. **Frontend**: Show two sections in detail view: Roles list and Permissions list
14. **Frontend**: Add "Add Role" button and dialog (name + description)
15. **Frontend**: Add "Add Permission" button and dialog (name + description + resource + action)
16. **Frontend**: Add permission matrix UI (roles × permissions grid with checkboxes)
17. **Frontend**: Allow toggling permissions for each role in matrix
18. **Frontend**: Show role/permission counts on model cards
19. **Test in browser**:
    - Click model card → navigate to model detail view
    - Add roles: "Owner", "Manager", "Viewer" → appear in roles list
    - Add permissions: "edit_data", "view_data", "delete_data" → appear in permissions list
    - See permission matrix (3 roles × 3 permissions = 9 checkboxes)
    - Assign permissions: Owner gets all 3, Manager gets edit+view, Viewer gets view only
    - Changes persist on refresh
    - Delete role → removed from matrix
    - Delete permission → removed from matrix

**Permission Matrix Example:**
```
           | edit_data | view_data | delete_data
-----------+-----------+-----------+-------------
Owner      |     ✓     |     ✓     |      ✓
Manager    |     ✓     |     ✓     |      ✗
Viewer     |     ✗     |     ✓     |      ✗
```

**UI Components:**
- Model detail page (replaces card grid when model selected)
- Add Role dialog
- Add Permission dialog
- Role-Permission matrix (interactive checkboxes)
- Role/Permission delete buttons

**UI Location:** Detail view within /admin/rbac page

**Acceptance:** Admin can build complete access control structures within each RBAC model

---

## Task 8: RBAC Visualization - Permission Matrix & Tree View - Full Stack
**What you'll see:** Elegant visual representations of RBAC models with an interactive permission matrix, hierarchical tree view, JSON/YAML export, and seeded default models

**Changes:**
1. **Backend**: Create RBAC model seeding system that auto-generates default models on first admin registration
2. **Backend**: Seed 3 default RBAC models with complete role/permission structures:
   - "Content Management System" (Owner, Editor, Viewer roles with create/read/update/delete permissions)
   - "Analytics Platform" (Admin, Analyst, Viewer roles with dashboard/report/export permissions)
   - "E-Commerce Platform" (Admin, Manager, Staff, Customer roles with product/order/inventory permissions)
3. **Backend**: Create `GET /api/admin/rbac/models/:id/export` endpoint returning model in JSON/YAML format
4. **Frontend**: Add visualization tab to RBAC model detail page (third tab after Roles and Permissions)
5. **Frontend**: Create Permission Matrix component showing roles × permissions grid
6. **Frontend**: Matrix displays checkboxes for each role-permission intersection (read-only visualization)
7. **Frontend**: Add hover tooltips showing permission details and role descriptions
8. **Frontend**: Color-code matrix cells: granted (green), denied (red/gray), inherited (blue)
9. **Frontend**: Add row/column headers with expand/collapse for better readability
10. **Frontend**: Create Hierarchical Tree View component showing RBAC model structure
11. **Frontend**: Tree shows model → roles → assigned permissions in expandable nodes
12. **Frontend**: Display role count and permission count as badges on tree nodes
13. **Frontend**: Add visual indicators for permission inheritance and conflicts
14. **Frontend**: Create JSON View component with syntax highlighting and copy-to-clipboard
15. **Frontend**: Create YAML View component with syntax highlighting and copy-to-clipboard
16. **Frontend**: Implement search/filter functionality to highlight specific roles or permissions
17. **Frontend**: Add export functionality (download matrix as CSV or PNG)
18. **Frontend**: Add view toggle with 4 options: Matrix / Tree / JSON / YAML
19. **Frontend**: Responsive design for both desktop and mobile viewing
20. **Test in browser**:
    - Login as first admin → see 3 default RBAC models already seeded:
      - "Content Management System" (3 roles, 4 permissions)
      - "Analytics Platform" (3 roles, 3 permissions)
      - "E-Commerce Platform" (4 roles, 5 permissions)
    - Click on "Content Management System" → navigate to model detail
    - Click "Visualization" tab → see view toggle (Matrix / Tree / JSON / YAML)
    - **Matrix View**:
      - See permission matrix with all roles as rows and permissions as columns
      - Hover over cells → see tooltips with details
      - See checkmarks (✓) for granted permissions, empty for denied
    - **Tree View**:
      - Toggle to tree view → see hierarchical structure:
        ```
        📋 Content Management System
        ├── 👤 Owner (4 permissions)
        │   ├── ✓ create:content
        │   ├── ✓ read:content
        │   ├── ✓ update:content
        │   └── ✓ delete:content
        ├── 👤 Editor (3 permissions)
        │   ├── ✓ create:content
        │   ├── ✓ read:content
        │   └── ✓ update:content
        └── 👤 Viewer (1 permission)
            └── ✓ read:content
        ```
    - **JSON View**:
      - Toggle to JSON view → see syntax-highlighted JSON structure:
        ```json
        {
          "model": {
            "id": "...",
            "name": "Content Management System",
            "description": "...",
            "roles": [
              {
                "id": "...",
                "name": "Owner",
                "permissions": ["create:content", "read:content", "update:content", "delete:content"]
              }
            ]
          }
        }
        ```
      - Click copy button → JSON copied to clipboard
    - **YAML View**:
      - Toggle to YAML view → see syntax-highlighted YAML structure:
        ```yaml
        model:
          name: Content Management System
          roles:
            - name: Owner
              permissions:
                - create:content
                - read:content
                - update:content
                - delete:content
        ```
      - Click copy button → YAML copied to clipboard
    - Use search bar → type "create" → highlights all roles with create permissions across all views
    - Click export → downloads permission matrix as CSV
    - Works on mobile with horizontal scrolling for large matrices

**Permission Matrix Visual Example:**
```
┌─────────────┬────────────┬────────────┬──────────────┐
│   Role      │ edit_data  │ view_data  │ delete_data  │
├─────────────┼────────────┼────────────┼──────────────┤
│ Owner       │     ✓      │     ✓      │      ✓       │
├─────────────┼────────────┼────────────┼──────────────┤
│ Manager     │     ✓      │     ✓      │      ✗       │
├─────────────┼────────────┼────────────┼──────────────┤
│ Viewer      │     ✗      │     ✓      │      ✗       │
└─────────────┴────────────┴────────────┴──────────────┘
```

**Tree View Visual Example:**
- Collapsible/expandable nodes
- Icons for model (📋), roles (👤), permissions (🔑)
- Count badges showing number of permissions per role
- Indentation showing hierarchy
- Different colors for different permission levels

**JSON View Visual Example:**
```json
{
  "model": {
    "id": "uuid-here",
    "name": "Content Management System",
    "description": "RBAC model for CMS applications",
    "roles": [
      {
        "id": "role-uuid",
        "name": "Owner",
        "description": "Full access to all content operations",
        "permissions": [
          { "id": "perm-uuid", "name": "create:content", "description": "Create new content" },
          { "id": "perm-uuid", "name": "read:content", "description": "View content" },
          { "id": "perm-uuid", "name": "update:content", "description": "Edit existing content" },
          { "id": "perm-uuid", "name": "delete:content", "description": "Delete content" }
        ]
      }
    ]
  }
}
```

**YAML View Visual Example:**
```yaml
model:
  id: uuid-here
  name: Content Management System
  description: RBAC model for CMS applications
  roles:
    - id: role-uuid
      name: Owner
      description: Full access to all content operations
      permissions:
        - id: perm-uuid
          name: create:content
          description: Create new content
        - id: perm-uuid
          name: read:content
          description: View content
        - id: perm-uuid
          name: update:content
          description: Edit existing content
        - id: perm-uuid
          name: delete:content
          description: Delete content
```

**Seeded Default Models:**
1. **Content Management System**:
   - Roles: Owner (4 perms), Editor (3 perms), Viewer (1 perm)
   - Permissions: create:content, read:content, update:content, delete:content
2. **Analytics Platform**:
   - Roles: Admin (3 perms), Analyst (2 perms), Viewer (1 perm)
   - Permissions: view:dashboards, create:reports, export:data
3. **E-Commerce Platform**:
   - Roles: Admin (5 perms), Manager (4 perms), Staff (2 perms), Customer (1 perm)
   - Permissions: manage:products, manage:orders, manage:inventory, view:analytics, view:products

**UI Components:**
- Visualization tab in model detail page
- Permission matrix table with interactive cells
- Tree view with expandable nodes
- JSON view with syntax highlighting and copy button
- YAML view with syntax highlighting and copy button
- View toggle with 4 buttons (Matrix / Tree / JSON / YAML)
- Search/filter bar (works across all views)
- Export button (CSV/PNG for matrix, JSON/YAML download)
- Hover tooltips
- Legend explaining colors and icons

**UI Location:** New "Visualization" tab in /admin/rbac/:id detail page

**Acceptance:** 
- First admin registration auto-seeds 3 complete RBAC models with roles and permissions
- Admin can visualize complete RBAC model structure through 4 different views (Matrix, Tree, JSON, YAML)
- JSON and YAML views provide copy-to-clipboard functionality for easy integration
- All views support search/filter functionality
- Export options work for all view types
- Making it easy to understand, export, and integrate role-permission relationships

---

## Task 9: Service-Model Assignment - Full Stack
**What you'll see:** Admin can assign RBAC models to services, linking access control frameworks to specific services

**Changes:**
1. **Schema**: Create `serviceRbacModels` table (serviceId, modelId, assignedAt)
2. **Backend**: Create `GET /api/admin/services/:serviceId/rbac` endpoint (get assigned model for service)
3. **Backend**: Create `POST /api/admin/services/:serviceId/rbac` endpoint (assign model to service)
4. **Backend**: Create `DELETE /api/admin/services/:serviceId/rbac` endpoint (remove model from service)
5. **Backend**: Create `GET /api/admin/rbac/models/:modelId/services` endpoint (get services using this model)
6. **Frontend**: Add RBAC model selector to service configuration/edit page
7. **Frontend**: Display which model is currently assigned to each service (show model name badge)
8. **Frontend**: In service card/list, show indicator if service has RBAC model assigned
9. **Frontend**: In RBAC model detail page, add "Services Using This Model" section
10. **Frontend**: Show list of services with links to service config
11. **Frontend**: Allow removing model assignment from service config
12. **Test in browser**:
    - Navigate to Services page (user-specific services)
    - Click edit on a service (e.g., "Git Garden")
    - See RBAC model selector dropdown showing all available models
    - Select "Content Management System" model → save
    - Service card now shows "RBAC: Content Management System" badge
    - Edit another service, assign "Analytics Platform" model
    - Navigate to RBAC Models page → click "Content Management System"
    - See "Services Using This Model" section showing "Git Garden"
    - Click service link → navigates to service config
    - Remove model assignment → badge disappears
    - RBAC model detail no longer shows this service

**Service-Model Assignment Example:**
- Service "Git Garden": uses "Content Management System" RBAC model
- Service "Iron Path": uses "Analytics Platform" RBAC model
- Service "PurpleGreen": uses "E-Commerce Platform" RBAC model
- Service "BTCPay Dashboard": no RBAC model assigned yet

**UI Components:**
- RBAC model selector dropdown in service edit dialog
- Model badge on service cards (when model assigned)
- "Services Using This Model" section in RBAC model detail page
- Remove model assignment button in service config

**UI Locations:**
- Service configuration/edit page (user's services at /dashboard or admin view)
- RBAC model detail page (new section showing service usage)

**Acceptance:** Admin can link RBAC models to services, see which services use which models, and manage these assignments

---

## Task 10: User-Role Assignment - Full Stack
**What you'll see:** Admin can assign users to specific roles within services that have RBAC models

**Changes:**
1. **Schema**: Create `userServiceRoles` table (userId, serviceId, roleId, assignedAt)
2. **Backend**: Create `GET /api/admin/users/:userId/service-roles` endpoint (get user's roles across all services)
3. **Backend**: Create `POST /api/admin/users/:userId/services/:serviceId/role` endpoint (assign user to role in service)
4. **Backend**: Create `DELETE /api/admin/users/:userId/services/:serviceId/role` endpoint (remove user role in service)
5. **Backend**: Create `GET /api/admin/services/:serviceId/user-roles` endpoint (get all user-role assignments for a service)
6. **Frontend**: In User Management page, add expandable "Service Roles" section per user row
7. **Frontend**: Show grid of all services with role dropdowns for each service
8. **Frontend**: Dropdown options are roles from that service's assigned RBAC model
9. **Frontend**: If service has no RBAC model, show "No RBAC model assigned" message
10. **Frontend**: Show current role assignment (or "No role" if unassigned)
11. **Frontend**: In service detail/config, add "User Roles" section showing all users and their roles
12. **Test in browser**:
    - Ensure services have RBAC models assigned (from Task 9)
    - Go to User Management page
    - Click to expand a user row
    - See "Service Roles" section with all services listed
    - For "Git Garden" (using Content Management model), dropdown shows: Administrator, Editor, Author, Contributor, Viewer, Moderator
    - For "Iron Path" (using Analytics Platform model), dropdown shows: Admin, Analyst, Data Engineer, Report Builder, Dashboard Viewer, Guest
    - Assign user to "Editor" role in Git Garden → persists
    - Assign same user to "Admin" role in Iron Path → persists
    - User now has different roles in different services
    - Navigate to service config for "Git Garden"
    - See "User Roles" section showing all users with their assigned roles
    - User with "Editor" role is listed

**User-Service-Role Example:**
- User "Alice":
  - Git Garden (uses Content Management System model): Role = "Editor"
  - Iron Path (uses Analytics Platform model): Role = "Admin"
  - PurpleGreen (uses E-Commerce Platform model): Role = "Manager"
  - BTCPay Dashboard (no RBAC model): No role (disabled dropdown)

**UI Components:**
- Expandable "Service Roles" section in User Management table
- Service-role assignment grid with dropdowns
- Role dropdown per service (populated from service's RBAC model)
- "User Roles" section in service detail page
- User-role assignment list/table

**UI Locations:**
- User Management page (expandable row showing user's roles across all services)
- Service configuration/detail page (showing all users and their roles for that service)

**Acceptance:** Admin can assign users to specific roles within services based on the service's RBAC model, enabling granular per-service access control

---

## Task 11: OAuth Flow RBAC Integration - Full Stack
**What you'll see:** External services receive user role and permissions in JWT tokens during OAuth redirect flow, with comprehensive documentation in API Docs and Widget Docs

**Changes:**
1. **Backend**: Create `getUserPermissionsForService(userId, serviceId)` helper that fetches user's role and permissions for a service
2. **Backend**: Update `/login`, `/register`, `/widget-login` OAuth logic to include RBAC data in JWT when `service_id` is present:
   - Add `role` object: `{ id, name, description }`
   - Add `permissions` array: `[{ id, name, description }, ...]`
   - Add `rbacModel` object: `{ id, name, description }`
3. **Backend**: Handle edge cases: no role assigned (empty permissions), no RBAC model (null values)
4. **Backend**: Create `GET /api/services/:serviceId/verify-token` endpoint for external token verification
5. **Frontend**: Update API Docs page (`/api-docs`) with:
   - New token structure documentation
   - Code examples showing how external services decode and use RBAC data
   - Examples of permission checking logic in external applications
   - Updated OAuth redirect flow documentation with RBAC fields
6. **Frontend**: Update Widget Docs page (`/widget-docs`) with:
   - Updated token payload structure showing RBAC fields
   - Code examples for extracting and using role/permissions from widget authentication
   - Examples of client-side permission checks based on widget-provided tokens

**Token Structure:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": { "id": "...", "name": "Editor", "description": "..." },
  "permissions": [
    { "id": "...", "name": "create:content", "description": "..." },
    { "id": "...", "name": "read:content", "description": "..." }
  ],
  "rbacModel": { "id": "...", "name": "Content Management System" }
}
```

**Test:**
- OAuth flow with assigned role → token includes role + permissions
- OAuth flow without role → token has empty permissions array
- OAuth flow without RBAC model → token has null values
- External service can decode token and enforce permissions
- API Docs page shows updated token structure and RBAC usage examples
- Widget Docs page shows updated token structure and RBAC integration examples

**Acceptance:** External services receive complete RBAC context in JWT tokens, enabling local permission enforcement without callbacks to AuthHub. Both API Docs and Widget Docs are updated to reflect the new RBAC integration in token payloads.

---

## Task 12: User-Specific Service Management with Auto-Seeding - Full Stack
**What you'll see:** Each user has their own isolated set of services with CRUD capabilities, and new users automatically receive 7 default services

**Changes:**
1. **Schema**: Services table includes `userId` foreign key for user-specific service isolation
2. **Backend**: Create `seedServices(userId)` function that auto-generates 7 default services for a user
3. **Backend**: Service endpoints filter by `userId` to ensure data isolation:
   - `GET /api/services` returns only current user's services
   - `POST /api/services` creates service for current user
   - `PATCH /api/services/:id` updates only user's own services
   - `DELETE /api/services/:id` deletes only user's own services
4. **Backend**: Auto-invoke `seedServices(userId)` during user registration (both email/password and UUID-based)
5. **Backend**: Service secrets encrypted with AES-256-GCM using ENCRYPTION_KEY/SESSION_SECRET
6. **Backend**: Secrets displayed only once during creation/rotation in `sk_*` format
7. **Frontend**: Dashboard displays user's services in card grid
8. **Frontend**: Users can create, edit, and delete their own services via service configuration page
9. **Frontend**: Service cards show customizable icons, colors, and RBAC model badges (if assigned)
10. **Frontend**: Admin User Management page shows per-user service count via `servicesCount` field
11. **Test in browser**:
   - Register new user → automatically get 7 default services (Git Garden, Iron Path, etc.)
   - Dashboard displays all 7 services in card grid
   - Create new custom service → appears in user's service list
   - Edit service (name, URL, icon, color, RBAC model) → changes persist
   - Delete service → removed from user's service list
   - Login as admin → User Management table shows "7" in Services column for new users
   - Each user's services are isolated (User A cannot see User B's services)

**Default Seeded Services:**
1. Git Garden (version control)
2. Iron Path (issue tracking)
3. PurpleGreen (project management)
4. Xeon Studio (design tools)
5. BTCPay Dashboard (payment processing)
6. Quest Network (team communication)
7. Code Vault (code repository)

**Service Isolation Pattern:**
- Each service belongs to exactly one user (`userId` foreign key)
- All service queries filter by authenticated user's ID
- Admin can see service counts but not service details across all users
- RBAC model assignments work within user's own services
- OAuth flow uses user's own service credentials

**UI Locations:**
- User dashboard: Service card grid (user's own services)
- Service configuration page: CRUD operations for user's services
- Admin User Management page: Service count column per user

**Acceptance:** 
- New users receive 7 default services automatically
- Users can manage (CRUD) their own services independently
- Service data is isolated per user with no cross-user access
- Admin can view service counts per user
- Service secrets are securely encrypted and displayed only once

---

## Task 13-17: Not Applicable to Current Architecture

**Note:** Tasks 13-17 were originally designed for a "global service catalog" architecture where:
- Admins manage a single catalog of global services
- Users are "enabled" for specific services via junction tables
- Service enablement is controlled by admins

**Current Implementation Uses User-Specific Services:**
- Each user owns and manages their own services
- Services are isolated per user (not global)
- New users automatically receive 7 default services via `seedServices()`
- Users have full CRUD control over their own services
- Admin role management is already implemented (Task 5)

**What We Have Instead:**
- ✅ Task 12: User-specific service management with auto-seeding (completed)
- ✅ Task 5: Enhanced user management with role editing (admin promotion/demotion already implemented)
- ✅ Service isolation: Each service has `userId` foreign key
- ✅ Auto-seeding: `seedServices(userId)` called during registration
- ✅ CRUD operations: Users manage their own services via dashboard

**Alternative Architecture Decision:**
The user-specific service model provides better:
1. **Isolation**: Each user's services are completely separate
2. **Flexibility**: Users can customize their own service configurations
3. **Security**: Service secrets are user-specific
4. **RBAC Integration**: Users assign RBAC models to their own services

Tasks 13-17 are superseded by the current user-specific service architecture implemented in Task 12.

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
