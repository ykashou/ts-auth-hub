# AuthHub - Unified Authentication System

## Overview
AuthHub is a centralized authentication service providing a single source of truth for user credentials and UUIDs across multiple SaaS products. It offers secure user registration, login, and robust API endpoints, streamlining user management. Key capabilities include traditional email/password and anonymous UUID-based authentication, an embeddable widget, and an admin interface for customizing login experiences. The project aims to enhance user management across SaaS ecosystems.

## User Preferences
- Professional, trustworthy aesthetic
- Clean, minimal design without decorative elements
- Card-based architecture for all forms and content
- Centered layouts for authentication flows

## System Architecture
### UI/UX Decisions
AuthHub features a Quest Log-inspired interface with an "Arcane Blue" theme (light mode: HSL 248° 100% 28%; dark mode: HSL 230° 75% 62%). It uses the Poppins font family and a consistent 0.8rem border radius for all components, emphasizing a clean, card-based layout with minimal shadows. A unified navigation system is present across all authenticated pages.

### Technical Implementations & Feature Specifications
1.  **User Authentication**: Supports anonymous UUID4-based authentication with auto-registration and traditional email/password login. All user UUIDs are database-generated using PostgreSQL's `gen_random_uuid()` to ensure RFC 4122 UUID4 compliance. Users can login with existing UUIDs but cannot provide custom UUIDs during registration (security measure to prevent non-compliant or predictable IDs). Uses JWT for session management and bcrypt for password hashing. The first registered user is assigned an "admin" role; subsequent users receive a "user" role. Services are automatically seeded on admin account creation.
2.  **Global Service Management**: All services are global and shared across all users. The system includes 8 default seeded services (including the non-deletable AuthHub service). Admins can perform CRUD operations on services, which include customizable icons and colors, and link to external SaaS products. Each service has a unique, encrypted secret (`sk_*` format) for JWT signing and widget authentication, encrypted using AES-256-GCM. The AuthHub service (UUID: `550e8400-e29b-41d4-a716-446655440000`) is marked with `isSystem: true` and cannot be deleted.
3.  **Admin Dashboard**: Provides an overview of key metrics, service management, quick actions, recent activity logs, and a searchable user directory. Admin-only sections are hidden from regular users.
4.  **User Management (Admin)**: A dedicated admin page (`/admin/users`) allows administrators to manage users, including sorting, filtering, searching, bulk selection, editing, and deleting. Backend protection prevents deletion or demotion of the last admin.
5.  **RBAC Model Management (Admin)**: Admins can create custom RBAC models defining roles and permissions for external services. This includes a card-based grid for management, a detail page with tabs for roles and permissions, and a visualization tab (Permission Matrix, Tree View, JSON, YAML). System automatically seeds 8 service-specific RBAC models on first run: Git-Based Portfolio Platform (Git Garden), Fitness & Wellness Platform (Iron Path), Wealth Management Platform (PurpleGreen), Payment Processing Platform (BTCPay Dashboard), Gamification Platform (Quest Armory), Monitoring Platform (Git Healthz), Academic Knowledge Management (Academia Vault), and Authentication Hub Platform (AuthHub itself). Each model includes realistic roles and granular permissions following resource:action naming conventions. Total: 33 roles, 170 permissions. Admins can assign RBAC models to services.
6.  **Login Page Configuration**: Admins can customize login page experiences via a full-screen CMS-like editor at `/admin/login-editor`. Configurations are standalone named entities that can be attached to multiple services (one-to-many relationship via `services.loginConfigId`). Multiple services can share the same authentication configuration. Features include:
    *   **Full-Screen Split Layout**: CMS-style interface with editor controls on left (384px) and interactive preview on right
    *   **Ad-Hoc Branding Edits**: Title, description, and logo are edited directly on the preview (no separate branding tab)
        - Title and description appear as text but are editable input/textarea fields with transparent borders
        - Borders become visible on hover/focus for intuitive inline editing
        - Logo shows upload/delete buttons on hover
    *   **Authentication Methods Panel**: Single left panel section for method configuration
        - Enable/disable methods with toggle switches
        - Drag-and-drop reordering with visual feedback
        - No tabs - streamlined single-panel interface
    *   **Interactive Live Preview**: Pixel-perfect 100% accurate preview of actual login page with inline editing
        - Direct manipulation of branding elements (click to edit)
        - Auto-refreshes after saves to show persisted changes
        - Non-interactive authentication form elements (pointer-events-none)
    *   **Save/Reset**: Persistent changes with dirty state tracking, auto-save status indicators (Saving.../Saved), and toast notifications
    *   **Standard Navigation**: Navbar retained at top for seamless navigation (prevents users from getting stuck)
    *   **Standalone Configurations**: No service dropdown in editor - configurations are named entities attached to services from the services page
    *   Dynamic rendering of login pages fetches configurations from the database, applying branding, method order, and enabled/disabled states
7.  **Dual Integration Patterns with RBAC**:
    *   **Popup Widget Flow**: JavaScript SDK with popup-based authentication using PostMessage.
    *   **OAuth Redirect Flow with RBAC**: Standard redirect-based authentication. When a `service_id` is provided, AuthHub signs the JWT with the service's secret, including RBAC data (role, permissions, RBAC model). External services can verify tokens locally. A token verification endpoint (`GET /api/services/:serviceId/verify-token`) is available. Admins assign users to roles within specific services.
8.  **API Documentation**: Comprehensive, copy-to-clipboard API documentation for SaaS integration, covering OAuth redirect flow, JWT token structure with RBAC fields, token verification, and permission checking examples.

### System Design Choices
AuthHub uses a client-server architecture. The frontend is built with React, TypeScript, Tailwind CSS, Shadcn UI, Wouter, and TanStack Query. The backend uses Express.js and Node.js. PostgreSQL is the database, managed with Drizzle ORM. Shared types and Zod schemas ensure data consistency.

**Data Models**: Includes `Users`, `API Keys`, `Services`, `Global Services`, `RBAC Models`, `Roles`, `Permissions`, `Role Permissions`, `Service RBAC Models`, `User Service Roles`, `Auth Methods`, `Login Page Config`, and `Service Auth Methods`. All models utilize UUIDs, foreign keys, and CASCADE delete relationships.

## External Dependencies
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication Libraries**: `bcrypt`, `jsonwebtoken` (JWT)
*   **UI Frameworks/Libraries**: React, TypeScript, Tailwind CSS, Shadcn UI, Lucide icons, `@dnd-kit`
*   **Routing**: Wouter
*   **State Management/Data Fetching**: TanStack Query
*   **Validation**: Zod
*   **Backend Framework**: Express.js (Node.js)