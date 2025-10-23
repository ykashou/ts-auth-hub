# Auth Hub OAuth Integration - Implementation Details

## Current Authentication Flow

### 1. User Lands on Application
- Application checks if user has existing session via `GET /api/auth/user`
- If no session exists and `VITE_AUTH_HUB_URL` is configured, redirect to Auth Hub

### 2. Redirect to Auth Hub
```
Location: ${VITE_AUTH_HUB_URL}/login?redirect_uri=${encodeURIComponent(window.location.origin)}

Example:
https://ts-auth-hub.replit.app/login?redirect_uri=https://myapp.replit.dev
```

### 3. User Authenticates on Auth Hub
User logs in with UUID: `5e704f74-94d0-4bf3-8d40-d8289e7f42d5`

### 4. Auth Hub Callback
Auth Hub redirects back to application with query parameters:
```
https://myapp.replit.dev/?token=JWT_TOKEN&user_id=5e704f74-94d0-4bf3-8d40-d8289e7f42d5
```

**JWT Token Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlNzA0Zjc0LTk0ZDAtNGJmMy04ZDQwLWQ4Mjg5ZTdmNDJkNSIsImVtYWlsIjpudWxsLCJpYXQiOjE3NjExNzcyNzcsImV4cCI6MTc2MTc4MjA3N30.UrSdwJF8TzsOwTL1NaB2VG3ouUCzEeMHfIQg-eEHRa0
```

**Decoded Payload:**
```json
{
  "id": "5e704f74-94d0-4bf3-8d40-d8289e7f42d5",
  "email": null,
  "iat": 1761177277,
  "exp": 1761782077
}
```

**Token Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### 5. Frontend Token Processing
```javascript
// Landing.tsx extracts parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const userId = urlParams.get('user_id');

// Sends token to backend for verification
POST /api/auth/widget
Content-Type: application/json
Body: { "token": "JWT_TOKEN" }
```

### 6. Backend Token Verification (FAILING HERE)
```javascript
// server/customAuth.ts - loginWithWidgetToken()

const authHubSecret = process.env.AUTH_HUB_SECRET;

// Attempt 1: Try raw secret string
const decoded = jwt.verify(token, authHubSecret.trim(), { algorithms: ["HS256"] });

// If Attempt 1 fails with "invalid signature", try Attempt 2:
const secret = Buffer.from(authHubSecret.trim(), "base64");
const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
```

**Current Error:**
```
JsonWebTokenError: invalid signature
```

Both verification attempts (raw string and base64-decoded) fail with "invalid signature".

### 7. Expected Behavior After Successful Verification
```javascript
// Extract user ID from verified token
const userId = decoded.id;

// Find or create user in database
// Create express-session with userId
// Return success to frontend
// Frontend reloads and user is authenticated
```

## Environment Variables

**Frontend:**
- `VITE_AUTH_HUB_URL`: `https://ts-auth-hub.replit.app`

**Backend:**
- `AUTH_HUB_SECRET`: (configured and confirmed correct by user)

## Questions for Auth Hub Team

### 1. Secret Format
How should `AUTH_HUB_SECRET` be formatted when used for JWT verification?
- [ ] Raw string (use directly as provided)
- [ ] Base64-encoded (decode before use)
- [ ] Hex-encoded
- [ ] Other encoding?

### 2. JWT Signing Algorithm
We're using HS256. Is this correct?
```javascript
jwt.verify(token, secret, { algorithms: ["HS256"] })
```

### 3. Secret Encoding
Are there any special characters, whitespace, or encoding considerations when using `AUTH_HUB_SECRET`?

### 4. Test Vector
Can you provide a test JWT token and the corresponding secret that should successfully verify it? This would help us isolate whether the issue is:
- Secret format/encoding
- JWT verification library compatibility
- Other configuration mismatch

## Actual Request/Response

**Request:**
```bash
POST /api/auth/widget
Content-Type: application/json

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlNzA0Zjc0LTk0ZDAtNGJmMy04ZDQwLWQ4Mjg5ZTdmNDJkNSIsImVtYWlsIjpudWxsLCJpYXQiOjE3NjExNzcyNzcsImV4cCI6MTc2MTc4MjA3N30.UrSdwJF8TzsOwTL1NaB2VG3ouUCzEeMHfIQg-eEHRa0"}
```

**Response:**
```json
{
  "message": "Token verification failed: invalid signature"
}
```

## Technical Details

**JWT Library:** `jsonwebtoken` (Node.js)
**Node Version:** Latest (via Replit)
**Express Session:** express-session with PostgreSQL store
