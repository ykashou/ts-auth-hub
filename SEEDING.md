# Database Seeding Guide

## Overview
AuthHub includes **automatic per-user database seeding** that runs when each user registers or logs in for the first time. This ensures that every user automatically has their own isolated set of 7 default services configured and ready to use.

## Automatic Per-User Seeding

**Services are automatically created for each user on first registration/login!** 

When a new user registers or logs in for the first time:
1. The auth system detects this is a new user
2. Automatically runs the seed script for this specific user
3. Creates 7 default services (Git Garden, Iron Path, etc.) belonging to that user
4. Each service gets a unique secret (sk_* format)
5. Secrets are logged to the console for that user's seeding
6. User can immediately see and manage their services

**No manual commands needed!** Each user gets their own isolated services automatically.

### User Isolation

**Important:** Services are user-specific:
- Each user has their own isolated set of services
- User A's services are completely separate from User B's services  
- Users can only view, edit, and delete their own services
- Service secrets are unique per user per service

### Viewing Secrets After Seeding

When a new user registers, check your server logs to see their secrets:
```
🌱 Starting database seeding for user abc-123-def...
✅ Created service: "Git Garden"
   Secret: sk_abc123...
...
✨ Database seeding completed for user!
```

**Note:** Secrets are only shown once in the logs during creation!

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

⚠️ **Service Secrets**: Each seeded service gets a unique secret that is displayed ONCE in the server logs when a user registers. These secrets are bcrypt-hashed and cannot be retrieved after creation.

**Important**: Secrets are logged once during user registration. They cannot be retrieved later, but they can be rotated from the Config page if needed.

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

## Production Deployment

When deploying to production, services are automatically seeded for each user as they register or log in for the first time. No manual intervention is required.

**Important**: Check server logs after users register to capture their initial service secrets if needed for debugging.

## Troubleshooting

**Services already exist**: The script will skip existing services and show:
```
⏭️  Service "Example Dashboard" already exists, skipping...
```

**Database connection issues**: Ensure your `DATABASE_URL` environment variable is set correctly for the target environment.

**Permission errors**: Make sure you have write access to the database in your production environment.
