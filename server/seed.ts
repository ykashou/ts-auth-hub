import { db } from "./db";
import { services } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { encryptSecret } from "./crypto";
import { AUTHHUB_SERVICE } from "@shared/constants";

interface DefaultService {
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  isSystem?: boolean; // Flag to mark system services
}

const DEFAULT_SERVICES: DefaultService[] = [
  {
    name: AUTHHUB_SERVICE.name,
    description: AUTHHUB_SERVICE.description,
    url: AUTHHUB_SERVICE.url,
    icon: AUTHHUB_SERVICE.icon,
    color: AUTHHUB_SERVICE.color,
    isSystem: true, // Non-deletable system service
  },
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
      await db.insert(services).values({
        name: defaultService.name,
        description: defaultService.description,
        url: defaultService.url,
        icon: defaultService.icon,
        color: defaultService.color,
        userId,
        secret: encryptedSecret,
        secretPreview,
        redirectUrl: defaultService.url,
        isSystem: defaultService.isSystem || false, // Mark system services as non-deletable
      });

      console.log(`✅ Created service: "${defaultService.name}"`);
      console.log(`   Secret: ${plaintextSecret}`);
    } catch (error) {
      console.error(`❌ Failed to create service "${defaultService.name}":`, error);
    }
  }

  console.log("\n✨ Database seeding completed for user!");
}
