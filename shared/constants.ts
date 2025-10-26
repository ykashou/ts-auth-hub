// AuthHub Application Service Constants
// The AuthHub application itself is represented as a service

export const AUTHHUB_SERVICE_ID = "00000000-0000-0000-0000-000000000001";
export const AUTHHUB_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

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
