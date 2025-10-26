import { db } from "./db";
import { services } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { encryptSecret } from "./crypto";
import { storage } from "./storage";

interface DefaultService {
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
}

const DEFAULT_SERVICES: DefaultService[] = [
  {
    name: "Git Garden",
    description: "Git-based portfolio-as-a-service platform",
    url: "https://ts-git-garden.replit.app",
    icon: "Sprout",
    color: "#4f46e5",
  },
  {
    name: "Iron Path",
    description: "Fitness tracking and workout planning platform",
    url: "https://ts-iron-path.replit.app",
    icon: "TrendingUp",
    color: "#059669",
  },
  {
    name: "PurpleGreen",
    description: "Wealth management system for financial and accounting",
    url: "https://ts-purple-green.replit.app",
    icon: "DollarSign",
    color: "#8b5cf6",
  },
  {
    name: "BTCPay Dashboard",
    description: "Bitcoin payment processing and merchant tools",
    url: "https://ts-btcpay-dashboard.replit.app",
    icon: "Bitcoin",
    color: "#f59e0b",
  },
  {
    name: "Quest Armory",
    description: "Questing system with challenges and achievements",
    url: "https://ts-quest-armory.replit.app",
    icon: "Swords",
    color: "hsl(var(--primary))",
  },
  {
    name: "Git Healthz",
    description: "Service-wide health checks and monitoring",
    url: "https://ts-git-healthz.replit.app",
    icon: "Activity",
    color: "hsl(var(--primary))",
  },
  {
    name: "Academia Vault",
    description: "Academic resources and knowledge management",
    url: "https://ts-academia-vault.replit.app",
    icon: "BookOpen",
    color: "hsl(var(--primary))",
  },
];

export async function seedServices(userId: string) {
  console.log(`🌱 Starting database seeding for user ${userId}...`);

  for (const defaultService of DEFAULT_SERVICES) {
    try {
      // Check if this user already has a service with this name
      const existing = await db
        .select()
        .from(services)
        .where(and(
          eq(services.name, defaultService.name),
          eq(services.userId, userId)
        ))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Service "${defaultService.name}" already exists for this user, skipping...`);
        continue;
      }

      // Generate secret
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      
      // Encrypt the secret for secure storage
      const encryptedSecret = encryptSecret(plaintextSecret);
      
      // Create truncated preview for display
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;

      // Create service with redirect URL defaulting to service URL
      const [newService] = await db.insert(services).values({
        ...defaultService,
        userId,
        secret: encryptedSecret,
        secretPreview,
        redirectUrl: defaultService.url,
      }).returning();

      // Create login configuration for this service
      await storage.seedLoginPageConfigForService(newService.id);

      console.log(`✅ Created service: "${defaultService.name}"`);
      console.log(`   Secret: ${plaintextSecret}`);
    } catch (error) {
      console.error(`❌ Failed to create service "${defaultService.name}":`, error);
    }
  }

  console.log("\n✨ Database seeding completed for user!");
}

/**
 * Seeds the AuthHub system service (if it doesn't exist)
 * This is the service that represents AuthHub itself
 * It should be created once and is non-deletable
 */
export async function seedAuthHubSystemService(userId: string) {
  console.log("🔐 Checking for AuthHub system service...");

  try {
    // Check if AuthHub system service already exists
    const existing = await db
      .select()
      .from(services)
      .where(eq(services.isSystemService, true))
      .limit(1);

    if (existing.length > 0) {
      console.log("✅ AuthHub system service already exists");
      return existing[0].id;
    }

    // Generate secret for AuthHub
    const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
    const encryptedSecret = encryptSecret(plaintextSecret);
    const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;

    // Get the current domain for redirect URL
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : "http://localhost:5000";

    // Create AuthHub system service
    const [authHubService] = await db.insert(services).values({
      userId,
      name: "AuthHub",
      description: "Centralized Authentication System",
      url: baseUrl,
      redirectUrl: `${baseUrl}/dashboard`,
      icon: "Shield",
      color: "hsl(248, 100%, 28%)", // Arcane Blue
      secret: encryptedSecret,
      secretPreview,
      isSystemService: true,
    }).returning();

    // Create login configuration for AuthHub
    await storage.seedLoginPageConfigForService(authHubService.id);

    console.log("✅ Created AuthHub system service");
    console.log(`   Service ID: ${authHubService.id}`);
    console.log(`   Secret: ${plaintextSecret}`);
    
    return authHubService.id;
  } catch (error) {
    console.error("❌ Failed to create AuthHub system service:", error);
    throw error;
  }
}
