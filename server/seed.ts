import { db } from "./db";
import { services } from "@shared/schema";
import { eq } from "drizzle-orm";
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
    name: "Example Dashboard",
    description: "Main analytics and reporting dashboard",
    url: "https://dashboard.example.com",
    icon: "BarChart",
    color: "hsl(210, 100%, 50%)",
  },
  {
    name: "Example Admin Panel",
    description: "Administrative control panel for system management",
    url: "https://admin.example.com",
    icon: "Settings",
    color: "hsl(280, 70%, 50%)",
  },
  {
    name: "Example CRM",
    description: "Customer relationship management system",
    url: "https://crm.example.com",
    icon: "Users",
    color: "hsl(150, 60%, 45%)",
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

      // Generate and hash secret
      const plaintextSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
      const hashedSecret = await bcrypt.hash(plaintextSecret, SALT_ROUNDS);

      // Create service
      await db.insert(services).values({
        ...defaultService,
        hashedSecret,
      });

      console.log(`✅ Created service: "${defaultService.name}"`);
      console.log(`   Secret: ${plaintextSecret}`);
      console.log(`   ⚠️  Save this secret - it won't be shown again!`);
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
