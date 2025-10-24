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
1.  **User Authentication**: Supports anonymous UUID-based authentication with auto-registration and traditional email/password login. Uses JWT for session management and bcrypt for password hashing. The first registered user is assigned an "admin" role; subsequent users receive a "user" role.
2.  **User-Specific Service Management**: Each user has an isolated set of service configurations with 7 default seeded services. Users can perform CRUD operations on services, which include customizable icons and colors, and link to external SaaS products. Each service has a unique, encrypted secret (`sk_*` format) for JWT signing and widget authentication, encrypted using AES-256-GCM.
3.  **Admin Dashboard**: Provides an overview of key metrics, service management, quick actions, recent activity logs, and a searchable user directory. Admin-only sections are hidden from regular users.
4.  **User Management (Admin)**: A dedicated admin page (`/admin/users`) allows administrators to manage users, including sorting, filtering, searching, bulk selection, editing, and deleting. Backend protection prevents deletion or demotion of the last admin.
5.  **RBAC Model Management (Admin)**: Admins can create custom RBAC models defining roles and permissions for external services. This includes a card-based grid for management, a detail page with tabs for roles and permissions, and a visualization tab (Permission Matrix, Tree View, JSON, YAML). Initial admin registration seeds three comprehensive RBAC models. Admins can assign RBAC models to services.
6.  **Login Page Configuration**: Admins can customize login page experiences via a comprehensive editor at `/admin/login-editor`. Features include:
    *   **Service Selection**: Choose between default configuration or service-specific login pages
    *   **Branding Tab**: Customize title, description, logo URL, and default authentication method
    *   **Authentication Methods Tab**: Enable/disable methods, drag-and-drop reordering with visual feedback
    *   **Live Preview**: Real-time visualization of login page changes
    *   **Save/Reset**: Persistent changes with dirty state tracking, optimistic updates, and toast notifications
    *   **Standard Navigation**: Consistent navbar across admin interface for seamless navigation
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