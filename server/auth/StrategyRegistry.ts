import type { AuthStrategy, AuthStrategyMetadata } from "./AuthStrategy";
import { EmailPasswordStrategy } from "./strategies/EmailPasswordStrategy";
import { UuidStrategy } from "./strategies/UuidStrategy";

class StrategyRegistry {
  private strategies = new Map<string, AuthStrategy>();
  
  register(strategy: AuthStrategy): void {
    this.strategies.set(strategy.metadata.id, strategy);
    console.log(`[StrategyRegistry] Registered: ${strategy.metadata.name} (${strategy.metadata.id})`);
  }
  
  get(id: string): AuthStrategy | undefined {
    return this.strategies.get(id);
  }
  
  getAll(): AuthStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  getAllMetadata(): AuthStrategyMetadata[] {
    return this.getAll().map(s => s.metadata);
  }
  
  isImplemented(id: string): boolean {
    return this.strategies.has(id);
  }
  
  getImplementedIds(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// Singleton instance
export const strategyRegistry = new StrategyRegistry();

// Register implemented strategies
strategyRegistry.register(new EmailPasswordStrategy());
strategyRegistry.register(new UuidStrategy());

// Define metadata for placeholder methods (not yet implemented)
// This allows admins to design the login experience before implementation
export const placeholderMethods: AuthStrategyMetadata[] = [
  {
    id: "nostr",
    name: "Nostr",
    description: "Authenticate using your Nostr public key",
    icon: "Zap",
    buttonText: "Login with Nostr",
    buttonVariant: "outline",
    helpText: "Requires Nostr browser extension (Alby or nos2x)",
    category: "alternative",
  },
  {
    id: "bluesky",
    name: "BlueSky",
    description: "Authenticate using BlueSky ATProtocol",
    icon: "Cloud",
    buttonText: "Login with BlueSky",
    buttonVariant: "outline",
    helpText: "Use your BlueSky DID for authentication",
    category: "alternative",
  },
  {
    id: "webauthn",
    name: "WebAuthn",
    description: "Authenticate using biometrics or security keys",
    icon: "Fingerprint",
    buttonText: "Login with WebAuthn",
    buttonVariant: "outline",
    helpText: "Use fingerprint, Face ID, or hardware key",
    category: "standard",
  },
  {
    id: "magic_link",
    name: "Magic Link",
    description: "Passwordless authentication via email",
    icon: "Sparkles",
    buttonText: "Send Magic Link",
    buttonVariant: "outline",
    helpText: "Receive a one-time login link via email",
    category: "standard",
  },
];
