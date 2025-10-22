import { db } from "./db";
import { services } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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

async function seedServices() {
  console.log("🌱 Starting database seeding...");

  for (const defaultService of DEFAULT_SERVICES) {
    try {
      // Check if service already exists
      const existing = await db
        .select()
        .from(services)
        .where(eq(services.name, defaultService.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Service "${defaultService.name}" already exists, skipping...`);
        continue;
      }

      // Generate secret
      const secret = `sk_${crypto.randomBytes(24).toString('hex')}`;

      // Create service with redirect URL defaulting to service URL
      await db.insert(services).values({
        ...defaultService,
        secret,
        redirectUrl: defaultService.url,
      });

      console.log(`✅ Created service: "${defaultService.name}"`);
      console.log(`   Secret: ${secret}`);
    } catch (error) {
      console.error(`❌ Failed to create service "${defaultService.name}":`, error);
    }
  }

  console.log("\n✨ Database seeding completed!");
}

// Run seeding
seedServices()
  .then(() => {
    console.log("\n👋 Seeding finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seeding failed:", error);
    process.exit(1);
  });
