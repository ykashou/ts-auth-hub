import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Shield, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";

export default function ApiDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication and admin role
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    } else if (getUserRole() !== 'admin') {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  if (!isAuthenticated() || getUserRole() !== 'admin') {
    return null;
  }

  const copyToClipboard = async (text: string, endpoint: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    toast({
      title: "Copied to clipboard",
      description: "Endpoint has been copied successfully",
    });
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      id: "register",
      method: "POST",
      path: "/api/auth/register",
      description: "Register a new user and receive a UUID",
      request: {
        email: "user@example.com",
        password: "securePassword123"
      },
      response: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        createdAt: "2025-01-01T00:00:00.000Z"
      }
    },
    {
      id: "login",
      method: "POST",
      path: "/api/auth/login",
      description: "Authenticate user and receive JWT token",
      request: {
        email: "user@example.com",
        password: "securePassword123"
      },
      response: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com"
        }
      }
    },
    {
      id: "verify",
      method: "POST",
      path: "/api/auth/verify",
      description: "Verify user credentials and retrieve UUID",
      headers: {
        "X-API-Key": "your-api-key-here"
      },
      request: {
        email: "user@example.com",
        password: "securePassword123"
      },
      response: {
        valid: true,
        userId: "550e8400-e29b-41d4-a716-446655440000"
      }
    },
    {
      id: "user-info",
      method: "GET",
      path: "/api/users/:id",
      description: "Get user information by UUID",
      headers: {
        "X-API-Key": "your-api-key-here"
      },
      response: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        createdAt: "2025-01-01T00:00:00.000Z"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <PageHeader 
            title="API Documentation"
            subtitle="Integrate AuthHub into your SaaS products using our REST API"
          />

          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                AuthHub provides a centralized authentication API for your SaaS products.
                All requests require an API key in the header.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Base URL</h3>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  https://your-domain.replit.app
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Include your API key in the request headers:
                </p>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  X-API-Key: your-api-key-here
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">API Endpoints</h2>
            
            {endpoints.map((endpoint) => (
              <Card key={endpoint.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={endpoint.method === "GET" ? "secondary" : "default"}
                        className="font-mono text-xs"
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-semibold">{endpoint.path}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint.path, endpoint.id)}
                      data-testid={`button-copy-${endpoint.id}`}
                    >
                      {copiedEndpoint === endpoint.id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription className="mt-2">
                    {endpoint.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {endpoint.headers && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Headers</h4>
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(endpoint.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {endpoint.request && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(endpoint.request, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Response</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(endpoint.response, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* OAuth Redirect Flow with RBAC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                OAuth Redirect Flow with RBAC
              </CardTitle>
              <CardDescription>
                Authenticate users via redirect flow and receive JWT tokens with role-based permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Step 1: Redirect User to AuthHub</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Redirect your users to AuthHub login with your service ID and redirect URL:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// Construct the AuthHub login URL
const authHubUrl = 'https://your-authhub.replit.app/login';
const serviceId = 'your-service-id';
const redirectUrl = encodeURIComponent('https://your-app.com/auth/callback');

// Redirect user to AuthHub
window.location.href = \`\${authHubUrl}?service_id=\${serviceId}&redirect_uri=\${redirectUrl}\`;`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Step 2: Handle Callback with JWT Token</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  After authentication, user is redirected back with a JWT token containing RBAC data:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// Parse token from callback URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const userId = urlParams.get('user_id');

// Store the token (e.g., in localStorage or httpOnly cookie)
localStorage.setItem('authToken', token);`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">JWT Token Structure with RBAC</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  The JWT token payload includes user identity and RBAC information:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "rbacRole": {
    "id": "role-uuid",
    "name": "Editor",
    "description": "Can create and edit content"
  },
  "permissions": [
    {
      "id": "perm-uuid-1",
      "name": "create:content",
      "description": "Create new content"
    },
    {
      "id": "perm-uuid-2",
      "name": "read:content",
      "description": "View content"
    },
    {
      "id": "perm-uuid-3",
      "name": "update:content",
      "description": "Edit existing content"
    }
  ],
  "rbacModel": {
    "id": "model-uuid",
    "name": "Content Management System",
    "description": "RBAC model for CMS applications"
  },
  "iat": 1735689600,
  "exp": 1736294400
}`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Step 3: Decode and Use Token</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Decode the JWT to access user identity and permissions:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`import jwt from 'jsonwebtoken';

// Decode token (Note: Token is signed with YOUR service secret)
const decoded = jwt.verify(token, process.env.SERVICE_SECRET);

console.log('User ID:', decoded.id);
console.log('User Role:', decoded.rbacRole?.name);
console.log('Permissions:', decoded.permissions.map(p => p.name));

// Check if user has specific permission
function hasPermission(token, permissionName) {
  const decoded = jwt.verify(token, process.env.SERVICE_SECRET);
  return decoded.permissions?.some(p => p.name === permissionName) || false;
}

// Usage example
if (hasPermission(token, 'create:content')) {
  // User can create content
} else {
  // Access denied
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Token Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Verify JWT Tokens</CardTitle>
              <CardDescription>
                Verify tokens received from AuthHub using the verification endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Endpoint</h4>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="secondary" className="font-mono text-xs">GET</Badge>
                  <code className="text-sm">/api/services/:serviceId/verify-token</code>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Send the JWT token in the Authorization header to verify it:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// Verify token on your backend
const response = await fetch(
  \`https://your-authhub.replit.app/api/services/\${serviceId}/verify-token\`,
  {
    headers: {
      'Authorization': \`Bearer \${token}\`
    }
  }
);

const result = await response.json();

if (result.valid) {
  console.log('Token is valid');
  console.log('User ID:', result.payload.userId);
  console.log('User Role:', result.payload.rbacRole?.name);
  console.log('Permissions:', result.payload.permissions);
} else {
  console.log('Token is invalid or expired');
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Permission Checking Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Permission Checking Examples
              </CardTitle>
              <CardDescription>
                Implement permission-based access control in your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Express.js Middleware Example</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// middleware/auth.js
import jwt from 'jsonwebtoken';

export function requirePermission(permissionName) {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(token, process.env.SERVICE_SECRET);
      
      // Check if user has required permission
      const hasPermission = decoded.permissions?.some(
        p => p.name === permissionName
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permission denied',
          required: permissionName 
        });
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Usage in routes
app.post('/api/content', requirePermission('create:content'), (req, res) => {
  // Only users with 'create:content' permission can access this
  // Create content...
});

app.delete('/api/content/:id', requirePermission('delete:content'), (req, res) => {
  // Only users with 'delete:content' permission can access this
  // Delete content...
});`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">React Frontend Example</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// hooks/usePermissions.js
import { jwtDecode } from 'jwt-decode';
import { useMemo } from 'react';

export function usePermissions() {
  const token = localStorage.getItem('authToken');
  
  const permissions = useMemo(() => {
    if (!token) return [];
    try {
      const decoded = jwtDecode(token);
      return decoded.permissions || [];
    } catch {
      return [];
    }
  }, [token]);

  const hasPermission = (permissionName) => {
    return permissions.some(p => p.name === permissionName);
  };

  const hasAnyPermission = (...permissionNames) => {
    return permissionNames.some(name => hasPermission(name));
  };

  const hasAllPermissions = (...permissionNames) => {
    return permissionNames.every(name => hasPermission(name));
  };

  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions };
}

// Component usage example
function ContentEditor() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      {hasPermission('create:content') && (
        <button>Create New Content</button>
      )}
      
      {hasPermission('update:content') && (
        <button>Edit Content</button>
      )}
      
      {hasPermission('delete:content') && (
        <button>Delete Content</button>
      )}
    </div>
  );
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Example Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Example Integration</CardTitle>
              <CardDescription>
                Example code to authenticate users from your SaaS application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// Example: Verify user credentials
const response = await fetch('https://your-domain.replit.app/api/auth/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'userPassword'
  })
});

const { valid, userId } = await response.json();

if (valid) {
  // User authenticated successfully
  // Store userId in your application
  console.log('User UUID:', userId);
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
