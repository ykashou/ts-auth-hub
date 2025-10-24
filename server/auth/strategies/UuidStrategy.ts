import type { AuthStrategy, AuthStrategyMetadata, AuthResult } from "../AuthStrategy";
import { uuidLoginSchema } from "@shared/schema";
import { storage } from "../../storage";

export class UuidStrategy implements AuthStrategy {
  readonly metadata: AuthStrategyMetadata = {
    id: "uuid",
    name: "UUID Login",
    description: "Anonymous authentication using unique identifier",
    icon: "KeyRound",
    buttonText: "Login with UUID",
    buttonVariant: "outline",
    helpText: "Generate or use your existing UUID",
    category: "standard",
  };
  
  validateRequest(data: any) {
    return uuidLoginSchema.parse(data);
  }
  
  async authenticate(credentials: { uuid?: string }): Promise<AuthResult> {
    let user;
    let isNewUser = false;

    if (credentials.uuid) {
      // UUID provided - try to find it
      user = await storage.getUser(credentials.uuid);
      
      // If UUID doesn't exist, auto-register it
      if (!user) {
        // Check if this is the first user - if so, promote to admin
        const userCount = await storage.getUserCount();
        const role = userCount === 0 ? "admin" : "user";
        user = await storage.createUserWithUuid(credentials.uuid, role);
        isNewUser = true;
      }
    } else {
      // No UUID provided - generate new anonymous user
      // Check if this is the first user - if so, promote to admin
      const userCount = await storage.getUserCount();
      const role = userCount === 0 ? "admin" : "user";
      user = await storage.createAnonymousUser(role);
      isNewUser = true;
    }

    return {
      userId: user.id,
      email: user.email || null,
      role: user.role,
      isNewUser,
    };
  }
}
