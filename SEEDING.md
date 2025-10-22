# Database Seeding Guide

## Overview
AuthHub includes a database seeding script to populate the production database with default services. This ensures that when deployed, users have example services to work with.

## Running the Seed Script

### Development Environment
```bash
npx tsx server/seed.ts
```

### Production Environment
After deploying your application:

1. Open the Shell in your Replit deployment
2. Run the seeding command:
```bash
npx tsx server/seed.ts
```

The script is **idempotent**, meaning you can run it multiple times safely. It will skip services that already exist.

## Default Services

The seed script creates seven production services:

1. **Git Garden**
   - Git-based portfolio-as-a-service platform
   - Icon: Sprout
   - URL: https://ts-git-garden.replit.app

2. **Iron Path**
   - Fitness tracking and workout planning platform
   - Icon: TrendingUp
   - URL: https://ts-iron-path.replit.app

3. **PurpleGreen**
   - Wealth management system for financial and accounting
   - Icon: DollarSign
   - URL: https://ts-purple-green.replit.app

4. **BTCPay Dashboard**
   - Bitcoin payment processing and merchant tools
   - Icon: Bitcoin
   - URL: https://ts-btcpay-dashboard.replit.app

5. **Quest Armory**
   - Questing system with challenges and achievements
   - Icon: Swords
   - URL: https://ts-quest-armory.replit.app

6. **Git Healthz**
   - Service-wide health checks and monitoring
   - Icon: Activity
   - URL: https://ts-git-healthz.replit.app

7. **Academia Vault**
   - Academic resources and knowledge management
   - Icon: BookOpen
   - URL: https://ts-academia-vault.replit.app

## Important Notes

⚠️ **Service Secrets**: Each seeded service gets a unique secret that is displayed ONCE during seeding. Make sure to copy and save these secrets if you plan to use the services for widget authentication.

The seed script will output something like:
```
🌱 Starting database seeding...
✅ Created service: "Git Garden"
   Secret: sk_a1b2c3d4e5f6g7h8i9j0...
✅ Created service: "Iron Path"
   Secret: sk_k1l2m3n4o5p6q7r8s9t0...
...
✨ Database seeding completed!
```

**Important**: Save these secrets immediately! They are only displayed once during seeding and cannot be retrieved later.

## Customizing Default Services

To modify the default services, edit the `DEFAULT_SERVICES` array in `server/seed.ts`:

```typescript
const DEFAULT_SERVICES: DefaultService[] = [
  {
    name: "Your Service Name",
    description: "Service description",
    url: "https://your-service.com",
    icon: "Globe", // Any Lucide icon name
    color: "hsl(210, 100%, 50%)", // HSL color
  },
  // Add more services...
];
```

## Production Deployment Checklist

When deploying to production:

1. ✅ Push your schema to the database: `npm run db:push`
2. ✅ Deploy/publish your application
3. ✅ Run the seed script: `npx tsx server/seed.ts`
4. ✅ Save the generated secrets in a secure location
5. ✅ Verify services appear in the config page

## Troubleshooting

**Services already exist**: The script will skip existing services and show:
```
⏭️  Service "Example Dashboard" already exists, skipping...
```

**Database connection issues**: Ensure your `DATABASE_URL` environment variable is set correctly for the target environment.

**Permission errors**: Make sure you have write access to the database in your production environment.
