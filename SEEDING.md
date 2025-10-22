# Database Seeding Guide

## Overview
AuthHub includes automatic database seeding that runs when the app starts with an empty database. This ensures that when deployed, users automatically have all default services configured and ready to use.

## Automatic Seeding (Recommended)

**The app automatically seeds the database on first startup!** 

When you deploy or start your app for the first time:
1. The app checks if services exist in the database
2. If the database is empty, it automatically runs the seed script
3. All 7 production services are created with unique secrets
4. Secrets are logged to the console (save them immediately!)
5. The app starts normally

**No manual commands needed!** Just deploy and the services will be there.

### Viewing Secrets After Deployment

When you deploy, check your deployment logs immediately after startup. You'll see:
```
📦 Database is empty, running auto-seed...
🌱 Starting database seeding...
✅ Created service: "Git Garden"
   Secret: sk_abc123...
...
✨ Database seeding completed!
```

**Save these secrets immediately!** They're only shown once in the logs.

## Manual Seeding (Alternative)

If you prefer to run the seed script manually:

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

1. ✅ Deploy/publish your application
2. ✅ Check deployment logs immediately after startup for secrets
3. ✅ Save the generated secrets in a secure location (password manager)
4. ✅ Verify services appear in the config page
5. ✅ Done! Auto-seeding handles everything else

**Note**: The database schema is automatically synced on deployment. No manual `db:push` required.

## Troubleshooting

**Services already exist**: The script will skip existing services and show:
```
⏭️  Service "Example Dashboard" already exists, skipping...
```

**Database connection issues**: Ensure your `DATABASE_URL` environment variable is set correctly for the target environment.

**Permission errors**: Make sure you have write access to the database in your production environment.
