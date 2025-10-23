import { db } from "./db";
import { users, services } from "@shared/schema";
import { seedServices } from "./seed";
import { sql } from "drizzle-orm";

async function reseedAllUsers() {
  console.log("🔄 Starting reseed for all users...\n");
  
  // Get all users
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  console.log(`Found ${allUsers.length} total users\n`);
  
  // Get users who already have services
  const usersWithServices = await db
    .select({ userId: services.userId })
    .from(services)
    .groupBy(services.userId);
  
  const userIdsWithServices = new Set(usersWithServices.map(u => u.userId));
  console.log(`${userIdsWithServices.size} users already have services\n`);
  
  // Find users without services
  const usersWithoutServices = allUsers.filter(u => !userIdsWithServices.has(u.id));
  console.log(`${usersWithoutServices.length} users need services seeded\n`);
  
  // Seed services for each user without services
  for (const user of usersWithoutServices) {
    console.log(`\n📦 Seeding services for user: ${user.email || user.id}`);
    try {
      await seedServices(user.id);
    } catch (error) {
      console.error(`❌ Failed to seed for user ${user.id}:`, error);
    }
  }
  
  console.log("\n✅ Reseed complete!");
  process.exit(0);
}

reseedAllUsers().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
