import type { AuthStrategy, AuthStrategyMetadata, AuthResult } from "../AuthStrategy";
import { loginSchema } from "@shared/schema";
import { storage } from "../../storage";
import bcrypt from "bcrypt";

export class EmailPasswordStrategy implements AuthStrategy {
  readonly metadata: AuthStrategyMetadata = {
    id: "email",
    name: "Email Login",
    description: "Traditional email and password authentication",
    icon: "Mail",
    buttonText: "Login with Email",
    buttonVariant: "outline",
    helpText: "Enter your registered email and password",
    category: "standard",
  };
  
  validateRequest(data: any) {
    return loginSchema.parse(data);
  }
  
  async authenticate(credentials: { email: string; password: string }): Promise<AuthResult> {
    // Find user by email
    const user = await storage.getUserByEmail(credentials.email);
    if (!user || !user.password) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      isNewUser: false,
    };
  }
}
