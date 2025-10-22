# AuthHub - Unified Authentication System

## Overview
AuthHub is a centralized authentication service that serves as a single source of truth for user credentials and UUIDs across multiple SaaS products. It provides secure user registration, login, and API endpoints for external applications to authenticate users.

## Project Status
**Current Phase:** Development
**Last Updated:** October 22, 2025

## Recent Changes
- **2025-10-22:** Service Card Configuration System Completed
  - Implemented complete service card management: admin can add, edit, delete service cards via /config page
  - Built services page (/services) displaying configured cards to authenticated users
  - Added 4 default service cards: Git Garden, Iron Path, BTCPay Dashboard, PurpleGreen
  - Created services database table with fields: name, description, url, icon (Lucide), color
  - Implemented full CRUD API endpoints (GET/POST/PATCH/DELETE) with JWT authentication
  - Fixed DELETE endpoint to return JSON instead of 204 No Content (prevents parsing errors)
  - Fixed PATCH endpoint to properly handle partial updates without resetting custom colors
  - Fixed auth guards across all protected pages to use useEffect (prevents React state mutation warnings)
  - Updated navigation to seamlessly link dashboard, config, services, and API docs pages

- **2025-10-22:** UUID Auto-Registration Feature Completed
  - Implemented true anonymous authentication: users can generate UUIDs instantly without email/password
  - Added auto-registration: any UUID can be used to login, auto-creates user if doesn't exist
  - Updated database schema to make email and password nullable for anonymous users
  - Fixed React Query cache invalidation to refresh dashboard after auto-registration
  - Dashboard now properly displays "Anonymous" for users without email
  - All end-to-end tests passing for UUID generation, auto-registration, and search functionality

- **2025-10-22:** Initial implementation
  - Created complete data models (users, API keys)
  - Configured design system with custom color palette (#12008f primary, #c4c4c4 secondary, coral accents)
  - Built all frontend components (login, register, dashboard, API docs)
  - Designed card-based UI with Poppins font and 0.8rem border radius

## Core Features
1. **User Authentication**
   - **Anonymous UUID Authentication**: Instant account creation with "Generate New Account ID" button - no email or password required
   - **UUID Auto-Registration**: Login with any UUID - automatically creates user if UUID doesn't exist
   - **Traditional Email/Password**: Standard registration and login with email and password
   - Dual login methods: UUID-based or email/password
   - Secure password hashing with bcrypt
   - JWT token-based session management

2. **Service Card Configuration**
   - Admin config page (/config) for managing service cards
   - Add, edit, delete service cards with custom icons and colors
   - Default service cards: 
     - Git Garden (git-based portfolio-as-a-service)
     - Iron Path (fitness tracking)
     - BTCPay Dashboard (Bitcoin payment processing)
     - PurpleGreen (wealth management and accounting)
   - Services page (/services) displays cards to authenticated users
   - Lucide icons library integration for consistent iconography
   - Custom colors or automatic primary theme color

3. **Admin Dashboard**
   - View all registered users with UUIDs
   - Search functionality (email or UUID)
   - User statistics and activity metrics
   - Clean, professional table interface

4. **API Documentation**
   - Complete endpoint documentation for SaaS integration
   - Example requests and responses
   - API key authentication for external services
   - Copy-to-clipboard functionality

5. **Visual Design**
   - Quest Log-inspired interface
   - Poppins font family throughout
   - Custom color scheme: Deep blue primary (#12008f), light grey secondary (#c4c4c4)
   - 0.8rem border radius for professional appearance
   - Minimal shadows, clean card-based layouts

## Project Architecture

### Frontend Structure
```
client/src/
├── pages/
│   ├── login.tsx          # Dual authentication (UUID/Email)
│   ├── register.tsx       # User registration with UUID generation
│   ├── dashboard.tsx      # Admin user management
│   ├── config.tsx         # Service card configuration
│   ├── services.tsx       # Service cards display
│   └── api-docs.tsx       # API documentation for SaaS products
├── components/ui/         # Shadcn UI components
└── App.tsx               # Main router
```

### Backend Structure
```
server/
├── routes.ts             # API endpoints
├── storage.ts            # Database abstraction layer
└── db.ts                 # PostgreSQL connection
```

### Shared Types
```
shared/
└── schema.ts             # Drizzle ORM models and Zod schemas
```

## Data Models

### Users Table
- `id` (UUID, primary key, auto-generated or provided)
- `email` (text, unique, nullable - optional for anonymous users)
- `password` (text, hashed, nullable - optional for anonymous users)
- `createdAt` (timestamp, auto-generated)

**Note:** Email and password are nullable to support anonymous UUID-only users.

### API Keys Table
- `id` (UUID, primary key, auto-generated)
- `name` (text, required)
- `key` (text, unique, required)
- `createdAt` (timestamp, auto-generated)

### Services Table
- `id` (UUID, primary key, auto-generated)
- `name` (text, required)
- `description` (text, required)
- `url` (text, required)
- `icon` (text, required) - Lucide icon name
- `color` (text, optional) - Custom hex/hsl color or defaults to primary
- `createdAt` (timestamp, auto-generated)

## API Endpoints

### Authentication (Implemented)
- `POST /api/auth/register` - Register new user with email/password (returns JWT token)
- `POST /api/auth/login` - Login with email/password (returns JWT token)
- `POST /api/auth/uuid-login` - UUID authentication endpoint:
  - **No body or empty body**: Generates new anonymous user with random UUID
  - **Body with UUID**: Login if exists, auto-register if doesn't exist
  - Returns JWT token and user object

### User Management (Implemented)
- `GET /api/users` - List all users (requires authentication)

### Service Management (Implemented)
- `POST /api/services` - Create new service card (requires authentication)
- `GET /api/services` - List all service cards (requires authentication)
- `GET /api/services/:id` - Get single service card (requires authentication)
- `PATCH /api/services/:id` - Update service card with partial data (requires authentication)
- `DELETE /api/services/:id` - Delete service card (requires authentication, returns JSON)

### API Key Management (Planned)
- `POST /api/keys` - Generate new API key
- `GET /api/keys` - List API keys

## Design System

### Colors
- **Primary:** #12008f (248° 100% 28%) - Deep blue for buttons, links, branding
- **Secondary:** #c4c4c4 (0° 0% 77%) - Light grey for borders, inactive states
- **Background:** #f0f0f0 (0° 0% 94%) - Off-white page background
- **Card:** #fcfcfc (0° 0% 99%) - White cards and form containers
- **Text:** #1a1a1a (0° 0% 10%) - Dark text for readability
- **Accent:** hsl(9, 75%, 61%) - Coral for errors and destructive actions

### Typography
- **Font Family:** Poppins (all weights)
- **Heading sizes:** 2rem (H1), 1.5rem (H2), 1.25rem (H3)
- **Body:** 0.875rem (14px)
- **Small:** 0.75rem (12px)

### Components
- **Border Radius:** 0.8rem (12.8px) consistently
- **Spacing:** 4, 6, 8 units for micro, standard, section spacing
- **Shadows:** Minimal (shadow-sm, shadow-md)

## User Preferences
- Professional, trustworthy aesthetic
- Clean, minimal design without decorative elements
- Card-based architecture for all forms and content
- Centered layouts for authentication flows

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** bcrypt (password hashing), JWT (session tokens)
- **Validation:** Zod schemas

## Development Commands
- `npm run dev` - Start development server (frontend + backend)
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Integration Guide for SaaS Products
External SaaS applications can integrate with AuthHub using the API endpoints. All requests require an API key in the `X-API-Key` header. See `/api-docs` page for complete documentation and examples.

## Security Features
- Password hashing with bcrypt
- UUID-based user identification
- JWT token authentication
- API key validation for external services
- Input validation with Zod schemas
- PostgreSQL database for secure data persistence
