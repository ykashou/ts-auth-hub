// Database storage implementation following javascript_database blueprint
import { users, apiKeys, services, rbacModels, type User, type InsertUser, type ApiKey, type InsertApiKey, type Service, type InsertService, type RbacModel, type InsertRbacModel } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAnonymousUser(role?: "admin" | "user"): Promise<User>;
  createUserWithUuid(uuid: string, role?: "admin" | "user"): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAdminCount(): Promise<number>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;

  // Service operations
  createService(service: InsertService & { secret?: string; secretPreview?: string; userId: string }): Promise<Service>;
  getService(id: string, userId: string): Promise<Service | undefined>;
  getServiceById(id: string): Promise<Service | undefined>; // Get service by ID (for JWT signing and verification)
  getAllServicesByUser(userId: string): Promise<Service[]>;
  updateService(id: string, userId: string, service: Partial<Service>): Promise<Service>;
  deleteService(id: string, userId: string): Promise<void>;

  // RBAC Model operations
  createRbacModel(model: InsertRbacModel & { createdBy: string }): Promise<RbacModel>;
  getRbacModel(id: string): Promise<RbacModel | undefined>;
  getAllRbacModels(): Promise<RbacModel[]>;
  updateRbacModel(id: string, updates: Partial<RbacModel>): Promise<RbacModel>;
  deleteRbacModel(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserCount(): Promise<number> {
    const allUsers = await db.select().from(users);
    return allUsers.length;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAdminCount(): Promise<number> {
    const allUsers = await db.select().from(users);
    const adminUsers = allUsers.filter(user => user.role === 'admin');
    return adminUsers.length;
  }

  async createAnonymousUser(role?: "admin" | "user"): Promise<User> {
    // Create anonymous user with auto-generated UUID, no email/password
    const [user] = await db
      .insert(users)
      .values({ role: role || "user" })
      .returning();
    return user;
  }

  async createUserWithUuid(uuid: string, role?: "admin" | "user"): Promise<User> {
    // Create user with specific UUID, no email/password
    const [user] = await db
      .insert(users)
      .values({ id: uuid, role: role || "user" })
      .returning();
    return user;
  }

  // API Key operations
  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    // Generate a secure random API key
    const key = `sk_${randomBytes(32).toString('hex')}`;
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({ ...insertApiKey, key })
      .returning();
    return apiKey;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey || undefined;
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  // Service operations
  async createService(insertService: InsertService & { secret?: string; secretPreview?: string; userId: string }): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  async getService(id: string, userId: string): Promise<Service | undefined> {
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.userId, userId)));
    return service || undefined;
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    // Get service by ID only, without userId filtering
    // Used for widget authentication where the secret itself proves authorization
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getAllServicesByUser(userId: string): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.userId, userId));
  }

  async updateService(id: string, userId: string, updateData: Partial<Service>): Promise<Service> {
    const [service] = await db
      .update(services)
      .set(updateData)
      .where(and(eq(services.id, id), eq(services.userId, userId)))
      .returning();
    return service;
  }

  async deleteService(id: string, userId: string): Promise<void> {
    await db.delete(services).where(and(eq(services.id, id), eq(services.userId, userId)));
  }

  // RBAC Model operations
  async createRbacModel(insertModel: InsertRbacModel & { createdBy: string }): Promise<RbacModel> {
    const [model] = await db
      .insert(rbacModels)
      .values(insertModel)
      .returning();
    return model;
  }

  async getRbacModel(id: string): Promise<RbacModel | undefined> {
    const [model] = await db
      .select()
      .from(rbacModels)
      .where(eq(rbacModels.id, id));
    return model || undefined;
  }

  async getAllRbacModels(): Promise<RbacModel[]> {
    return await db.select().from(rbacModels);
  }

  async updateRbacModel(id: string, updates: Partial<RbacModel>): Promise<RbacModel> {
    const [model] = await db
      .update(rbacModels)
      .set(updates)
      .where(eq(rbacModels.id, id))
      .returning();
    return model;
  }

  async deleteRbacModel(id: string): Promise<void> {
    await db.delete(rbacModels).where(eq(rbacModels.id, id));
  }
}

export const storage = new DatabaseStorage();
