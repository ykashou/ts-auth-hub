import { db } from "./db";
import { services } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

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
      
      // Hash the secret for secure storage
      const hashedSecret = await bcrypt.hash(plaintextSecret, SALT_ROUNDS);
      
      // Create truncated preview for display
      const secretPreview = `${plaintextSecret.substring(0, 12)}...${plaintextSecret.substring(plaintextSecret.length - 6)}`;

      // Create service with redirect URL defaulting to service URL
      await db.insert(services).values({
        ...defaultService,
        userId,
        hashedSecret,
        secretPreview,
        redirectUrl: defaultService.url,
      });

      console.log(`✅ Created service: "${defaultService.name}"`);
      console.log(`   Secret: ${plaintextSecret}`);
    } catch (error) {
      console.error(`❌ Failed to create service "${defaultService.name}":`, error);
    }
  }

  console.log("\n✨ Database seeding completed for user!");
}
