# AuthHub Integration Guide for External Services

## Overview
This guide explains how to integrate your external service/application with AuthHub for authentication. AuthHub handles user credentials and provides JWT tokens that your service can verify locally.

## Important: No Action Required for Encryption Changes

**If you've already integrated with AuthHub:** The recent implementation of AES-256-GCM encryption for secrets is **completely transparent** to you. Your integration continues to work exactly as before.

### What Changed (Internal to AuthHub):
- Service secrets are now encrypted in AuthHub's database using AES-256-GCM
- When signing JWTs, AuthHub decrypts the secret internally before use

### What Didn't Change (Your Integration):
- ✅ You still receive the plaintext secret (e.g., `sk_abc123...`) when creating/rotating
- ✅ You still store this plaintext secret in your environment variables
- ✅ You still verify JWTs using the same plaintext secret
- ✅ No code changes needed in your application

---

## Integration Methods

AuthHub supports two integration patterns:

### 1. OAuth Redirect Flow (Recommended for Mobile & Multi-Page Apps)
**When to use:** Traditional web apps, mobile apps, maximum compatibility

**How it works:**
1. Redirect user to AuthHub with your `serviceId` and `redirect_uri`
2. User authenticates on AuthHub
3. AuthHub redirects back to your app with JWT token
4. You verify the token **locally** using your service secret

**Example Implementation:**

```javascript
// Step 1: Redirect to AuthHub
function loginWithAuthHub() {
  const redirectUri = 'https://yourapp.com/auth/callback';
  const serviceId = 'your-service-uuid'; // Get this from AuthHub dashboard
  
  window.location.href = 
    `https://authhub.example.com/login?serviceId=${serviceId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

// Step 2: Handle callback (backend)
const jwt = require('jsonwebtoken');

app.get('/auth/callback', async (req, res) => {
  const { token, user_id } = req.query;
  
  if (!token) {
    return res.redirect('/login?error=auth_failed');
  }
  
  try {
    // Verify token locally using YOUR service secret
    const decoded = jwt.verify(token, process.env.AUTHHUB_SECRET);
    
    // Token is valid - create your own session
    req.session.userId = decoded.id;
    req.session.email = decoded.email;
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('JWT verification failed:', error);
    res.redirect('/login?error=invalid_token');
  }
});
```

### 2. Popup Widget Flow (Best for SPAs)
**When to use:** Single-page applications, preserve app state during auth

**Example Implementation:**

```html
<!-- Include the widget SDK -->
<script src="https://authhub.example.com/authhub-widget.js"></script>

<script>
  const authHub = new AuthHubWidget({
    domain: 'https://authhub.example.com',
    onSuccess: (token, user) => {
      // Store token and update UI
      localStorage.setItem('authToken', token);
      console.log('User:', user);
      
      // Redirect or update state
      window.location.href = '/dashboard';
    },
    onError: (error) => {
      console.error('Auth failed:', error);
    }
  });
  
  // Trigger login
  document.getElementById('login-btn').onclick = () => authHub.login();
</script>
```

---

## Local JWT Verification (Key Feature)

### Why Local Verification?
When you pass your `serviceId` in the AuthHub URL, AuthHub signs the JWT with **your service's secret** instead of its own. This means:
- ✅ You can verify tokens instantly without calling back to AuthHub
- ✅ No network latency for token verification
- ✅ Works even if AuthHub is temporarily unavailable
- ✅ Complete control over your authentication flow

### Backend Verification Example (Node.js)

```javascript
const jwt = require('jsonwebtoken');

// Middleware to protect routes
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Verify using YOUR service secret
    const decoded = jwt.verify(token, process.env.AUTHHUB_SECRET);
    
    req.user = {
      id: decoded.id,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Protected route example
app.get('/api/user/profile', requireAuth, (req, res) => {
  res.json({
    userId: req.user.id,
    email: req.user.email
  });
});
```

### Python/Flask Example

```python
import jwt
import os
from flask import request, jsonify
from functools import wraps

AUTHHUB_SECRET = os.getenv('AUTHHUB_SECRET')

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Verify using YOUR service secret
            decoded = jwt.decode(token, AUTHHUB_SECRET, algorithms=['HS256'])
            request.user = {
                'id': decoded['id'],
                'email': decoded.get('email')
            }
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
    
    return decorated_function

@app.route('/api/user/profile')
@require_auth
def get_profile():
    return jsonify({
        'userId': request.user['id'],
        'email': request.user['email']
    })
```

---

## Setup Steps

### 1. Register Your Service in AuthHub
1. Log in to AuthHub
2. Navigate to "Services" in the dashboard
3. Click "Create Service"
4. Fill in:
   - **Name:** Your service name
   - **Description:** What your service does
   - **URL:** Your service's homepage
   - **Redirect URL:** Where to redirect after auth (optional)

### 2. Save Your Secret
When you create the service, AuthHub will display a secret like:
```
sk_a1b2c3d4e5f6g7h8i9j0...
```

**⚠️ Important:** This secret is only shown once! Copy it immediately.

### 3. Store Secret in Environment Variables

```bash
# .env
AUTHHUB_SECRET=sk_a1b2c3d4e5f6g7h8i9j0...
```

### 4. Get Your Service ID
Copy your service ID from the AuthHub dashboard (UUID format)

### 5. Implement Authentication
Choose either Popup Widget or Redirect Flow (see examples above)

---

## Security Best Practices

### ✅ DO:
- Store your service secret in environment variables (never commit to code)
- Use HTTPS for all production deployments
- Verify tokens on every protected backend endpoint
- Use httpOnly cookies for token storage (production)
- Implement token refresh logic for long-lived sessions
- Handle token expiration gracefully (tokens expire in 7 days)

### ❌ DON'T:
- Store secrets in client-side code or version control
- Skip backend token verification
- Trust tokens without verification
- Use HTTP in production
- Share secrets between multiple services

---

## Secret Rotation

If your secret is compromised or you need to rotate it:

1. Log in to AuthHub
2. Navigate to your service
3. Click "Rotate Secret"
4. Copy the new secret
5. Update your environment variables
6. **Deploy immediately** - old tokens will stop working

---

## Troubleshooting

### "Invalid token" errors
- ✅ Check that you're using the correct secret from environment variables
- ✅ Verify you're passing `serviceId` in the AuthHub URL
- ✅ Check token hasn't expired (7 day default)
- ✅ Ensure secret hasn't been rotated

### "No token provided" errors
- ✅ Check Authorization header format: `Bearer <token>`
- ✅ Verify token is being sent from frontend
- ✅ Check CORS settings if applicable

### Redirect not working
- ✅ Verify redirect_uri matches exactly (including protocol and port)
- ✅ Check URL encoding for redirect_uri parameter
- ✅ Ensure serviceId is correct

---

## JWT Token Structure

Tokens contain:
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Note:** Anonymous users will have `email: null`

---

## Support

For issues or questions:
1. Check the Widget Documentation at `/widget-docs`
2. Review the API Documentation at `/api-docs`
3. Contact AuthHub support

---

## Summary: Encryption Change Impact

**For External Services:** ✅ **Zero impact, no changes needed**

Your integration flow remains:
1. Get plaintext secret when creating service → `sk_abc...`
2. Store in environment variables → `AUTHHUB_SECRET=sk_abc...`
3. Verify JWTs with plaintext secret → `jwt.verify(token, process.env.AUTHHUB_SECRET)`

AuthHub's internal encryption is transparent to your application.
