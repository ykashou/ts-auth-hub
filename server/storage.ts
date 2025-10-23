// Database storage implementation following javascript_database blueprint
import { users, apiKeys, services, type User, type InsertUser, type ApiKey, type InsertApiKey, type Service, type InsertService } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAnonymousUser(): Promise<User>;
  createUserWithUuid(uuid: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;

  // Service operations
  createService(service: InsertService & { hashedSecret?: string; secretPreview?: string; userId: string }): Promise<Service>;
  getService(id: string, userId: string): Promise<Service | undefined>;
  getServiceById(id: string): Promise<Service | undefined>; // Get service by ID only (for widget verification)
  getAllServicesByUser(userId: string): Promise<Service[]>;
  updateService(id: string, userId: string, service: Partial<Service>): Promise<Service>;
  deleteService(id: string, userId: string): Promise<void>;
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

  async createAnonymousUser(): Promise<User> {
    // Create anonymous user with auto-generated UUID, no email/password
    const [user] = await db
      .insert(users)
      .values({})
      .returning();
    return user;
  }

  async createUserWithUuid(uuid: string): Promise<User> {
    // Create user with specific UUID, no email/password
    const [user] = await db
      .insert(users)
      .values({ id: uuid })
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
  async createService(insertService: InsertService & { hashedSecret?: string; secretPreview?: string; userId: string }): Promise<Service> {
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
      .where(eq(services.id, id))
      .where(eq(services.userId, userId));
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
      .where(eq(services.id, id))
      .where(eq(services.userId, userId))
      .returning();
    return service;
  }

  async deleteService(id: string, userId: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id)).where(eq(services.userId, userId));
  }
}

export const storage = new DatabaseStorage();
