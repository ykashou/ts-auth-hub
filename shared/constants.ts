// AuthHub Application Service Constants
// The AuthHub application itself is represented as a service

// Proper UUID4 for AuthHub service (fixed constant, not auto-generated)
// This UUID is used as a known reference point for the system's own authentication service
export const AUTHHUB_SERVICE_ID = "550e8400-e29b-41d4-a716-446655440000";

// System user UUID that owns the AuthHub service
// Auto-generated UUID format for system operations
export const AUTHHUB_SYSTEM_USER_ID = "550e8400-e29b-41d4-a716-446655440001";

export const AUTHHUB_SERVICE = {
  id: AUTHHUB_SERVICE_ID,
  name: "AuthHub",
  description: "Centralized authentication and user management system",
  url: "http://localhost:5000",
  redirectUrl: null,
  icon: "Shield",
  color: "hsl(248, 100%, 28%)", // Arcane Blue
  userId: AUTHHUB_SYSTEM_USER_ID, // System user owns AuthHub service
} as const;

// Default Global Services - Admin-managed service catalog
export const DEFAULT_GLOBAL_SERVICES = [
  {
    id: "550e8400-e29b-41d4-a716-446655440100",
    name: "Git Garden",
    description: "Collaborative Git repository management and code review platform",
    url: "https://ts-git-garden.replit.app",
    redirectUrl: null,
    icon: "GitBranch",
    color: "hsl(142, 71%, 45%)", // Git green
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440101",
    name: "Quest Armory",
    description: "Gamified task management and project tracking system",
    url: "https://ts-quest-armory.replit.app",
    redirectUrl: null,
    icon: "Sword",
    color: "hsl(24, 100%, 50%)", // Quest orange
  },
] as const;
