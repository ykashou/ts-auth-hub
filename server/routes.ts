import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertApiKeySchema, uuidLoginSchema, insertServiceSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { seedServices } from "./seed";

// Extend Express Request type to include user from JWT
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
      };
    }
  }
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set for JWT token generation");
}

const JWT_SECRET = process.env.SESSION_SECRET;
const SALT_ROUNDS = 10;

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

// Middleware to verify JWT token
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
      });

      // Auto-seed default services for new user
      try {
        await seedServices(user.id);
      } catch (seedError) {
        console.error("Failed to seed services for new user:", seedError);
        // Continue even if seeding fails - user can create services manually
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Return user info (without password) and token
      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
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
      const validatedData = loginSchema.parse(req.body);

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

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Return user info (without password) and token
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
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
      const validatedData = uuidLoginSchema.parse(req.body);
      let user;
      let isNewUser = false;

      if (validatedData.uuid) {
        // UUID provided - try to find it
        user = await storage.getUser(validatedData.uuid);
        
        // If UUID doesn't exist, auto-register it
        if (!user) {
          user = await storage.createUserWithUuid(validatedData.uuid);
          isNewUser = true;
        }
      } else {
        // No UUID provided - generate new anonymous user
        user = await storage.createAnonymousUser();
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

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email || null },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Return user info (without password) and token
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
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

      if (!service.hashedSecret) {
        return res.status(401).json({ error: "Service has no secret configured" });
      }

      const isValidSecret = await bcrypt.compare(secret, service.hashedSecret);
      if (!isValidSecret) {
        return res.status(401).json({ error: "Invalid service secret" });
      }

      // Now verify the JWT token
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
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
      
      // Generate a unique secret for the service (for widget authentication)
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      // Hash the secret for secure storage
      const hashedSecret = await bcrypt.hash(plaintextSecret, SALT_ROUNDS);
      
      // Create truncated preview for display (e.g., "sk_abc123...def789")
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
      
      // Set redirect URL to service URL if not provided
      const redirectUrl = validatedData.redirectUrl || validatedData.url;
      
      const service = await storage.createService({
        ...validatedData,
        redirectUrl,
        hashedSecret,
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
        hashedSecret: service.hashedSecret, // Preserve existing hashed secret
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
      
      // Hash the new secret
      const hashedSecret = await bcrypt.hash(plaintextSecret, SALT_ROUNDS);
      
      // Create truncated preview for display
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;
      
      // Update the service with the new hashed secret and preview
      await storage.updateService(req.params.id, req.user.id, { hashedSecret, secretPreview });
      
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

      if (!service.hashedSecret) {
        return res.status(401).json({ error: "Service has no secret configured" });
      }

      // Verify the secret using bcrypt (like password verification)
      const isValid = await bcrypt.compare(secret, service.hashedSecret);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid secret" });
      }

      // Return success with service details (exclude hashed secret)
      const { hashedSecret, ...serviceData } = service;
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

  const httpServer = createServer(app);

  return httpServer;
}
