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
2.  **Service Card Configuration**: An admin page allows for CRUD operations on service cards, which are displayed to authenticated users. Cards include customizable icons (Lucide) and colors, linking to external SaaS products. Each service is automatically assigned a unique secret (sk_* format) for widget authentication, displayed in the config UI with copy-to-clipboard functionality.
3.  **Admin Dashboard**: Provides a comprehensive overview with key metrics (Total Users, Authenticated, Anonymous, Recent Registrations), service management, quick actions, recent activity logs, and a searchable user directory.
4.  **Embeddable Widget System**: A JavaScript SDK facilitates seamless authentication integration into external websites using a popup-based flow and secure PostMessage communication, supporting all AuthHub authentication methods.
5.  **API Documentation**: Comprehensive, copy-to-clipboard API documentation for SaaS integration, secured by API key authentication.

### System Design Choices
AuthHub follows a client-server architecture. The frontend is built with React, TypeScript, Tailwind CSS, Shadcn UI, Wouter, and TanStack Query. The backend uses Express.js and Node.js. PostgreSQL is the chosen database, managed with Drizzle ORM. Shared types and Zod schemas ensure data consistency and validation across the stack.

**Data Models**:
*   `Users`: `id` (UUID), `email` (nullable), `password` (nullable), `createdAt`. Email and password are nullable to support anonymous users.
*   `API Keys`: `id` (UUID), `name`, `key`, `createdAt`.
*   `Services`: `id` (UUID), `name`, `description`, `url`, `icon` (Lucide), `color` (optional), `secret` (auto-generated unique key for widget authentication), `createdAt`.

## External Dependencies
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication Libraries**: bcrypt (for password hashing), JWT (for session tokens)
*   **UI Frameworks/Libraries**: React, TypeScript, Tailwind CSS, Shadcn UI, Lucide icons
*   **Routing**: Wouter
*   **State Management/Data Fetching**: TanStack Query
*   **Validation**: Zod
*   **Backend Framework**: Express.js (Node.js)