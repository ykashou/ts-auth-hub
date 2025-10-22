# AuthHub - Unified Authentication System

## Overview
AuthHub is a centralized authentication service designed to be the single source of truth for user credentials and UUIDs across multiple SaaS products. It provides secure user registration, login, and robust API endpoints for external applications. The project aims to streamline user management, offering both traditional email/password and anonymous UUID-based authentication methods, along with an embeddable widget for seamless integration.

## User Preferences
- Professional, trustworthy aesthetic
- Clean, minimal design without decorative elements
- Card-based architecture for all forms and content
- Centered layouts for authentication flows

## System Architecture

### UI/UX Decisions
AuthHub features a Quest Log-inspired interface with an "Arcane Blue" theme, utilizing a cohesive mystical blue color scheme (light mode: HSL 248° 100% 28%; dark mode: HSL 230° 75% 62%). It employs the Poppins font family and a consistent 0.8rem border radius for all components, emphasizing a clean, card-based layout with minimal shadows. The UI includes a unified navigation system across all authenticated pages.

### Technical Implementations & Feature Specifications
1.  **User Authentication**: Supports anonymous UUID-based authentication with auto-registration, allowing users to instantly generate IDs without email/password, alongside traditional email/password registration and login. Uses JWT for session management and bcrypt for password hashing.
2.  **User-Specific Service Management**: Each user has their own isolated set of service configurations. Services are automatically seeded when a user has 0 services (on registration or login) with 7 default services (Git Garden, Iron Path, PurpleGreen, BTCPay Dashboard, Quest Armory, Git Healthz, Academia Vault). Users can perform CRUD operations on their own services. Cards include customizable icons (Lucide) and colors, linking to external SaaS products. Each service is automatically assigned a unique secret (sk_* format) for widget authentication. **Security Model**: Secrets are stored as bcrypt hashes (like passwords) and displayed only once during creation/rotation with a copy-to-clipboard warning dialog. After the dialog closes, secrets cannot be retrieved. The config UI shows "Configured" or "Not Configured" status instead of actual secrets. Secret rotation generates a new secret and immediately invalidates the old one. **Data Isolation**: Services are filtered by userId - each user only sees and manages their own services.
3.  **Admin Dashboard**: Provides a comprehensive overview with key metrics (Total Users, Authenticated, Anonymous, Recent Registrations), service management, quick actions, recent activity logs, and a searchable user directory.
4.  **Embeddable Widget System**: A JavaScript SDK facilitates seamless authentication integration into external websites using a popup-based flow and secure PostMessage communication, supporting all AuthHub authentication methods. Widget authentication uses the POST /api/services/verify-secret endpoint to validate service secrets without exposing hashed values.
5.  **API Documentation**: Comprehensive, copy-to-clipboard API documentation for SaaS integration, secured by API key authentication.

### System Design Choices
AuthHub follows a client-server architecture. The frontend is built with React, TypeScript, Tailwind CSS, Shadcn UI, Wouter, and TanStack Query. The backend uses Express.js and Node.js. PostgreSQL is the chosen database, managed with Drizzle ORM. Shared types and Zod schemas ensure data consistency and validation across the stack.

**Data Models**:
*   `Users`: `id` (UUID), `email` (nullable), `password` (nullable), `createdAt`. Email and password are nullable to support anonymous users.
*   `API Keys`: `id` (UUID), `name`, `key`, `createdAt`.
*   `Services`: `id` (UUID), `userId` (foreign key to Users, CASCADE delete), `name`, `description`, `url`, `icon` (Lucide), `color` (optional), `hashedSecret` (bcrypt hash of auto-generated sk_* secret for widget authentication, nullable), `secretPreview` (truncated preview like "sk_abc...xyz"), `createdAt`. Each service belongs to a specific user. Secrets are hashed using bcrypt before storage and never stored in plaintext for security.

## External Dependencies
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication Libraries**: bcrypt (for password hashing), JWT (for session tokens)
*   **UI Frameworks/Libraries**: React, TypeScript, Tailwind CSS, Shadcn UI, Lucide icons
*   **Routing**: Wouter
*   **State Management/Data Fetching**: TanStack Query
*   **Validation**: Zod
*   **Backend Framework**: Express.js (Node.js)