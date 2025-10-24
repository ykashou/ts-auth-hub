// Strategy Pattern for Authentication Methods
// Each auth method (email, UUID, Nostr, etc.) implements this interface

export interface AuthStrategyMetadata {
  id: string; // "uuid" | "email" | "nostr" | "bluesky" | "webauthn" | "magic_link"
  name: string; // Display name: "UUID Login", "Email Login", etc.
  description: string; // Description shown to users
  icon: string; // Lucide icon name: "KeyRound", "Mail", "Zap", etc.
  buttonText: string; // Default button text: "Login with UUID"
  buttonVariant: "default" | "outline" | "ghost" | "secondary"; // shadcn button variant
  helpText?: string; // Optional help text shown under button
  category: "standard" | "alternative" | "enterprise"; // Grouping category
}

export interface AuthResult {
  userId: string;
  email: string | null;
  role: "admin" | "user";
  isNewUser: boolean;
}

export interface AuthStrategy {
  // Metadata for UI rendering and configuration
  readonly metadata: AuthStrategyMetadata;
  
  // Validate request data using Zod schema
  validateRequest(data: any): any;
  
  // Authenticate user - returns user info or throws error
  authenticate(credentials: any): Promise<AuthResult>;
}
