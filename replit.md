# AuthHub - Unified Authentication System

## Overview
AuthHub is a centralized authentication service designed to be the single source of truth for user credentials and UUIDs across multiple SaaS products. It provides secure user registration, login, and robust API endpoints for external applications. The project aims to streamline user management, offering both traditional email/password and anonymous UUID-based authentication methods, along with an embeddable widget for seamless integration.

## Recent Progress
- ✅ **Phase 0 Completed: Strategy Pattern Refactor** - Unified authentication architecture with extensible strategy system
  - Created `AuthStrategy` interface defining standard authentication method contract
  - Implemented `EmailPasswordStrategy` and `UuidStrategy` for existing auth methods
  - Built `StrategyRegistry` with 2 implemented + 4 placeholder methods (Nostr, BlueSky, WebAuthn, Magic Links)
  - Created unified `AuthHandler` consolidating all post-auth hooks (service seeding, RBAC seeding, JWT generation)
  - Added `/api/auth/authenticate` unified endpoint replacing method-specific endpoints
  - Added `/api/auth/methods` auto-discovery endpoint returning all 6 methods (2 implemented, 4 placeholders with `implemented: false` flag)
  - Refactored legacy `/api/auth/login` and `/api/auth/uuid-login` to use new auth handler (maintained backward compatibility)
  - E2E tests passed: all 6 methods returned correctly, email + UUID authentication working via unified endpoint
  - **Next Steps**: Phase 1 - Database schema for login page configuration (auth_methods, login_page_config, service_auth_methods tables)
- ✅ **Task 12 Completed: Global Services Foundation** - Created infrastructure for global service catalog that will replace user-specific services
  - Added `globalServices` database table (identical to `services` table but WITHOUT userId field)
  - Implemented complete backend: storage interface, CRUD methods, and admin-only API endpoints
  - Created `/admin/global-services` frontend page with full CRUD UI (create, edit, rotate-secret, delete)
  - All global services use same secret encryption/rotation as user-specific services (AES-256-GCM)
  - Only admins can manage global services via `requireAdmin` middleware on all endpoints
  - Added "Global Services" navigation link in Service Management dropdown
  - E2E Playwright tests passed validating complete create/edit/rotate/delete flow
  - **Next Steps**: Plan migration path for mapping user-specific services to global catalog; define user-service assignment model
- ✅ **Task 11 Completed: OAuth Flow RBAC Integration** - JWT tokens now include role and permission data for seamless external service integration
  - Enhanced `generateAuthToken()` to include RBAC data (rbacRole, permissions, rbacModel) when service_id is provided
  - Created `getUserPermissionsForService()` helper to fetch user's role and permissions for a specific service
  - Updated all auth endpoints (login, register, uuid-login) to support service_id parameter
  - Added GET `/api/services/:serviceId/verify-token` endpoint for external services to verify JWT tokens
  - Comprehensive documentation added to API Docs page with OAuth redirect flow, token structure, and permission checking examples
  - Extended Widget Docs page with RBAC integration examples for both backend (Express.js middleware) and frontend (React hooks)
  - JWT tokens signed with service secret when service_id provided, enabling local token verification by external services
  - Edge cases handled: Users without role assignments receive null RBAC data instead of errors
- ✅ **Task 10 Completed: User-Role Assignment** - Full RBAC implementation allowing admins to assign users to roles within services
  - Added userServiceRoles junction table with unique composite constraint on (userId, serviceId, roleId)
  - Created 5 API endpoints with RBAC model integrity validation and 409 duplicate error handling
  - Built dedicated /admin/role-assignments page with stats, search, filters, and enriched role displays
  - Fixed authentication issues in ServiceRbacBadge and roleQueriesResults queries
  - Added RBAC Model column with badges to Config page services table
  - E2E Playwright tests passed validating complete flow
  - **Future optimizations**: Consider batching service RBAC model fetches; include RBAC dependencies in query keys

## User Preferences
- Professional, trustworthy aesthetic
- Clean, minimal design without decorative elements
- Card-based architecture for all forms and content
- Centered layouts for authentication flows

## System Architecture
### UI/UX Decisions
AuthHub features a Quest Log-inspired interface with an "Arcane Blue" theme, utilizing a cohesive mystical blue color scheme (light mode: HSL 248° 100% 28%; dark mode: HSL 230° 75% 62%). It employs the Poppins font family and a consistent 0.8rem border radius for all components, emphasizing a clean, card-based layout with minimal shadows. The UI includes a unified navigation system across all authenticated pages.

### Technical Implementations & Feature Specifications
1.  **User Authentication**: Supports anonymous UUID-based authentication with auto-registration, and traditional email/password registration and login. Uses JWT for session management and bcrypt for password hashing. The first registered user receives "admin" role; subsequent users receive "user" role.
2.  **User-Specific Service Management**: Each user has an isolated set of service configurations, with 7 default services automatically seeded. Users can perform CRUD operations on their services, which include customizable icons and colors, linking to external SaaS products. Each service is assigned a unique, encrypted secret (`sk_*` format) for JWT signing and widget authentication, displayed only once during creation/rotation. Secrets are encrypted using AES-256-GCM, with keys derived from `SESSION_SECRET` or `ENCRYPTION_KEY`. Services are filtered by `userId` to ensure data isolation.
3.  **Admin Dashboard**: Provides an overview with key metrics, service management, quick actions, recent activity logs, and a searchable user directory. Admin-only sections are hidden from regular users.
4.  **User Management (Admin)**: A dedicated admin page (`/admin/users`) allows administrators to manage users with features like sortable columns, role filtering, search, bulk selection, edit/delete user functionalities, and pagination. Backend protection ensures only admins can access and modify user data, with safeguards like preventing the deletion or demotion of the last admin.
5.  **RBAC Model Management (Admin)**: Admins can create custom RBAC models defining roles and permissions for external services.
    *   **RBAC Models Page**: Card-based grid for creating, editing, and deleting RBAC models.
    *   **RBAC Model Detail Page**: Three-tab interface for managing roles and permissions within a model. Roles can be assigned permissions.
    *   **Visualization Tab**: Provides interactive views (Permission Matrix, Tree View, JSON, YAML) of the RBAC model, with search, filter, and export functionalities.
    *   **Default Seeding**: Initial admin registration seeds 3 comprehensive RBAC models: Content Management System, Analytics Platform, and E-Commerce Platform.
    *   **Service-Model Assignment**: Admins can assign RBAC models to services. Service cards display assigned RBAC model badges, and model detail pages list services using them.
    *   **Database Schema**: Dedicated tables for `rbac_models`, `roles`, `permissions`, `role_permissions` (junction), and `serviceRbacModels` (junction), all with appropriate CASCADE delete constraints. All RBAC endpoints are protected by `requireAdmin` middleware.
6.  **Dual Integration Patterns with RBAC**: AuthHub supports two integration methods for external applications:
    *   **Popup Widget Flow**: A JavaScript SDK with popup-based authentication using PostMessage communication.
    *   **OAuth Redirect Flow with RBAC**: A standard redirect-based authentication where external services pass `redirect_uri` and `service_id`. When `service_id` is provided:
        - AuthHub signs the JWT with the specific service's secret (instead of SESSION_SECRET)
        - JWT token includes RBAC data: user's role, permissions array, and RBAC model information
        - External services can verify tokens locally using their service secret
        - Users without role assignments receive null RBAC fields instead of errors
        - Token verification endpoint (`GET /api/services/:serviceId/verify-token`) available for external services
    *   **User Service Role Assignment**: Admins assign users to roles within specific services via the Role Assignments admin page, enabling granular permission control per external application.
7.  **API Documentation**: Comprehensive, copy-to-clipboard API documentation for SaaS integration, including:
    *   OAuth redirect flow with step-by-step examples
    *   JWT token structure with RBAC fields
    *   Token verification endpoint usage
    *   Permission checking examples for both Express.js backend and React frontend
    *   Setup instructions for RBAC integration

### System Design Choices
AuthHub follows a client-server architecture. The frontend uses React, TypeScript, Tailwind CSS, Shadcn UI, Wouter, and TanStack Query. The backend uses Express.js and Node.js. PostgreSQL is the database, managed with Drizzle ORM. Shared types and Zod schemas ensure data consistency.

**Data Models**: Includes `Users`, `API Keys`, `Services`, `Global Services`, `RBAC Models`, `Roles`, `Permissions`, `Role Permissions`, `Service RBAC Models`, and `User Service Roles`. All models are designed with appropriate UUIDs, foreign keys, and CASCADE delete relationships to maintain data integrity and support the outlined features.

## External Dependencies
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication Libraries**: `bcrypt`, `jsonwebtoken` (JWT)
*   **UI Frameworks/Libraries**: React, TypeScript, Tailwind CSS, Shadcn UI, Lucide icons
*   **Routing**: Wouter
*   **State Management/Data Fetching**: TanStack Query
*   **Validation**: Zod
*   **Backend Framework**: Express.js (Node.js)