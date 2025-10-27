import type { AuthStrategy, AuthStrategyMetadata, AuthResult } from "../AuthStrategy";
import { uuidLoginSchema } from "@shared/schema";
import { storage } from "../../storage";

export class UuidStrategy implements AuthStrategy {
  readonly metadata: AuthStrategyMetadata = {
    id: "uuid",
    name: "UUID Login",
    description: "Anonymous authentication with auto-generated UUID4",
    icon: "KeyRound",
    buttonText: "Login with UUID",
    buttonVariant: "outline",
    helpText: "Generate a new UUID or login with existing one",
    category: "standard",
  };
  
  validateRequest(data: any) {
    return uuidLoginSchema.parse(data);
  }
  
  async authenticate(credentials: { uuid?: string }): Promise<AuthResult> {
    let user;
    let isNewUser = false;

    if (credentials.uuid) {
      // UUID provided - try to find existing user
      user = await storage.getUser(credentials.uuid);
      
      if (!user) {
        // UUID not found - this is an error, users cannot create their own UUIDs
        throw new Error("User not found. Please generate a new UUID to create an account.");
      }
    } else {
      // No UUID provided - generate new user with database-generated UUID4
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
