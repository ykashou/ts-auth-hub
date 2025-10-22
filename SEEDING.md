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

The seed script creates three example services:

1. **Example Dashboard**
   - Analytics and reporting dashboard
   - Icon: BarChart
   - Color: Blue

2. **Example Admin Panel**
   - Administrative control panel
   - Icon: Settings
   - Color: Purple

3. **Example CRM**
   - Customer relationship management
   - Icon: Users
   - Color: Green

## Important Notes

⚠️ **Service Secrets**: Each seeded service gets a unique secret that is displayed ONCE during seeding. Make sure to copy and save these secrets if you plan to use the services for widget authentication.

The seed script will output something like:
```
✅ Created service: "Example Dashboard"
   Secret: sk_a1b2c3d4e5f6...
   ⚠️  Save this secret - it won't be shown again!
```

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
