import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertApiKeySchema, uuidLoginSchema, insertServiceSchema, type User } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { seedServices } from "./seed";
import { encryptSecret, decryptSecret } from "./crypto";

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

// Helper function to generate JWT with appropriate secret
async function generateAuthToken(userId: string, email: string | null, role: "admin" | "user", serviceId?: string): Promise<string> {
  let signingSecret = JWT_SECRET;
  
  // If serviceId is provided, sign with service's secret instead of SESSION_SECRET
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
  }
  
  return jwt.sign(
    { id: userId, email: email, role: role },
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

  // Login user with email/password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { serviceId, ...credentials } = req.body;
      const validatedData = loginSchema.parse(credentials);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Auto-seed services if user has none (for existing users from before auto-seeding was implemented)
      try {
        const userServices = await storage.getAllServicesByUser(user.id);
        if (userServices.length === 0) {
          await seedServices(user.id);
        }
      } catch (seedError) {
        console.error("Failed to seed services for user on login:", seedError);
        // Continue even if seeding fails
      }

      // Generate JWT token (with service secret if serviceId provided)
      const token = await generateAuthToken(user.id, user.email, user.role, serviceId);

      // Return user info (without password) and token
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  // Login user with UUID (anonymous authentication)
  // If UUID is provided: login if exists, auto-register if not
  // If no UUID provided: generate new UUID and auto-register
  app.post("/api/auth/uuid-login", async (req, res) => {
    try {
      const { serviceId, ...uuidData } = req.body;
      const validatedData = uuidLoginSchema.parse(uuidData);
      let user;
      let isNewUser = false;

      if (validatedData.uuid) {
        // UUID provided - try to find it
        user = await storage.getUser(validatedData.uuid);
        
        // If UUID doesn't exist, auto-register it
        if (!user) {
          // Check if this is the first user - if so, promote to admin
          const userCount = await storage.getUserCount();
          const role = userCount === 0 ? "admin" : "user";
          user = await storage.createUserWithUuid(validatedData.uuid, role);
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

      // Auto-seed services if user has none (for new users or existing users from before auto-seeding)
      try {
        const userServices = await storage.getAllServicesByUser(user.id);
        if (userServices.length === 0) {
          await seedServices(user.id);
        }
      } catch (seedError) {
        console.error("Failed to seed services for user:", seedError);
        // Continue even if seeding fails - user can create services manually
      }

      // Generate JWT token (with service secret if serviceId provided)
      const token = await generateAuthToken(user.id, user.email || null, user.role, serviceId);

      // Return user info (without password) and token
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      console.error("UUID login error:", error);
      res.status(400).json({ error: error.message || "UUID login failed" });
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
      res.json(services);
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

  const httpServer = createServer(app);

  return httpServer;
}
