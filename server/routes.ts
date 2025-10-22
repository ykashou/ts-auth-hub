import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertApiKeySchema, uuidLoginSchema, insertServiceSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

      if (validatedData.uuid) {
        // UUID provided - try to find it
        user = await storage.getUser(validatedData.uuid);
        
        // If UUID doesn't exist, auto-register it
        if (!user) {
          user = await storage.createUserWithUuid(validatedData.uuid);
        }
      } else {
        // No UUID provided - generate new anonymous user
        user = await storage.createAnonymousUser();
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
      const validatedData = insertServiceSchema.parse(req.body);
      
      // Generate a unique secret for the service (for widget authentication)
      const secret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      const service = await storage.createService({
        ...validatedData,
        secret,
      });
      
      res.status(201).json(service);
    } catch (error: any) {
      console.error("Create service error:", error);
      res.status(400).json({ error: error.message || "Failed to create service" });
    }
  });

  // Get all services (public-safe - excludes secrets)
  app.get("/api/services", verifyToken, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      
      // Exclude secrets from response for security
      const servicesWithoutSecrets = services.map(({ secret, ...service }) => service);
      
      res.json(servicesWithoutSecrets);
    } catch (error: any) {
      console.error("Get services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get all services with secrets (for admin config page)
  app.get("/api/services/admin", verifyToken, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      
      // Include secrets for admin configuration
      res.json(services);
    } catch (error: any) {
      console.error("Get admin services error:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get service by ID
  app.get("/api/services/:id", verifyToken, async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      
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
      const service = await storage.getService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Use partial schema to allow partial updates
      const validatedData = insertServiceSchema.partial().parse(req.body);
      
      // Set default color only if color field is explicitly provided but empty
      if ("color" in validatedData && (!validatedData.color || validatedData.color.trim() === '')) {
        validatedData.color = 'hsl(var(--primary))';
      }
      
      // Preserve the existing secret - it should never be updated via PATCH
      // The secret is auto-generated on creation and should remain stable
      const updateData = {
        ...validatedData,
        secret: service.secret, // Preserve existing secret
      };
      
      const updatedService = await storage.updateService(req.params.id, updateData);
      
      res.json(updatedService);
    } catch (error: any) {
      console.error("Update service error:", error);
      res.status(400).json({ error: error.message || "Failed to update service" });
    }
  });

  // Delete service
  app.delete("/api/services/:id", verifyToken, async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      await storage.deleteService(req.params.id);
      
      res.json({ success: true, message: "Service deleted successfully" });
    } catch (error: any) {
      console.error("Delete service error:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
