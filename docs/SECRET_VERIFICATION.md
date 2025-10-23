# Secret Verification Report

## Overview
This document confirms the JWT signing secret for the Academia Vault service integration with AuthHub.

## User Information
- **User UUID**: `31726a66-cb26-4958-b6a0-798f93cdd713`
- **Service**: Academia Vault
- **Service ID**: `a1474ce0-6275-4b51-beaf-bbf61e913ea8`

## Verified Secret

The actual secret being used to sign JWT tokens is:

```
sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d
```

## Verification Process

### 1. Database Query
Retrieved the Academia Vault service record from the database:
- **Service ID**: `a1474ce0-6275-4b51-beaf-bbf61e913ea8`
- **Encrypted Secret**: `0qZepGwDmTv3d7EnGoXshQ==:YrbmigRqGzGNGvhqohbVSw==:8xpBZvU4i23/BAlWAcMan3P8KrPQzt4hi+6vIW/Onx6jKY/OmqkUkvYWOBEBxfnn6wmk`
- **Secret Preview**: `sk_a06fb8815...e2620d`

### 2. Decryption Test
Decrypted the stored secret using AuthHub's encryption system (AES-256-GCM):
- ✅ **Status**: SUCCESS
- **Decrypted Value**: `sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d`
- **Match**: Confirmed exact match with expected value

### 3. Code Flow Verification
Traced the JWT signing process in AuthHub:

When `serviceId` is provided during authentication:
1. `generateAuthToken(userId, email, serviceId)` is called
2. Function fetches service using `getServiceById(serviceId)`
3. Service secret is decrypted with `decryptSecret(service.secret)`
4. JWT is signed using the decrypted service secret

**Code Reference** (`server/routes.ts`):
```typescript
async function generateAuthToken(userId: string, email: string | null, serviceId?: string): Promise<string> {
  let signingSecret = JWT_SECRET;
  
  // If serviceId is provided, sign with service's secret instead of SESSION_SECRET
  if (serviceId) {
    const service = await storage.getServiceById(serviceId);
    if (!service) {
      throw new Error("Invalid service ID");
    }
    if (!service.secret) {
      throw new Error("Service has no secret configured");
    }
    // Decrypt the service secret to use for JWT signing
    signingSecret = decryptSecret(service.secret);
  }
  
  return jwt.sign(
    { id: userId, email: email },
    signingSecret,
    { expiresIn: "7d" }
  );
}
```

## External Service Configuration

### For Academia Vault Application

Set the following environment variable:

```bash
AUTH_HUB_SECRET=sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d
```

### JWT Verification Example

```javascript
const jwt = require('jsonwebtoken');

// Verify tokens from AuthHub
const verified = jwt.verify(token, process.env.AUTH_HUB_SECRET);
console.log('User ID:', verified.id);
console.log('Email:', verified.email);
```

## Security Notes

1. **Secret Storage**: The secret is encrypted in AuthHub's database using AES-256-GCM encryption
2. **Secret Rotation**: If the secret is rotated in AuthHub, the external service must update their `AUTH_HUB_SECRET` immediately
3. **Secret Preview**: Only a truncated preview is stored in plaintext (`sk_a06fb8815...e2620d`)
4. **One-Time Display**: Full secrets are only shown once during creation or rotation

## Verification Date
Generated: October 23, 2025

---

**Status**: ✅ Verified and Confirmed
