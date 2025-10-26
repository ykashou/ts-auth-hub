import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertApiKeySchema, uuidLoginSchema, insertServiceSchema, insertGlobalServiceSchema, insertLoginPageConfigSchema, insertServiceAuthMethodSchema, type User } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { seedServices } from "./seed";
import { encryptSecret, decryptSecret } from "./crypto";
import { authHandler } from "./auth/AuthHandler";
import { strategyRegistry } from "./auth/StrategyRegistry";

// Extend Express Request type to include user from JWT
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
        role: "admin" | "user";
      };
    }
  }
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set for JWT token generation");
}

const JWT_SECRET = process.env.SESSION_SECRET;
const SALT_ROUNDS = 10;

// Helper function to generate JWT with appropriate secret and RBAC data
async function generateAuthToken(userId: string, email: string | null, role: "admin" | "user", serviceId?: string): Promise<string> {
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

// Middleware to verify API key for external SaaS products
const verifyApiKey = async (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: "API key is required" });
  }

  const validKey = await storage.getApiKeyByKey(apiKey as string);
  
  if (!validKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
};

// Middleware to verify JWT token and attach user to request
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "Authentication token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Middleware to require admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

// Helper function to convert object to YAML format (simple implementation)
function convertToYAML(obj: any, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let yaml = '';

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${spaces}- `;
        const itemYaml = convertToYAML(item, indent + 2);
        yaml += itemYaml.substring(indent + 2) + '\n';
      } else {
        yaml += `${spaces}- ${item}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += convertToYAML(value, indent + 2);
      } else if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n`;
        yaml += convertToYAML(value, indent + 2);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    });
  } else {
    yaml = `${obj}`;
  }

  return yaml;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { serviceId, ...userData } = req.body;
      const validatedData = insertUserSchema.parse(userData);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Check if this is the first user - if so, promote to admin
      const userCount = await storage.getUserCount();
      const role = userCount === 0 ? "admin" : "user";

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

      // Create user with appropriate role
      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
        role: role,
      });

      // Auto-seed default services for new user
      try {
        await seedServices(user.id);
      } catch (seedError) {
        console.error("Failed to seed services for new user:", seedError);
        // Continue even if seeding fails - user can create services manually
      }

      // If this is the first admin, seed default RBAC models
      if (role === 'admin') {
        try {
          await storage.seedDefaultRbacModels(user.id);
        } catch (seedError) {
          console.error("Failed to seed default RBAC models:", seedError);
          // Continue even if seeding fails - admin can create models manually
        }
      }

      // Generate JWT token (with service secret if serviceId provided)
      const token = await generateAuthToken(user.id, user.email, user.role, serviceId);

      // Return user info (without password) and token
      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  // Login user with email/password - LEGACY ENDPOINT
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { serviceId, ...credentials } = req.body;
      const result = await authHandler.authenticate("email", credentials, serviceId);
      res.json(result);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(401).json({ error: error.message || "Login failed" });
    }
  });

  // Login user with UUID (anonymous authentication) - LEGACY ENDPOINT
  // If UUID is provided: login if exists, auto-register if not
  // If no UUID provided: generate new UUID and auto-register
  app.post("/api/auth/uuid-login", async (req, res) => {
    try {
      const { serviceId, ...credentials } = req.body;
      const result = await authHandler.authenticate("uuid", credentials, serviceId);
      res.json(result);
    } catch (error: any) {
      console.error("UUID login error:", error);
      res.status(401).json({ error: error.message || "UUID login failed" });
    }
  });

  // ==================== NEW UNIFIED AUTHENTICATION ENDPOINTS ====================
  
  // Get all available authentication methods (auto-discovered from registry + placeholders)
  app.get("/api/auth/methods", async (req, res) => {
    try {
      // Import placeholder methods
      const { placeholderMethods } = await import("./auth/StrategyRegistry");
      
      // Get implemented strategies metadata
      const implementedMethods = strategyRegistry.getAllMetadata();
      
      // Combine implemented + placeholders
      const allMethods = [
        ...implementedMethods.map(m => ({ ...m, implemented: true })),
        ...placeholderMethods.map(m => ({ ...m, implemented: false }))
      ];
      
      res.json(allMethods);
    } catch (error: any) {
      console.error("Get auth methods error:", error);
      res.status(500).json({ error: "Failed to fetch authentication methods" });
    }
  });

  // Unified authentication endpoint (replaces separate /login, /uuid-login, etc.)
  app.post("/api/auth/authenticate", async (req, res) => {
    try {
      const { method, serviceId, ...credentials } = req.body;
      
      if (!method) {
        return res.status(400).json({ error: "Authentication method is required" });
      }
      
      // Authenticate using strategy pattern
      const result = await authHandler.authenticate(method, credentials, serviceId);
      
      res.json(result);
    } catch (error: any) {
      console.error("Authentication error:", error);
      res.status(401).json({ error: error.message || "Authentication failed" });
    }
  });

  // Verify user credentials (for SaaS products)
  app.post("/api/auth/verify", verifyApiKey, async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        return res.json({ valid: false });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      
      if (isValidPassword) {
        res.json({
          valid: true,
          userId: user.id,
          email: user.email,
        });
      } else {
        res.json({ valid: false });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(400).json({ error: error.message || "Verification failed" });
    }
  });

  // Verify JWT token (for external services using redirect flow)
  // External services send the token they received from AuthHub redirect
  // Along with their service ID and secret to authenticate themselves
  app.post("/api/auth/verify-token", async (req, res) => {
    try {
      const { token, serviceId, secret } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      if (!serviceId || !secret) {
        return res.status(400).json({ error: "serviceId and secret are required" });
      }

      // Verify service exists and secret is valid
      const service = await storage.getServiceById(serviceId);
      
      if (!service) {
        return res.status(401).json({ error: "Invalid service" });
      }

      if (!service.secret) {
        return res.status(401).json({ error: "Service has no secret configured" });
      }

      // Decrypt the service secret
      const decryptedSecret = decryptSecret(service.secret);
      
      if (secret !== decryptedSecret) {
        return res.status(401).json({ error: "Invalid service secret" });
      }

      // Now verify the JWT token (should be signed with service secret)
      try {
        const decoded = jwt.verify(token, decryptedSecret) as any;
        
        // Get full user information
        const user = await storage.getUser(decoded.id);
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Return valid: true and user information
        const { password, ...sanitizedUser } = user;
        res.json({
          valid: true,
          user: sanitizedUser
        });
      } catch (jwtError) {
        // Token is invalid or expired
        return res.status(401).json({ error: "Invalid or expired token" });
      }
    } catch (error: any) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: error.message || "Token verification failed" });
    }
  });

  // User Management Routes

  // Get current authenticated user's information
  app.get("/api/me", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't send password hash
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to fetch user information" });
    }
  });

  // Get all users (admin)
  app.get("/api/users", verifyToken, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      
      res.json(sanitizedUsers);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all users (admin only) - dedicated admin endpoint
  app.get("/api/admin/users", verifyToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Get service counts for each user
      const usersWithServiceCounts = await Promise.all(
        users.map(async (user) => {
          const userServices = await storage.getAllServicesByUser(user.id);
          const { password, ...sanitizedUser } = user;
          return {
            ...sanitizedUser,
            servicesCount: userServices.length,
          };
        })
      );
      
      res.json(usersWithServiceCounts);
    } catch (error: any) {
      console.error("Get admin users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, role } = req.body;

      // Get current user
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If changing role from admin to user, check if this is the last admin
      if (user.role === 'admin' && role === 'user') {
        const adminCount = await storage.getAdminCount();
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot demote the last admin" });
        }
      }

      // Prepare updates
      const updates: Partial<User> = {};
      if (email !== undefined) updates.email = email;
      if (role !== undefined) updates.role = role;

      // Update user
      const updatedUser = await storage.updateUser(id, updates);
      const { password, ...sanitizedUser } = updatedUser;

      res.json(sanitizedUser);
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Get user to check if it's an admin
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user is admin, check if this is the last admin
      if (user.role === 'admin') {
        const adminCount = await storage.getAdminCount();
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last admin" });
        }
      }

      // Delete user (CASCADE will delete associated services)
      await storage.deleteUser(id);

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", verifyApiKey, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password from response
      const { password, ...sanitizedUser } = user;
      
      res.json(sanitizedUser);
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // API Key Management Routes

  // Create new API key
  app.post("/api/keys", verifyToken, async (req, res) => {
    try {
      const validatedData = insertApiKeySchema.parse(req.body);
      
      const apiKey = await storage.createApiKey(validatedData);
      
      res.status(201).json(apiKey);
    } catch (error: any) {
      console.error("Create API key error:", error);
      res.status(400).json({ error: error.message || "Failed to create API key" });
    }
  });

  // Get all API keys
  app.get("/api/keys", verifyToken, async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      
      res.json(apiKeys);
    } catch (error: any) {
      console.error("Get API keys error:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  // Service Management Routes

  // Create new service
  app.post("/api/services", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const validatedData = insertServiceSchema.parse(req.body);
      
      // Generate a unique secret for the service (for JWT signing and widget authentication)
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      // Encrypt the secret before storing
      const encryptedSecret = encryptSecret(plaintextSecret);
      
      // Create truncated preview for display (e.g., "sk_abc123...def789")
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
      
      // Set redirect URL to service URL if not provided
      const redirectUrl = validatedData.redirectUrl || validatedData.url;
      
      const service = await storage.createService({
        ...validatedData,
        redirectUrl,
        secret: encryptedSecret, // Store encrypted secret
        secretPreview,
        userId: req.user.id, // Associate service with authenticated user
      });
      
      // Automatically create login page configuration for this service
      await storage.seedLoginPageConfigForService(service.id);
      
      // Return service with plaintext secret (only time it's shown in full)
      res.status(201).json({
        ...service,
        plaintextSecret,
      });
    } catch (error: any) {
      console.error("Create service error:", error);
      res.status(400).json({ error: error.message || "Failed to create service" });
    }
  });

  // Get all services for the authenticated user
  app.get("/api/services", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log("Getting services for user:", req.user.id);
      const services = await storage.getAllServicesByUser(req.user.id);
      console.log("Found services:", services.length);
      
      // Fetch RBAC model for each service
      const servicesWithRbacModels = await Promise.all(
        services.map(async (service) => {
          const rbacModel = await storage.getRbacModelForService(service.id);
          return {
            ...service,
            rbacModel: rbacModel || null,
          };
        })
      );
      
      res.json(servicesWithRbacModels);
    } catch (error: any) {
      console.error("Get services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get all services for admin (includes secrets for display)
  app.get("/api/services/admin", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const services = await storage.getAllServicesByUser(req.user.id);
      res.json(services);
    } catch (error: any) {
      console.error("Get admin services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get service by ID (includes secret for display)
  app.get("/api/services/:id", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const service = await storage.getService(req.params.id, req.user.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(service);
    } catch (error: any) {
      console.error("Get service error:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  // Update service
  app.patch("/api/services/:id", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const service = await storage.getService(req.params.id, req.user.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Use partial schema to allow partial updates
      const validatedData = insertServiceSchema.partial().parse(req.body);
      
      // Set default color only if color field is explicitly provided but empty
      if ("color" in validatedData && (!validatedData.color || validatedData.color.trim() === '')) {
        validatedData.color = 'hsl(var(--primary))';
      }
      
      // Preserve the existing secrets - they should never be updated via PATCH
      // Secrets are auto-generated on creation and should remain stable
      // Use the rotation endpoint to change secrets
      const updateData = {
        ...validatedData,
        secret: service.secret, // Preserve existing secret
        secretPreview: service.secretPreview, // Preserve existing secret preview
      };
      
      const updatedService = await storage.updateService(req.params.id, req.user.id, updateData);
      
      res.json(updatedService);
    } catch (error: any) {
      console.error("Update service error:", error);
      res.status(400).json({ error: error.message || "Failed to update service" });
    }
  });

  // Delete service
  app.delete("/api/services/:id", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const service = await storage.getService(req.params.id, req.user.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      await storage.deleteService(req.params.id, req.user.id);
      
      res.json({ success: true, message: "Service deleted successfully" });
    } catch (error: any) {
      console.error("Delete service error:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  // Rotate service secret (generates new secret)
  app.post("/api/services/:id/rotate-secret", verifyToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const service = await storage.getService(req.params.id, req.user.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Generate a new plaintext secret
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      // Encrypt the secret before storing
      const encryptedSecret = encryptSecret(plaintextSecret);
      
      // Create truncated preview for display
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
      
      // Update the service with the new encrypted secret and preview
      await storage.updateService(req.params.id, req.user.id, { secret: encryptedSecret, secretPreview });
      
      res.json({
        success: true,
        message: "Secret rotated successfully",
        plaintextSecret, // Show the new secret once
      });
    } catch (error: any) {
      console.error("Rotate secret error:", error);
      res.status(500).json({ error: "Failed to rotate secret" });
    }
  });

  // Verify service secret (for widget authentication)
  // Note: This endpoint does NOT require authentication - it's used by external services
  // The service secret itself acts as the authentication
  app.post("/api/services/verify-secret", async (req, res) => {
    try {
      const { serviceId, secret } = req.body;
      
      if (!serviceId || !secret) {
        return res.status(400).json({ error: "serviceId and secret are required" });
      }

      // Look up service by ID only (secret verification doesn't require user context)
      // The secret itself proves authorization to use this service
      const service = await storage.getServiceById(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (!service.secret) {
        return res.status(401).json({ error: "Service has no secret configured" });
      }

      // Decrypt and verify the secret
      const decryptedSecret = decryptSecret(service.secret);
      if (secret !== decryptedSecret) {
        return res.status(401).json({ error: "Invalid secret" });
      }

      // Return success with service details (exclude secret)
      const { secret: _, ...serviceData } = service;
      res.json({
        success: true,
        message: "Secret verified successfully",
        service: serviceData,
      });
    } catch (error: any) {
      console.error("Verify secret error:", error);
      res.status(500).json({ error: "Failed to verify secret" });
    }
  });

  // ==================== Global Services Routes (Admin Only) ====================

  // Create new global service (admin only)
  app.post("/api/admin/global-services", verifyToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertGlobalServiceSchema.parse(req.body);
      
      // Generate a unique secret for the service (for JWT signing and widget authentication)
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      // Encrypt the secret before storing
      const encryptedSecret = encryptSecret(plaintextSecret);
      
      // Create truncated preview for display (e.g., "sk_abc123...def789")
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
      
      // Set redirect URL to service URL if not provided
      const redirectUrl = validatedData.redirectUrl || validatedData.url;
      
      const service = await storage.createGlobalService({
        ...validatedData,
        redirectUrl,
        secret: encryptedSecret, // Store encrypted secret
        secretPreview,
      });
      
      // Return service with plaintext secret (only time it's shown in full)
      res.status(201).json({
        ...service,
        plaintextSecret,
      });
    } catch (error: any) {
      console.error("Create global service error:", error);
      res.status(400).json({ error: error.message || "Failed to create global service" });
    }
  });

  // Get all global services (admin only)
  app.get("/api/admin/global-services", verifyToken, requireAdmin, async (req, res) => {
    try {
      const services = await storage.getAllGlobalServices();
      res.json(services);
    } catch (error: any) {
      console.error("Get global services error:", error);
      res.status(500).json({ error: "Failed to fetch global services" });
    }
  });

  // Get single global service by ID (admin only)
  app.get("/api/admin/global-services/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const service = await storage.getGlobalService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Global service not found" });
      }
      
      res.json(service);
    } catch (error: any) {
      console.error("Get global service error:", error);
      res.status(500).json({ error: "Failed to fetch global service" });
    }
  });

  // Update global service (admin only)
  app.patch("/api/admin/global-services/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const service = await storage.getGlobalService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Global service not found" });
      }

      // Use partial schema to allow partial updates
      const validatedData = insertGlobalServiceSchema.partial().parse(req.body);
      
      // Set default color only if color field is explicitly provided but empty
      if ("color" in validatedData && (!validatedData.color || validatedData.color.trim() === '')) {
        validatedData.color = 'hsl(var(--primary))';
      }
      
      // Preserve the existing secrets - they should never be updated via PATCH
      const updateData = {
        ...validatedData,
        secret: service.secret,
        secretPreview: service.secretPreview,
      };
      
      const updatedService = await storage.updateGlobalService(req.params.id, updateData);
      
      res.json(updatedService);
    } catch (error: any) {
      console.error("Update global service error:", error);
      res.status(400).json({ error: error.message || "Failed to update global service" });
    }
  });

  // Delete global service (admin only)
  app.delete("/api/admin/global-services/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const service = await storage.getGlobalService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Global service not found" });
      }

      await storage.deleteGlobalService(req.params.id);
      
      res.json({ success: true, message: "Global service deleted successfully" });
    } catch (error: any) {
      console.error("Delete global service error:", error);
      res.status(500).json({ error: "Failed to delete global service" });
    }
  });

  // Rotate global service secret (admin only)
  app.post("/api/admin/global-services/:id/rotate-secret", verifyToken, requireAdmin, async (req, res) => {
    try {
      const service = await storage.getGlobalService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Global service not found" });
      }

      // Generate a new plaintext secret
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      // Encrypt the secret before storing
      const encryptedSecret = encryptSecret(plaintextSecret);
      
      // Create truncated preview for display
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
      
      // Update the service with the new encrypted secret and preview
      await storage.updateGlobalService(req.params.id, { secret: encryptedSecret, secretPreview });
      
      res.json({
        success: true,
        message: "Secret rotated successfully",
        plaintextSecret, // Show the new secret once
      });
    } catch (error: any) {
      console.error("Rotate global service secret error:", error);
      res.status(500).json({ error: "Failed to rotate secret" });
    }
  });

  // ==================== Service-RBAC Model Assignment Routes ====================
  
  // Assign RBAC model to a service
  app.post("/api/services/:id/rbac-model", verifyToken, async (req, res) => {
    try {
      const { id: serviceId } = req.params;
      const { rbacModelId } = req.body;

      if (!rbacModelId) {
        return res.status(400).json({ error: "rbacModelId is required" });
      }

      // Verify the service belongs to the user
      const service = await storage.getService(serviceId, req.user!.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Verify the RBAC model exists
      const model = await storage.getRbacModel(rbacModelId);
      if (!model) {
        return res.status(404).json({ error: "RBAC model not found" });
      }

      await storage.assignRbacModelToService(serviceId, rbacModelId);

      res.json({
        success: true,
        message: "RBAC model assigned to service successfully",
      });
    } catch (error: any) {
      console.error("Assign RBAC model to service error:", error);
      res.status(500).json({ error: "Failed to assign RBAC model to service" });
    }
  });

  // Remove RBAC model from a service
  app.delete("/api/services/:id/rbac-model", verifyToken, async (req, res) => {
    try {
      const { id: serviceId } = req.params;

      // Verify the service belongs to the user
      const service = await storage.getService(serviceId, req.user!.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      await storage.removeRbacModelFromService(serviceId);

      res.json({
        success: true,
        message: "RBAC model removed from service successfully",
      });
    } catch (error: any) {
      console.error("Remove RBAC model from service error:", error);
      res.status(500).json({ error: "Failed to remove RBAC model from service" });
    }
  });

  // Get RBAC model for a service
  app.get("/api/services/:id/rbac-model", verifyToken, async (req, res) => {
    try {
      const { id: serviceId } = req.params;

      // Verify the service belongs to the user
      const service = await storage.getService(serviceId, req.user!.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const model = await storage.getRbacModelForService(serviceId);

      res.json(model || null);
    } catch (error: any) {
      console.error("Get RBAC model for service error:", error);
      res.status(500).json({ error: "Failed to fetch RBAC model for service" });
    }
  });

  // Get all services using a specific RBAC model (admin only)
  app.get("/api/admin/rbac/models/:id/services", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id: modelId } = req.params;

      // Verify the RBAC model exists
      const model = await storage.getRbacModel(modelId);
      if (!model) {
        return res.status(404).json({ error: "RBAC model not found" });
      }

      const services = await storage.getServicesForRbacModel(modelId);

      res.json(services);
    } catch (error: any) {
      console.error("Get services for RBAC model error:", error);
      res.status(500).json({ error: "Failed to fetch services for RBAC model" });
    }
  });

  // Verify JWT token for a specific service (for external services)
  // This endpoint allows external services to verify tokens they received via OAuth redirect
  app.get("/api/services/:serviceId/verify-token", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(400).json({ error: "Token is required in Authorization header" });
      }

      // Get the service
      const service = await storage.getServiceById(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (!service.secret) {
        return res.status(500).json({ error: "Service has no secret configured" });
      }

      // Decrypt the service secret
      const decryptedSecret = decryptSecret(service.secret);

      // Verify the JWT token (should be signed with service secret)
      try {
        const decoded = jwt.verify(token, decryptedSecret) as any;
        
        // Return the decoded token payload which includes RBAC data
        res.json({
          valid: true,
          payload: {
            userId: decoded.id,
            email: decoded.email,
            role: decoded.role,
            rbacRole: decoded.rbacRole || null,
            permissions: decoded.permissions || [],
            rbacModel: decoded.rbacModel || null
          }
        });
      } catch (jwtError) {
        // Token is invalid or expired
        return res.status(401).json({ 
          valid: false,
          error: "Invalid or expired token" 
        });
      }
    } catch (error: any) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: error.message || "Token verification failed" });
    }
  });

  // ==================== User-Service-Role Assignment Routes ====================
  
  // Get all user-service-role assignments (admin only)
  app.get("/api/admin/user-service-roles", verifyToken, requireAdmin, async (req, res) => {
    try {
      const assignments = await storage.getAllUserServiceRoles();
      res.json(assignments);
    } catch (error: any) {
      console.error("Get all user service roles error:", error);
      res.status(500).json({ error: "Failed to fetch user service roles" });
    }
  });

  // Assign user to role in a service (admin only)
  app.post("/api/admin/user-service-roles", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { userId, serviceId, roleId } = req.body;

      // Validate required fields
      if (!userId || !serviceId || !roleId) {
        return res.status(400).json({ error: "userId, serviceId, and roleId are required" });
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify service exists
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Verify service has an RBAC model assigned
      const serviceRbacModel = await storage.getRbacModelForService(serviceId);
      if (!serviceRbacModel) {
        return res.status(400).json({ error: "Service does not have an RBAC model assigned. Please assign one first." });
      }

      // Verify role exists and belongs to the service's RBAC model
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      if (role.rbacModelId !== serviceRbacModel.id) {
        return res.status(400).json({ 
          error: "Role does not belong to this service's RBAC model",
          details: `Role belongs to model ${role.rbacModelId} but service uses model ${serviceRbacModel.id}`
        });
      }

      try {
        const assignment = await storage.assignUserToServiceRole(userId, serviceId, roleId);
        res.json(assignment);
      } catch (dbError: any) {
        // Check if this is a unique constraint violation
        if (dbError.code === '23505' || dbError.message?.includes('duplicate') || dbError.message?.includes('unique')) {
          return res.status(409).json({ 
            error: "User is already assigned to this role for this service",
            details: "This assignment already exists"
          });
        }
        throw dbError; // Re-throw if it's not a duplicate error
      }
    } catch (error: any) {
      console.error("Assign user to service role error:", error);
      res.status(500).json({ error: "Failed to assign user to service role" });
    }
  });

  // Remove user from service role (admin only)
  app.delete("/api/admin/user-service-roles/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id: assignmentId } = req.params;

      await storage.removeUserFromServiceRole(assignmentId);

      res.json({
        success: true,
        message: "User role assignment removed successfully",
      });
    } catch (error: any) {
      console.error("Remove user from service role error:", error);
      res.status(500).json({ error: "Failed to remove user role assignment" });
    }
  });

  // Get all role assignments for a user (admin only)
  app.get("/api/admin/users/:id/service-roles", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id: userId } = req.params;

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const assignments = await storage.getUserServiceRoles(userId);

      res.json(assignments);
    } catch (error: any) {
      console.error("Get user service roles error:", error);
      res.status(500).json({ error: "Failed to fetch user service roles" });
    }
  });

  // Get all user role assignments for a service (admin only)
  app.get("/api/admin/services/:id/user-roles", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id: serviceId } = req.params;

      // Verify service exists
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const assignments = await storage.getServiceUserRoles(serviceId);

      res.json(assignments);
    } catch (error: any) {
      console.error("Get service user roles error:", error);
      res.status(500).json({ error: "Failed to fetch service user roles" });
    }
  });

  // ==================== RBAC Model Routes ====================
  
  // Get all RBAC models (admin only)
  app.get("/api/admin/rbac/models", verifyToken, requireAdmin, async (req, res) => {
    try {
      const models = await storage.getAllRbacModels();
      res.json(models);
    } catch (error: any) {
      console.error("Get RBAC models error:", error);
      res.status(500).json({ error: "Failed to fetch RBAC models" });
    }
  });

  // Get single RBAC model (admin only)
  app.get("/api/admin/rbac/models/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getRbacModel(id);
      
      if (!model) {
        return res.status(404).json({ error: "RBAC model not found" });
      }

      res.json(model);
    } catch (error: any) {
      console.error("Get RBAC model error:", error);
      res.status(500).json({ error: "Failed to fetch RBAC model" });
    }
  });

  // Create RBAC model (admin only)
  app.post("/api/admin/rbac/models", verifyToken, requireAdmin, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { name, description } = req.body;

      // Validate input
      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }

      const model = await storage.createRbacModel({
        name,
        description,
        createdBy: userId,
      });

      res.status(201).json(model);
    } catch (error: any) {
      console.error("Create RBAC model error:", error);
      res.status(500).json({ error: "Failed to create RBAC model" });
    }
  });

  // Update RBAC model (admin only)
  app.patch("/api/admin/rbac/models/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if model exists
      const existingModel = await storage.getRbacModel(id);
      if (!existingModel) {
        return res.status(404).json({ error: "RBAC model not found" });
      }

      // Prepare updates
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      const updatedModel = await storage.updateRbacModel(id, updates);
      res.json(updatedModel);
    } catch (error: any) {
      console.error("Update RBAC model error:", error);
      res.status(500).json({ error: "Failed to update RBAC model" });
    }
  });

  // Delete RBAC model (admin only)
  app.delete("/api/admin/rbac/models/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if model exists
      const model = await storage.getRbacModel(id);
      if (!model) {
        return res.status(404).json({ error: "RBAC model not found" });
      }

      await storage.deleteRbacModel(id);
      res.json({ success: true, message: "RBAC model deleted successfully" });
    } catch (error: any) {
      console.error("Delete RBAC model error:", error);
      res.status(500).json({ error: "Failed to delete RBAC model" });
    }
  });

  // Export RBAC model (admin only) - returns JSON or YAML format
  app.get("/api/admin/rbac/models/:id/export", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'json', download } = req.query;

      // Get model
      const model = await storage.getRbacModel(id);
      if (!model) {
        return res.status(404).json({ error: "RBAC model not found" });
      }

      // Get all roles and permissions for this model
      const roles = await storage.getRolesByModel(id);
      const permissions = await storage.getPermissionsByModel(id);

      // Get permission assignments for each role
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const rolePermissions = await storage.getPermissionsForRole(role.id);
          return {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: rolePermissions.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
            })),
          };
        })
      );

      // Build export data structure
      const exportData = {
        model: {
          id: model.id,
          name: model.name,
          description: model.description,
          createdAt: model.createdAt,
        },
        roles: rolesWithPermissions,
        permissions: permissions.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
        })),
      };

      // If download parameter is set, return as downloadable file
      if (download === 'true') {
        if (format === 'yaml') {
          const yamlStr = convertToYAML(exportData);
          res.setHeader('Content-Type', 'application/x-yaml');
          res.setHeader('Content-Disposition', `attachment; filename="${model.name.replace(/\s+/g, '_')}_rbac.yaml"`);
          res.send(yamlStr);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${model.name.replace(/\s+/g, '_')}_rbac.json"`);
          res.json(exportData);
        }
      } else {
        // Otherwise, return as regular JSON for display
        res.json(exportData);
      }
    } catch (error: any) {
      console.error("Export RBAC model error:", error);
      res.status(500).json({ error: "Failed to export RBAC model" });
    }
  });

  // ==================== Role Routes ====================

  // Get all roles for a model (admin only)
  app.get("/api/admin/rbac/models/:modelId/roles", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { modelId } = req.params;
      const roles = await storage.getRolesByModel(modelId);
      res.json(roles);
    } catch (error: any) {
      console.error("Get roles error:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Create role (admin only)
  app.post("/api/admin/rbac/models/:modelId/roles", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { modelId } = req.params;
      const { name, description } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }

      const role = await storage.createRole({
        rbacModelId: modelId,
        name,
        description,
      });

      res.status(201).json(role);
    } catch (error: any) {
      console.error("Create role error:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  // Update role (admin only)
  app.patch("/api/admin/rbac/roles/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const existingRole = await storage.getRole(id);
      if (!existingRole) {
        return res.status(404).json({ error: "Role not found" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      const updatedRole = await storage.updateRole(id, updates);
      res.json(updatedRole);
    } catch (error: any) {
      console.error("Update role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Delete role (admin only)
  app.delete("/api/admin/rbac/roles/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      await storage.deleteRole(id);
      res.json({ success: true, message: "Role deleted successfully" });
    } catch (error: any) {
      console.error("Delete role error:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // ==================== Permission Routes ====================

  // Get all permissions for a model (admin only)
  app.get("/api/admin/rbac/models/:modelId/permissions", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { modelId } = req.params;
      const permissions = await storage.getPermissionsByModel(modelId);
      res.json(permissions);
    } catch (error: any) {
      console.error("Get permissions error:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Create permission (admin only)
  app.post("/api/admin/rbac/models/:modelId/permissions", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { modelId } = req.params;
      const { name, description } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }

      const permission = await storage.createPermission({
        rbacModelId: modelId,
        name,
        description,
      });

      res.status(201).json(permission);
    } catch (error: any) {
      console.error("Create permission error:", error);
      res.status(500).json({ error: "Failed to create permission" });
    }
  });

  // Update permission (admin only)
  app.patch("/api/admin/rbac/permissions/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const existingPermission = await storage.getPermission(id);
      if (!existingPermission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      const updatedPermission = await storage.updatePermission(id, updates);
      res.json(updatedPermission);
    } catch (error: any) {
      console.error("Update permission error:", error);
      res.status(500).json({ error: "Failed to update permission" });
    }
  });

  // Delete permission (admin only)
  app.delete("/api/admin/rbac/permissions/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const permission = await storage.getPermission(id);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      await storage.deletePermission(id);
      res.json({ success: true, message: "Permission deleted successfully" });
    } catch (error: any) {
      console.error("Delete permission error:", error);
      res.status(500).json({ error: "Failed to delete permission" });
    }
  });

  // ==================== Role-Permission Assignment Routes ====================

  // Get all role-permission mappings for a model (admin only)
  app.get("/api/admin/rbac/models/:modelId/role-permission-mappings", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { modelId } = req.params;
      const mappings = await storage.getRolePermissionMappingsForModel(modelId);
      res.json(mappings);
    } catch (error: any) {
      console.error("Get role-permission mappings error:", error);
      res.status(500).json({ error: "Failed to fetch role-permission mappings" });
    }
  });

  // Get permissions for a role (admin only)
  app.get("/api/admin/rbac/roles/:roleId/permissions", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { roleId } = req.params;
      const permissions = await storage.getPermissionsForRole(roleId);
      res.json(permissions);
    } catch (error: any) {
      console.error("Get role permissions error:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  // Set permissions for a role (admin only)
  app.put("/api/admin/rbac/roles/:roleId/permissions", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;

      if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ error: "permissionIds must be an array" });
      }

      await storage.setRolePermissions(roleId, permissionIds);
      res.json({ success: true, message: "Role permissions updated successfully" });
    } catch (error: any) {
      console.error("Set role permissions error:", error);
      res.status(500).json({ error: "Failed to update role permissions" });
    }
  });

  // ==================== LOGIN PAGE CONFIGURATION ROUTES ====================

  // Public endpoint: Get login page configuration for a specific service
  app.get("/api/login-config", async (req, res) => {
    try {
      const { serviceId } = req.query;
      
      if (!serviceId) {
        return res.status(400).json({ error: "serviceId parameter is required" });
      }
      
      const config = await storage.getLoginPageConfigByServiceId(serviceId as string);
      
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      // Get enabled auth methods for this config
      const methods = await storage.getEnabledServiceAuthMethods(config.id);
      
      res.json({ config, methods });
    } catch (error: any) {
      console.error("Get login config error:", error);
      res.status(500).json({ error: "Failed to fetch login configuration" });
    }
  });

  // Admin: Get all login page configurations
  app.get("/api/admin/login-configs", verifyToken, requireAdmin, async (req, res) => {
    try {
      const configs = await storage.getAllLoginPageConfigs();
      res.json(configs);
    } catch (error: any) {
      console.error("Get login configs error:", error);
      res.status(500).json({ error: "Failed to fetch login configurations" });
    }
  });

  // Admin: Get login page configuration by ID
  app.get("/api/admin/login-config/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const config = await storage.getLoginPageConfigById(id);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      // Also fetch associated auth methods (all, including disabled)
      const methods = await storage.getServiceAuthMethods(config.id);
      
      res.json({ config, methods });
    } catch (error: any) {
      console.error("Get login config error:", error);
      res.status(500).json({ error: "Failed to fetch login configuration" });
    }
  });

  // Admin: Create new login page configuration for a service
  app.post("/api/admin/login-config", verifyToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertLoginPageConfigSchema.parse(req.body);
      
      // Check if config already exists for this service
      if (validatedData.serviceId) {
        const existing = await storage.getLoginPageConfigByServiceId(validatedData.serviceId);
        if (existing) {
          return res.status(409).json({ error: "Configuration already exists for this service" });
        }
      }
      
      const newConfig = await storage.createLoginPageConfig({
        ...validatedData,
        updatedBy: (req as any).user.id,
      });
      
      // Auto-create default service auth methods entries
      const allMethods = await storage.getAllAuthMethods();
      const serviceAuthMethodsData = allMethods.map((method, index) => ({
        loginConfigId: newConfig.id,
        authMethodId: method.id,
        enabled: method.implemented,
        showComingSoonBadge: !method.implemented,
        displayOrder: index,
      }));
      
      await storage.createServiceAuthMethods(serviceAuthMethodsData);
      
      res.status(201).json(newConfig);
    } catch (error: any) {
      console.error("Create login config error:", error);
      res.status(400).json({ error: error.message || "Failed to create configuration" });
    }
  });

  // Admin: Update login page configuration
  app.patch("/api/admin/login-config/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertLoginPageConfigSchema.partial().parse(req.body);
      const updated = await storage.updateLoginPageConfig(id, {
        ...validatedData,
        updatedBy: (req as any).user.id,
      });
      res.json(updated);
    } catch (error: any) {
      console.error("Update login config error:", error);
      res.status(400).json({ error: error.message || "Failed to update configuration" });
    }
  });

  // Admin: Delete login page configuration
  app.delete("/api/admin/login-config/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting default config
      const config = await storage.getLoginPageConfigById(id);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      if (!config.serviceId) {
        return res.status(400).json({ error: "Cannot delete default configuration" });
      }
      
      await storage.deleteLoginPageConfig(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete login config error:", error);
      res.status(500).json({ error: "Failed to delete configuration" });
    }
  });

  // Admin: Update service auth method (toggle enabled, change button text, etc.)
  app.patch("/api/admin/service-auth-method/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertServiceAuthMethodSchema.partial().parse(req.body);
      const updated = await storage.updateServiceAuthMethod(id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Update service auth method error:", error);
      res.status(400).json({ error: error.message || "Failed to update auth method" });
    }
  });

  // Admin: Update display order of auth methods (drag-and-drop)
  app.put("/api/admin/service-auth-methods/order", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: "updates must be an array" });
      }
      
      await storage.updateServiceAuthMethodsOrder(updates);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Update auth methods order error:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
