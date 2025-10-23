# AuthHub OAuth Authentication Flow - Complete Guide

## Overview
This document provides a step-by-step guide for integrating an external service (Academia Vault) with AuthHub using the OAuth redirect flow.

---

## Critical Configuration Requirements

### For Academia Vault (External Service)

You need **TWO** pieces of information from AuthHub:

1. **Service ID** (UUID format)
   - Found in: AuthHub Config page
   - Example: `a1474ce0-6275-4b51-beaf-bbf61e913ea8`
   
2. **Service Secret** (sk_* format)
   - Found in: AuthHub Config page (shown only once on creation/rotation)
   - Example: `sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d`

### Environment Variables Required

```bash
# Academia Vault .env file
AUTHHUB_SERVICE_ID=a1474ce0-6275-4b51-beaf-bbf61e913ea8
AUTHHUB_SECRET=sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d
AUTHHUB_URL=https://authhub.example.com
```

---

## Complete Authentication Flow

### Step 1: User Initiates Login on Academia Vault

**User Action:** Clicks "Login with AuthHub" button

**Academia Vault Code:**
```javascript
// Frontend - Login button handler
function loginWithAuthHub() {
  const serviceId = process.env.AUTHHUB_SERVICE_ID;
  const redirectUri = `${window.location.origin}/auth/callback`;
  
  // ⚠️ CRITICAL: Both service_id and redirect_uri MUST be included
  const authUrl = `${process.env.AUTHHUB_URL}/login?service_id=${serviceId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('Redirecting to:', authUrl);
  window.location.href = authUrl;
}
```

**Generated URL Example:**
```
https://authhub.example.com/login?service_id=a1474ce0-6275-4b51-beaf-bbf61e913ea8&redirect_uri=https%3A%2F%2Facademia-vault.com%2Fauth%2Fcallback
```

**✅ Checklist:**
- [ ] `service_id` parameter is present
- [ ] `service_id` matches the UUID from AuthHub config page
- [ ] `redirect_uri` is URL-encoded
- [ ] `redirect_uri` matches your callback endpoint

---

### Step 2: User Lands on AuthHub Login Page

**What Happens:**
1. AuthHub receives the redirect with `serviceId` and `redirect_uri`
2. AuthHub stores these parameters in state
3. AuthHub shows the login page (UUID or Email/Password options)

**AuthHub Internal Code (for reference):**
```typescript
// AuthHub reads URL parameters
const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get('service_id');     // "a1474ce0-6275-4b51-beaf-bbf61e913ea8"
const redirectUri = urlParams.get('redirect_uri'); // "https://academia-vault.com/auth/callback"
```

---

### Step 3: User Authenticates on AuthHub

**User Action:** 
- **Option A:** Enters existing UUID or generates new UUID
- **Option B:** Logs in with email/password

**Example for UUID Login:**
```
User UUID: 31726a66-cb26-4958-b6a0-798f93cdd713
```

---

### Step 4: AuthHub Generates JWT Token

**⚠️ MOST CRITICAL STEP - This is where serviceId matters!**

**AuthHub Backend Code:**
```typescript
// POST /api/auth/uuid-login or POST /api/auth/login
async function generateAuthToken(userId: string, email: string | null, serviceId?: string) {
  let signingSecret = JWT_SECRET; // Default: AuthHub's internal secret
  
  // 🔑 KEY LOGIC: If serviceId is provided, use that service's secret
  if (serviceId) {
    // 1. Fetch the service from database
    const service = await storage.getServiceById(serviceId);
    //    Returns: { id: 'a1474ce0-...', secret: 'encrypted_secret', ... }
    
    if (!service || !service.secret) {
      throw new Error("Service not found or has no secret");
    }
    
    // 2. Decrypt the service secret (stored encrypted in database)
    signingSecret = decryptSecret(service.secret);
    //    Result: "sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d"
  }
  
  // 3. Sign JWT with the appropriate secret
  return jwt.sign(
    { 
      id: userId,     // "31726a66-cb26-4958-b6a0-798f93cdd713"
      email: email    // null for UUID-only users
    },
    signingSecret,    // 🔑 "sk_a06fb8815..." if serviceId provided
    { expiresIn: "7d" }
  );
}
```

**What Gets Signed:**
```javascript
// JWT Payload
{
  "id": "31726a66-cb26-4958-b6a0-798f93cdd713",
  "email": null,
  "iat": 1729728000,
  "exp": 1730332800
}

// Signing Secret (IF serviceId was provided)
"sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d"

// Result: JWT Token
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMxNzI2YTY2LWNiMjYtNDk1OC1iNmEwLTc5OGY5M2NkZDcxMyIsImVtYWlsIjpudWxsLCJpYXQiOjE3Mjk3MjgwMDAsImV4cCI6MTczMDMzMjgwMH0.SIGNATURE_CREATED_WITH_SERVICE_SECRET"
```

**❌ WHAT HAPPENS IF serviceId IS MISSING:**
```typescript
// If serviceId was NOT in the URL parameters:
signingSecret = JWT_SECRET; // Uses AuthHub's SESSION_SECRET instead!

// Token is signed with wrong secret → Verification will FAIL on Academia Vault
```

---

### Step 5: AuthHub Redirects Back to Academia Vault

**AuthHub Response:**
```javascript
// AuthHub redirects to:
const separator = redirectUri.includes('?') ? '&' : '?';
window.location.href = `${redirectUri}${separator}token=${encodeURIComponent(token)}&user_id=${encodeURIComponent(userId)}`;
```

**Actual Redirect URL:**
```
https://academia-vault.com/auth/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMxNzI2YTY2LWNiMjYtNDk1OC1iNmEwLTc5OGY5M2NkZDcxMyIsImVtYWlsIjpudWxsLCJpYXQiOjE3Mjk3MjgwMDAsImV4cCI6MTczMDMzMjgwMH0.SIGNATURE&user_id=31726a66-cb26-4958-b6a0-798f93cdd713
```

---

### Step 6: Academia Vault Receives the Callback

**Academia Vault Backend:**
```javascript
const jwt = require('jsonwebtoken');

app.get('/auth/callback', async (req, res) => {
  const { token, user_id } = req.query;
  
  // Log for debugging
  console.log('Received callback with:');
  console.log('- user_id:', user_id);
  console.log('- token:', token ? 'present' : 'missing');
  
  if (!token) {
    console.error('❌ No token received from AuthHub');
    return res.redirect('/login?error=no_token');
  }
  
  try {
    // 🔑 VERIFY TOKEN WITH YOUR SERVICE SECRET
    const secret = process.env.AUTHHUB_SECRET;
    
    console.log('Verifying token with secret:', secret.substring(0, 15) + '...');
    
    const decoded = jwt.verify(token, secret);
    
    console.log('✅ Token verified successfully!');
    console.log('Decoded payload:', decoded);
    // Output: { id: "31726a66-cb26-4958-b6a0-798f93cdd713", email: null, iat: ..., exp: ... }
    
    // Create your own session
    req.session.userId = decoded.id;
    req.session.email = decoded.email;
    
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.error('→ This usually means the signing secret doesn\'t match');
      console.error('→ Check that serviceId was included in the AuthHub URL');
    }
    
    res.redirect('/login?error=invalid_token');
  }
});
```

---

## Troubleshooting: "Invalid Signature" Error

### Root Cause Analysis

**The error occurs when:**
```
Token was signed with: SECRET_A
Token is verified with: SECRET_B
Result: ❌ Invalid signature
```

### Common Mistakes

#### ❌ Mistake #1: Missing service_id in AuthHub URL
```javascript
// WRONG - No service_id parameter
window.location.href = `https://authhub.com/login?redirect_uri=${redirectUri}`;

// Token gets signed with: AuthHub's SESSION_SECRET
// You verify with: sk_a06fb8815... (your service secret)
// Result: ❌ SIGNATURE MISMATCH
```

```javascript
// ✅ CORRECT - service_id included
window.location.href = `https://authhub.com/login?service_id=${serviceId}&redirect_uri=${redirectUri}`;

// Token gets signed with: sk_a06fb8815... (your service secret)
// You verify with: sk_a06fb8815... (your service secret)
// Result: ✅ MATCH
```

#### ❌ Mistake #2: Wrong Secret in Environment Variables
```javascript
// Check your .env file
console.log('AUTHHUB_SECRET:', process.env.AUTHHUB_SECRET);

// Should output: sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d
// NOT: Some other secret or undefined
```

#### ❌ Mistake #3: Service Secret Was Rotated
```javascript
// If secret was rotated in AuthHub, old tokens become invalid
// Solution: Get new secret from AuthHub config page and update .env
```

---

## Verification Checklist

### Before Initiating Login

- [ ] `AUTHHUB_SERVICE_ID` is set in environment variables
- [ ] `AUTHHUB_SECRET` is set in environment variables
- [ ] Service ID matches the UUID shown in AuthHub config page
- [ ] Service secret matches the secret from AuthHub (starts with `sk_`)

### During Login Flow

- [ ] AuthHub URL includes both `service_id` and `redirect_uri` parameters
- [ ] URL is properly formatted: `?service_id=xxx&redirect_uri=yyy`
- [ ] redirect_uri is URL-encoded

### During Token Verification

- [ ] Token is being passed in callback URL
- [ ] You're using `jwt.verify(token, process.env.AUTHHUB_SECRET)`
- [ ] The secret used for verification matches what's in your .env file
- [ ] No typos in the secret value

---

## Testing the Flow

### Quick Test Script for Academia Vault

```javascript
// test-authhub-flow.js
const jwt = require('jsonwebtoken');

// 1. Check environment variables
console.log('=== Environment Check ===');
console.log('AUTHHUB_SERVICE_ID:', process.env.AUTHHUB_SERVICE_ID);
console.log('AUTHHUB_SECRET:', process.env.AUTHHUB_SECRET ? `${process.env.AUTHHUB_SECRET.substring(0, 15)}...` : 'NOT SET');

// 2. Verify you can decode a token (don't verify, just decode)
const sampleToken = 'paste-token-from-authhub-here';
const decoded = jwt.decode(sampleToken);
console.log('\n=== Token Payload ===');
console.log(decoded);

// 3. Try to verify with your secret
try {
  const verified = jwt.verify(sampleToken, process.env.AUTHHUB_SECRET);
  console.log('\n✅ Token verification SUCCESS!');
  console.log('User ID:', verified.id);
} catch (error) {
  console.log('\n❌ Token verification FAILED!');
  console.log('Error:', error.message);
  console.log('\nPossible causes:');
  console.log('1. serviceId was not included in AuthHub URL');
  console.log('2. Wrong secret in AUTHHUB_SECRET env variable');
  console.log('3. Secret was rotated in AuthHub');
}
```

---

## Expected Flow Summary

```
┌─────────────────┐
│ Academia Vault  │
│   (User clicks  │
│  "Login" button)│
└────────┬────────┘
         │
         │ Redirect to:
         │ /login?serviceId=a1474ce0...&redirect_uri=https://...
         ▼
┌─────────────────────────────────────────┐
│           AuthHub Login Page            │
│                                         │
│  User enters UUID or email/password     │
│                                         │
│  AuthHub reads serviceId from URL       │
│  → Fetches service from database        │
│  → Decrypts service secret              │
│  → Signs JWT with:                      │
│    sk_a06fb8815348654a81cc714f...      │
│                                         │
└────────┬────────────────────────────────┘
         │
         │ Redirect to:
         │ /auth/callback?token=eyJhbG...&user_id=31726a66...
         ▼
┌─────────────────────────────────────────┐
│    Academia Vault /auth/callback        │
│                                         │
│  Receives token in query params         │
│  Verifies with:                         │
│    jwt.verify(token,                    │
│      "sk_a06fb8815348654a81cc714f...")  │
│                                         │
│  ✅ Verification succeeds!               │
│  → Creates session                      │
│  → Redirects to /dashboard              │
│                                         │
└─────────────────────────────────────────┘
```

---

## Key Takeaway

**The serviceId parameter is MANDATORY for the flow to work.**

Without it:
- ❌ AuthHub signs token with wrong secret (SESSION_SECRET)
- ❌ Academia Vault can't verify the token
- ❌ User can't log in

With it:
- ✅ AuthHub signs token with service-specific secret
- ✅ Academia Vault successfully verifies the token
- ✅ User logs in successfully

---

## Support

If you're still experiencing signature verification failures after following this guide:

1. **Verify the secret matches:**
   ```bash
   # On Academia Vault server
   echo $AUTHHUB_SECRET
   # Should output: sk_a06fb8815348654a81cc714f5259748ffebee4a987e2620d
   ```

2. **Check the AuthHub URL being generated:**
   ```javascript
   console.log('Full AuthHub URL:', authUrl);
   // Should include: ?service_id=a1474ce0-6275-4b51-beaf-bbf61e913ea8&redirect_uri=...
   ```

3. **Decode the token (without verifying) to inspect payload:**
   ```javascript
   const decoded = jwt.decode(token);
   console.log('Token payload:', decoded);
   // Should show user ID and email
   ```

4. **Test with a fresh token:**
   - Clear browser cache
   - Generate new UUID login
   - Capture the token
   - Try verifying manually

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2025  
**AuthHub Service:** Academia Vault  
**Service ID:** a1474ce0-6275-4b51-beaf-bbf61e913ea8
