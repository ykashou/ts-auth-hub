// AuthHub Application Service Constants
// The AuthHub application itself is represented as a service

// Proper UUID4 for AuthHub service (fixed constant, not auto-generated)
// This UUID is used as a known reference point for the system's own authentication service
export const AUTHHUB_SERVICE_ID = "550e8400-e29b-41d4-a716-446655440000";

export const AUTHHUB_SERVICE = {
  id: AUTHHUB_SERVICE_ID,
  name: "AuthHub",
  description: "Centralized authentication and user management system",
  url: "http://localhost:5000",
  redirectUrl: null,
  icon: "Shield",
  color: "hsl(248, 100%, 28%)", // Arcane Blue
} as const;
