import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertApiKeySchema, uuidLoginSchema } from "@shared/schema";
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
      if (!user) {
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
  app.post("/api/auth/uuid-login", async (req, res) => {
    try {
      const validatedData = uuidLoginSchema.parse(req.body);

      // Find user by UUID
      const user = await storage.getUser(validatedData.uuid);
      if (!user) {
        return res.status(401).json({ error: "Invalid UUID - user not found" });
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
      if (!user) {
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

  const httpServer = createServer(app);

  return httpServer;
}
