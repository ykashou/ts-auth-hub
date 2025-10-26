import { strategyRegistry } from "./StrategyRegistry";
import { storage } from "../storage";
import { seedServices, seedAuthHubSystemService } from "../seed";
import jwt from "jsonwebtoken";
import { decryptSecret } from "../crypto";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set for JWT token generation");
}

const JWT_SECRET = process.env.SESSION_SECRET;

export class AuthHandler {
  async authenticate(
    methodId: string,
    credentials: any,
    serviceId?: string
  ): Promise<{ token: string; user: any }> {
    // Get strategy from registry
    const strategy = strategyRegistry.get(methodId);
    if (!strategy) {
      throw new Error(`Unknown authentication method: ${methodId}`);
    }
    
    // Validate request
    const validatedData = strategy.validateRequest(credentials);
    
    // Authenticate using strategy
    const { userId, email, role, isNewUser } = await strategy.authenticate(validatedData);
    
    // Get full user details
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found after authentication");
    
    // Run post-authentication hooks (same for ALL methods - no duplication!)
    await this.runPostAuthHooks(user, isNewUser);
    
    // Generate JWT token (with service secret if provided)
    const token = await this.generateAuthToken(user.id, email, role, serviceId);
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }
  
  private async runPostAuthHooks(user: any, isNewUser: boolean): Promise<void> {
    // Auto-seed services if user has none
    try {
      const userServices = await storage.getAllServicesByUser(user.id);
      if (userServices.length === 0) {
        await seedServices(user.id);
      }
    } catch (seedError) {
      console.error("Failed to seed services for user:", seedError);
      // Continue even if seeding fails
    }
    
    // Create AuthHub system service (once per app, not per user)
    try {
      await seedAuthHubSystemService(user.id);
    } catch (seedError) {
      console.error("Failed to create AuthHub system service:", seedError);
      // Continue even if this fails
    }
    
    // If this is the first admin (during registration), seed default RBAC models
    if (isNewUser && user.role === 'admin') {
      try {
        await storage.seedDefaultRbacModels(user.id);
      } catch (seedError) {
        console.error("Failed to seed default RBAC models:", seedError);
        // Continue even if seeding fails
      }
    }
  }
  
  private async generateAuthToken(userId: string, email: string | null, role: "admin" | "user", serviceId?: string): Promise<string> {
    let signingSecret = JWT_SECRET;
    let payload: any = { id: userId, email: email, role: role };
    
    // If serviceId is provided, sign with service's secret and include RBAC data
    if (serviceId) {
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        throw new Error("Invalid service ID");
      }
      if (!service.secret) {
        throw new Error("Service has no secret configured");
      }
      // Decrypt the service secret to use for JWT signing
      signingSecret = decryptSecret(service.secret);
      
      // Get RBAC permissions for this user-service combination
      const rbacData = await storage.getUserPermissionsForService(userId, serviceId);
      
      // Add RBAC data to payload
      payload.rbacRole = rbacData.role;
      payload.permissions = rbacData.permissions;
      payload.rbacModel = rbacData.rbacModel;
    }
    
    return jwt.sign(
      payload,
      signingSecret,
      { expiresIn: "7d" }
    );
  }
}

export const authHandler = new AuthHandler();
