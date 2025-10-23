# AuthHub - Unified Authentication System

## Overview
AuthHub is a centralized authentication service designed to be the single source of truth for user credentials and UUIDs across multiple SaaS products. It provides secure user registration, login, and robust API endpoints for external applications. The project aims to streamline user management, offering both traditional email/password and anonymous UUID-based authentication methods, along with an embeddable widget for seamless integration.

## Recent Progress
- ✅ Completed Tasks 1-8: User roles, admin dashboard, user management with advanced features, RBAC model creation, roles & permissions CRUD, and comprehensive RBAC visualization (Permission Matrix, Tree View, JSON/YAML export)
- ✅ Fixed syntax highlighting issues by using simple pre/code blocks instead of react-syntax-highlighter
- ✅ Task 9 has been split into two separate tasks:
  - Task 9: Service-Model Assignment (linking RBAC models to services)
  - Task 10: User-Role Assignment (assigning users to roles within services)

## User Preferences
- Professional, trustworthy aesthetic
- Clean, minimal design without decorative elements
- Card-based architecture for all forms and content
- Centered layouts for authentication flows

## System Architecture

### UI/UX Decisions
AuthHub features a Quest Log-inspired interface with an "Arcane Blue" theme, utilizing a cohesive mystical blue color scheme (light mode: HSL 248° 100% 28%; dark mode: HSL 230° 75% 62%). It employs the Poppins font family and a consistent 0.8rem border radius for all components, emphasizing a clean, card-based layout with minimal shadows. The UI includes a unified navigation system across all authenticated pages.

### Technical Implementations & Feature Specifications
1.  **User Authentication**: Supports anonymous UUID-based authentication with auto-registration, allowing users to instantly generate IDs without email/password, alongside traditional email/password registration and login. Uses JWT for session management and bcrypt for password hashing. **Role System**: First registered user automatically receives "admin" role; all subsequent users receive "user" role. Role is encoded in JWT and used for access control.
2.  **User-Specific Service Management**: Each user has their own isolated set of service configurations. Services are automatically seeded when a user has 0 services (on registration or login) with 7 default services (Git Garden, Iron Path, PurpleGreen, BTCPay Dashboard, Quest Armory, Git Healthz, Academia Vault). Users can perform CRUD operations on their own services. Cards include customizable icons (Lucide) and colors, linking to external SaaS products. Each service is automatically assigned a unique secret (sk_* format) for JWT signing and widget authentication. **Security Model**: Secrets are encrypted using AES-256-GCM before storage and displayed only once during creation/rotation with a copy-to-clipboard warning dialog. After the dialog closes, secrets cannot be retrieved. The config UI shows "Configured" or "Not Configured" status instead of actual secrets. Secret rotation generates a new secret and immediately invalidates the old one. Encryption keys are derived from SESSION_SECRET or ENCRYPTION_KEY environment variable. **Data Isolation**: Services are filtered by userId - each user only sees and manages their own services.
3.  **Admin Dashboard**: Provides a comprehensive overview with key metrics (Total Users, Authenticated, Anonymous, Recent Registrations), service management, quick actions, recent activity logs, and a searchable user directory. **Role-Based Access**: Regular users see an empty state with welcome message; admin-only sections (services, config, API docs, widget docs) are hidden from regular users with route protection redirecting to dashboard.
4.  **User Management (Admin)**: Dedicated admin page at `/admin/users` accessible via navbar link (visible to admins only). **Advanced Features**: Sortable columns (UUID, Email, Role, Created, Services) with visual indicators (ArrowUpDown/ArrowUp/ArrowDown icons); role filtering dropdown (All/Admin/User); search functionality (filters by UUID, email, or role); bulk selection limited to current page only with select-all checkbox; per-row action menu (Edit, Delete); Edit User dialog for updating email and role; Delete confirmation dialogs with service cascade warnings; pagination (10/25/50/100 rows per page); bulk actions toolbar (Delete Selected with partial failure handling, Export CSV). **Security**: Backend protected by `requireAdmin` middleware (`PATCH /DELETE /api/admin/users/:id` endpoints); last admin cannot be deleted or demoted; bulk delete shows separate success/error toasts for partial failures; selections clear on filter/search/sort changes to prevent confusion about which users are selected.
5.  **RBAC Model Management (Admin)**: Hierarchical role-based access control system where admins create custom RBAC models (conceptual permission frameworks) that define roles and permissions for external services. **RBAC Models Page** (`/admin/rbac`): Card-based grid displaying all RBAC models with create/edit/delete functionality; each card shows model name, description, creation date, and "Manage" button for accessing detail page. **RBAC Model Detail Page** (`/admin/rbac/:modelId`): Three-tab interface for comprehensive role and permission management. **Roles Tab**: Create, edit, and delete roles within a model; each role card displays name, description, and action buttons (Assign Permissions, Edit, Delete); assign permissions dialog shows checkboxes for all available permissions with pre-selection of currently assigned permissions. **Permissions Tab**: Create, edit, and delete permissions within a model; each permission card displays name and description; permissions can be assigned to multiple roles. **Visualization Tab**: Interactive visualization of RBAC model with 4 view types: (1) Permission Matrix - table showing roles as columns and permissions as rows with check/X icons for assignments; (2) Tree View - hierarchical collapsible structure showing roles with their assigned permissions; (3) JSON View - formatted JSON export; (4) YAML View - formatted YAML export. Includes search/filter functionality and export buttons using fetch + blob download for authenticated exports. Real-time updates via comprehensive cache invalidation strategy: all mutations (role/permission create/update/delete and permission assignments) invalidate role-permission mappings and export caches to ensure instant visualization refresh without page reloads. **Default Seeding**: First admin registration automatically seeds 3 comprehensive RBAC models: (1) Content Management System - 6 roles, 14 permissions; (2) Analytics Platform - 6 roles, 15 permissions; (3) E-Commerce Platform - 7 roles, 23 permissions. Each model demonstrates realistic enterprise permission structures. **Database Schema**: `rbac_models` table (id, name, description, createdBy, createdAt); `roles` table (id, rbacModelId, name, description, createdAt) with CASCADE delete on model deletion; `permissions` table (id, rbacModelId, name, description, createdAt) with CASCADE delete; `role_permissions` junction table (roleId, permissionId) for many-to-many relationships with CASCADE delete on both role and permission deletion. **Security**: All RBAC endpoints protected by `requireAdmin` middleware; regular users cannot access RBAC management pages.
6.  **Dual Integration Patterns**: AuthHub supports two authentication integration methods for external applications:
    *   **Popup Widget Flow**: JavaScript SDK with popup-based authentication and secure PostMessage communication for seamless SPA integration
    *   **OAuth Redirect Flow**: Standard redirect-based authentication pattern (similar to Google/GitHub OAuth) where external services pass both `redirect_uri` AND `service_id` parameters to AuthHub auth pages (/login, /register, /widget-login). **Critical Architecture**: When `service_id` is provided, AuthHub signs the JWT with that **service's secret** instead of its internal SESSION_SECRET. This allows external services to verify tokens locally using `jwt.verify(token, theirServiceSecret)` without calling back to AuthHub. After successful authentication, users are redirected back to the external service with `token` and `user_id` URL parameters. This pattern works on all devices and bypasses popup blocker issues.
7.  **API Documentation**: Comprehensive, copy-to-clipboard API documentation for SaaS integration, secured by API key authentication.

### System Design Choices
AuthHub follows a client-server architecture. The frontend is built with React, TypeScript, Tailwind CSS, Shadcn UI, Wouter, and TanStack Query. The backend uses Express.js and Node.js. PostgreSQL is the chosen database, managed with Drizzle ORM. Shared types and Zod schemas ensure data consistency and validation across the stack.

**Data Models**:
*   `Users`: `id` (UUID), `email` (nullable), `password` (nullable), `role` (admin/user), `createdAt`. Email and password are nullable to support anonymous users.
*   `API Keys`: `id` (UUID), `name`, `key`, `createdAt`.
*   `Services`: `id` (UUID), `userId` (foreign key to Users, CASCADE delete), `name`, `description`, `url`, `redirectUrl` (optional redirect URL after auth), `icon` (Lucide), `color` (optional), `secret` (AES-256-GCM encrypted auto-generated sk_* secret for JWT signing and widget authentication, nullable), `secretPreview` (truncated preview like "sk_abc...xyz"), `createdAt`. Each service belongs to a specific user.
*   `RBAC Models`: `id` (UUID), `name`, `description`, `createdBy` (foreign key to Users, CASCADE delete), `createdAt`. Admin-only permission frameworks.
*   `Roles`: `id` (UUID), `rbacModelId` (foreign key to RBAC Models, CASCADE delete), `name`, `description`, `createdAt`.
*   `Permissions`: `id` (UUID), `rbacModelId` (foreign key to RBAC Models, CASCADE delete), `name`, `description`, `createdAt`.
*   `Role Permissions`: Junction table with `roleId` and `permissionId` (both CASCADE delete).

## External Dependencies
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication Libraries**: bcrypt (for password hashing), JWT (for session tokens)
*   **UI Frameworks/Libraries**: React, TypeScript, Tailwind CSS, Shadcn UI, Lucide icons
*   **Routing**: Wouter
*   **State Management/Data Fetching**: TanStack Query
*   **Validation**: Zod
*   **Backend Framework**: Express.js (Node.js)