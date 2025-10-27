import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, CheckCircle2, ExternalLink, Shield, Zap, Lock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";

export default function WidgetDocsPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentDomain = window.location.origin;

  const installCode = `<!-- Include AuthHub Widget SDK -->
<script src="${currentDomain}/authhub-widget.js"></script>`;

  const initCode = `<script>
  // Initialize AuthHub Widget
  const authHub = new AuthHubWidget({
    domain: '${currentDomain}',
    onSuccess: (token, user) => {
      // Store the token (localStorage, cookies, or state management)
      localStorage.setItem('authToken', token);
      
      // Update your UI
      console.log('Authenticated user:', user);
      console.log('JWT Token:', token);
      
      // Redirect or update application state
      window.location.href = '/dashboard';
    },
    onError: (error) => {
      console.error('Authentication failed:', error);
      alert('Login failed: ' + error);
    },
    debug: true // Enable console logging for development
  });
</script>`;

  const triggerCode = `<!-- Login Button -->
<button onclick="authHub.login()">
  Sign in with AuthHub
</button>`;

  const fullExample = `<!DOCTYPE html>
<html>
<head>
  <title>My App - AuthHub Integration</title>
</head>
<body>
  <h1>Welcome to My App</h1>
  
  <div id="user-info" style="display: none;">
    <p>Logged in as: <span id="user-email"></span></p>
    <button onclick="logout()">Logout</button>
  </div>
  
  <div id="login-section">
    <button onclick="authHub.login()">Sign in with AuthHub</button>
  </div>

  <!-- Include AuthHub Widget SDK -->
  <script src="${currentDomain}/authhub-widget.js"></script>
  
  <script>
    // Initialize AuthHub Widget
    const authHub = new AuthHubWidget({
      domain: '${currentDomain}',
      onSuccess: (token, user) => {
        // Store token
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update UI
        showUserInfo(user);
      },
      onError: (error) => {
        console.error('Auth failed:', error);
      }
    });

    // Check if already logged in
    window.onload = function() {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        showUserInfo(JSON.parse(user));
      }
    };

    function showUserInfo(user) {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('user-info').style.display = 'block';
      document.getElementById('user-email').textContent = 
        user.email || user.id;
    }

    function logout() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      location.reload();
    }
  </script>
</body>
</html>`;

  const apiUsageCode = `// Making authenticated API requests to your backend
fetch('${currentDomain}/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('API Error:', error));`;

  const reactExample = `import { useState } from 'react';

function App() {
  const [user, setUser] = useState(null);

  // Initialize widget on mount
  useEffect(() => {
    const authHub = new AuthHubWidget({
      domain: '${currentDomain}',
      onSuccess: (token, user) => {
        localStorage.setItem('authToken', token);
        setUser(user);
      },
      onError: (error) => {
        console.error('Auth failed:', error);
      }
    });

    // Expose to window for button clicks
    window.authHub = authHub;
  }, []);

  const handleLogin = () => {
    window.authHub.login();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email || user.id}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login with AuthHub</button>
      )}
    </div>
  );
}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <PageHeader 
            title="Widget Integration"
            subtitle="Integrate AuthHub authentication into your website using our JavaScript SDK"
          />
        
          {/* Introduction */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Easy Integration</h3>
                    <p className="text-xs text-muted-foreground">
                      Add authentication in minutes with our JavaScript SDK
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Secure by Default</h3>
                    <p className="text-xs text-muted-foreground">
                      JWT tokens, encrypted communication, domain validation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Dual Auth Methods</h3>
                    <p className="text-xs text-muted-foreground">
                      Support for both UUID and email/password authentication
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-8" />

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Quick Start
            </CardTitle>
            <CardDescription>Get up and running in 3 simple steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default">Step 1</Badge>
                <h3 className="font-semibold">Include the SDK</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Add the AuthHub widget script to your HTML page:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{installCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(installCode, 'install')}
                  data-testid="button-copy-install"
                >
                  {copiedId === 'install' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default">Step 2</Badge>
                <h3 className="font-semibold">Initialize the Widget</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Configure the widget with your callbacks:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{initCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(initCode, 'init')}
                  data-testid="button-copy-init"
                >
                  {copiedId === 'init' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default">Step 3</Badge>
                <h3 className="font-semibold">Trigger Login</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Add a button to open the authentication popup:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{triggerCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(triggerCode, 'trigger')}
                  data-testid="button-copy-trigger"
                >
                  {copiedId === 'trigger' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Example */}
        <Card>
          <CardHeader>
            <CardTitle>Complete HTML Example</CardTitle>
            <CardDescription>Full working example with login/logout functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                <code>{fullExample}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(fullExample, 'full')}
                data-testid="button-copy-full"
              >
                {copiedId === 'full' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* React Example */}
        <Card>
          <CardHeader>
            <CardTitle>React Integration Example</CardTitle>
            <CardDescription>Using the widget in a React application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                <code>{reactExample}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(reactExample, 'react')}
                data-testid="button-copy-react"
              >
                {copiedId === 'react' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* OAuth Redirect Flow Section */}
        <div>
          <h2 className="text-2xl font-bold mb-3">OAuth Redirect Flow</h2>
          <p className="text-muted-foreground mb-4">
            For traditional web applications or when popup blockers are a concern, use the redirect-based OAuth flow.
            This is the standard authentication pattern used by providers like Google, GitHub, and Auth0.
          </p>
        </div>

        {/* Redirect Flow Example */}
        <Card>
          <CardHeader>
            <CardTitle>Redirect Flow Implementation</CardTitle>
            <CardDescription>Standard OAuth redirect pattern - works on all devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                <code>{`// Step 1: Redirect user to AuthHub with redirect_uri parameter
function loginWithAuthHub() {
  const redirectUri = window.location.origin + '/auth/callback';
  window.location.href = '${currentDomain}/login?redirect_uri=' + 
    encodeURIComponent(redirectUri);
}

// Step 2: Handle the callback - AuthHub redirects back with token
// Create a callback route at /auth/callback
function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userId = urlParams.get('user_id');
  
  if (token && userId) {
    // Store the token
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userId);
    
    // Redirect to your app
    window.location.href = '/dashboard';
  } else {
    // Handle error
    console.error('Authentication failed');
    window.location.href = '/login';
  }
}

// Example: Full page with login button
<button onclick="loginWithAuthHub()">
  Login with AuthHub
</button>`}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(`// Step 1: Redirect user to AuthHub with redirect_uri parameter
function loginWithAuthHub() {
  const redirectUri = window.location.origin + '/auth/callback';
  window.location.href = '${currentDomain}/login?redirect_uri=' + 
    encodeURIComponent(redirectUri);
}

// Step 2: Handle the callback - AuthHub redirects back with token
// Create a callback route at /auth/callback
function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userId = urlParams.get('user_id');
  
  if (token && userId) {
    // Store the token
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userId);
    
    // Redirect to your app
    window.location.href = '/dashboard';
  } else {
    // Handle error
    console.error('Authentication failed');
    window.location.href = '/login';
  }
}

// Example: Full page with login button
<button onclick="loginWithAuthHub()">
  Login with AuthHub
</button>`, 'redirect')}
                data-testid="button-copy-redirect"
              >
                {copiedId === 'redirect' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Flow Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Popup vs Redirect: Which to Choose?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Use Popup Widget When:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Building a Single-Page Application (SPA)</li>
                  <li>You want to preserve application state during authentication</li>
                  <li>Targeting desktop users primarily</li>
                  <li>You need a seamless, non-disruptive user experience</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Use Redirect Flow When:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Building a traditional multi-page web application</li>
                  <li>Mobile users are a significant portion of your audience</li>
                  <li>You need maximum browser compatibility</li>
                  <li>You prefer the standard OAuth pattern</li>
                  <li>Popup blockers are causing issues for your users</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Making Authenticated API Requests</CardTitle>
            <CardDescription>Use the JWT token to authenticate API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{apiUsageCode}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(apiUsageCode, 'api')}
                data-testid="button-copy-api"
              >
                {copiedId === 'api' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backend Token Verification - LOCAL VERIFICATION */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" />
              Backend Token Verification (Local)
            </CardTitle>
            <CardDescription>
              Verify JWT tokens locally using your service secret - no callback to AuthHub needed!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg">
              <p className="text-sm text-primary font-semibold mb-2">
                ✓ Key Insight
              </p>
              <p className="text-sm text-muted-foreground">
                When you pass your <code className="bg-muted px-1 rounded">serviceId</code> in the redirect URL, 
                AuthHub signs the JWT with <strong>your service's secret</strong> instead of its own SESSION_SECRET. 
                This allows you to verify tokens locally using the same secret you have in your environment variables!
              </p>
            </div>

            <div className="bg-muted/50 border border-border p-3 rounded-lg mt-3">
              <p className="text-sm text-muted-foreground">
                <strong>Security Note:</strong> AuthHub stores your service secrets encrypted using AES-256-GCM in the database. 
                When signing JWTs, AuthHub decrypts your secret internally. <strong>You always work with the plaintext secret</strong> 
                (the sk_* value shown when you create/rotate it) - no changes needed on your end!
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Step 1: Setup Your Integration URL</h4>
              <p className="text-sm text-muted-foreground mb-2">
                When redirecting users to AuthHub, include your <code className="bg-muted px-1 rounded">serviceId</code>:
              </p>
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
                <code>{`https://authhub.example.com/login?serviceId=YOUR_SERVICE_ID&redirect_uri=YOUR_CALLBACK_URL`}</code>
              </pre>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">Step 2: Verify Tokens Locally</h4>
              <div className="relative mt-2">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`// Backend route (Node.js/Express example)
const jwt = require('jsonwebtoken');

app.post('/api/auth/callback', async (req, res) => {
  const { token } = req.body; // or get from URL params
  
  try {
    // Verify token locally using YOUR service secret
    const decoded = jwt.verify(token, process.env.AUTH_HUB_SECRET);
    
    // Token is valid - decoded contains { id, email }
    const userId = decoded.id;
    const userEmail = decoded.email;
    
    // Create your own session
    req.session.userId = userId;
    req.session.email = userEmail;
    
    res.json({ success: true, user: decoded });
  } catch (error) {
    // Token invalid or expired
    res.status(401).json({ error: 'Invalid token' });
  }
});`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`// Backend route (Node.js/Express example)
const jwt = require('jsonwebtoken');

app.post('/api/auth/callback', async (req, res) => {
  const { token } = req.body; // or get from URL params
  
  try {
    // Verify token locally using YOUR service secret
    const decoded = jwt.verify(token, process.env.AUTH_HUB_SECRET);
    
    // Token is valid - decoded contains { id, email }
    const userId = decoded.id;
    const userEmail = decoded.email;
    
    // Create your own session
    req.session.userId = userId;
    req.session.email = userEmail;
    
    res.json({ success: true, user: decoded });
  } catch (error) {
    // Token invalid or expired
    res.status(401).json({ error: 'Invalid token' });
  }
});`, 'backend-verify')}
                  data-testid="button-copy-backend-verify"
                >
                  {copiedId === 'backend-verify' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">How It Works</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>You pass your <code className="bg-muted px-1 rounded">serviceId</code> in the Auth Hub redirect URL</li>
                <li>AuthHub looks up your service's secret and signs the JWT with it</li>
                <li>You verify the JWT locally using the same secret from your env vars</li>
                <li>No callback to AuthHub needed - fully decentralized!</li>
                <li>Tokens expire in 7 days by default</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* RBAC Integration Section */}
        <Separator className="my-8" />
        
        <div>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Role-Based Access Control (RBAC)
          </h2>
          <p className="text-muted-foreground mb-4">
            AuthHub includes comprehensive RBAC support, allowing you to assign roles and permissions to users within your services.
            JWT tokens automatically include role and permission data when users authenticate.
          </p>
        </div>

        {/* JWT Token Structure with RBAC */}
        <Card>
          <CardHeader>
            <CardTitle>JWT Token Structure with RBAC</CardTitle>
            <CardDescription>
              When a user authenticates with a service_id, the JWT token includes their role and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg">
              <p className="text-sm text-primary font-semibold mb-2">
                ✓ Automatic RBAC Inclusion
              </p>
              <p className="text-sm text-muted-foreground">
                When you pass <code className="bg-muted px-1 rounded">service_id</code> in the redirect URL, 
                AuthHub automatically includes the user's role, permissions, and RBAC model information in the JWT token.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Example Token Payload</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`{
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
}`}</code>
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Token Fields Explained</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><code className="bg-muted px-1 rounded">id</code> - User's unique UUID</li>
                <li><code className="bg-muted px-1 rounded">email</code> - User's email address</li>
                <li><code className="bg-muted px-1 rounded">role</code> - System role (admin or user)</li>
                <li><code className="bg-muted px-1 rounded">rbacRole</code> - Service-specific role (e.g., Editor, Viewer)</li>
                <li><code className="bg-muted px-1 rounded">permissions</code> - Array of permissions granted to the role</li>
                <li><code className="bg-muted px-1 rounded">rbacModel</code> - The RBAC model assigned to the service</li>
              </ul>
            </div>

            <div className="bg-muted/50 border border-border p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> If a user has not been assigned a role in the service, <code className="bg-muted px-1 rounded">rbacRole</code> and <code className="bg-muted px-1 rounded">rbacModel</code> will be null, 
                and <code className="bg-muted px-1 rounded">permissions</code> will be an empty array.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Permission Checking Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Permission Checking Examples
            </CardTitle>
            <CardDescription>
              Implement permission-based access control in your application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Backend Middleware (Express.js)</h4>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{`// middleware/auth.js
const jwt = require('jsonwebtoken');

// Check if user has a specific permission
function requirePermission(permissionName) {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify token with your service secret
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
  res.json({ message: 'Content created!' });
});

app.delete('/api/content/:id', requirePermission('delete:content'), (req, res) => {
  // Only users with 'delete:content' permission can access this
  res.json({ message: 'Content deleted!' });
});`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`// middleware/auth.js
const jwt = require('jsonwebtoken');

// Check if user has a specific permission
function requirePermission(permissionName) {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify token with your service secret
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
  res.json({ message: 'Content created!' });
});

app.delete('/api/content/:id', requirePermission('delete:content'), (req, res) => {
  // Only users with 'delete:content' permission can access this
  res.json({ message: 'Content deleted!' });
});`, 'backend-rbac')}
                  data-testid="button-copy-backend-rbac"
                >
                  {copiedId === 'backend-rbac' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">Frontend Permission Checking (React)</h4>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{`// hooks/usePermissions.js
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

  const role = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded.rbacRole;
    } catch {
      return null;
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

  return { permissions, role, hasPermission, hasAnyPermission, hasAllPermissions };
}

// Component usage example
function ContentEditor() {
  const { hasPermission, role } = usePermissions();

  return (
    <div>
      <h2>Content Management</h2>
      <p>Your role: {role?.name || 'No role assigned'}</p>
      
      {hasPermission('create:content') && (
        <button>Create New Content</button>
      )}
      
      {hasPermission('update:content') && (
        <button>Edit Content</button>
      )}
      
      {hasPermission('delete:content') && (
        <button className="text-red-600">Delete Content</button>
      )}
      
      {!hasPermission('create:content') && (
        <p>You don't have permission to create content</p>
      )}
    </div>
  );
}`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`// hooks/usePermissions.js
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

  const role = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded.rbacRole;
    } catch {
      return null;
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

  return { permissions, role, hasPermission, hasAnyPermission, hasAllPermissions };
}

// Component usage example
function ContentEditor() {
  const { hasPermission, role } = usePermissions();

  return (
    <div>
      <h2>Content Management</h2>
      <p>Your role: {role?.name || 'No role assigned'}</p>
      
      {hasPermission('create:content') && (
        <button>Create New Content</button>
      )}
      
      {hasPermission('update:content') && (
        <button>Edit Content</button>
      )}
      
      {hasPermission('delete:content') && (
        <button className="text-red-600">Delete Content</button>
      )}
      
      {!hasPermission('create:content') && (
        <p>You don't have permission to create content</p>
      )}
    </div>
  );
}`, 'frontend-rbac')}
                  data-testid="button-copy-frontend-rbac"
                >
                  {copiedId === 'frontend-rbac' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RBAC Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setting Up RBAC for Your Service</CardTitle>
            <CardDescription>
              Configure role-based access control for your external application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Step 1: Create an RBAC Model</h4>
              <p className="text-sm text-muted-foreground mb-2">
                In the AuthHub admin panel, navigate to <strong>RBAC Models</strong> and create a new model with your custom roles and permissions.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">Step 2: Assign RBAC Model to Your Service</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Go to <strong>Services</strong>, find your service, and assign the RBAC model you created.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">Step 3: Assign Roles to Users</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Navigate to <strong>Role Assignments</strong> to assign users to specific roles within your service.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2">Step 4: Pass service_id in Authentication URL</h4>
              <p className="text-sm text-muted-foreground mb-2">
                When redirecting users to AuthHub for authentication, include your service ID:
              </p>
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
                <code>{`https://authhub.example.com/login?service_id=YOUR_SERVICE_ID&redirect_uri=YOUR_CALLBACK_URL`}</code>
              </pre>
            </div>

            <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg mt-3">
              <p className="text-sm text-primary font-semibold mb-2">
                ✓ That's It!
              </p>
              <p className="text-sm text-muted-foreground">
                Users will now receive JWT tokens with their role and permissions automatically included. 
                You can immediately start checking permissions on both frontend and backend.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Configuration Options */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">domain</h4>
                <p className="text-sm text-muted-foreground">
                  The AuthHub domain URL. Defaults to current origin.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">onSuccess(token, user)</h4>
                <p className="text-sm text-muted-foreground">
                  Callback function called when authentication succeeds. Receives JWT token and user object.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">onError(error)</h4>
                <p className="text-sm text-muted-foreground">
                  Callback function called when authentication fails. Receives error message.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">width</h4>
                <p className="text-sm text-muted-foreground">
                  Popup window width in pixels. Default: 500
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">height</h4>
                <p className="text-sm text-muted-foreground">
                  Popup window height in pixels. Default: 650
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">debug</h4>
                <p className="text-sm text-muted-foreground">
                  Enable console logging for development. Default: false
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">login()</h4>
                <p className="text-sm text-muted-foreground">
                  Opens the authentication popup window.
                </p>
                <pre className="bg-muted p-2 rounded text-xs mt-2">
                  <code>authHub.login();</code>
                </pre>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-1">logout()</h4>
                <p className="text-sm text-muted-foreground">
                  Closes the popup if open. Note: You must handle token removal in your application.
                </p>
                <pre className="bg-muted p-2 rounded text-xs mt-2">
                  <code>authHub.logout();</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security Considerations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Origin Validation:</strong> The widget automatically validates parent window origins via query parameters before sending JWT tokens via postMessage</li>
              <li><strong>Token Storage:</strong> Always store JWT tokens securely (httpOnly cookies recommended for production)</li>
              <li><strong>Secure Communication:</strong> PostMessage uses validated targetOrigin (never '*') to prevent token leakage to unauthorized domains</li>
              <li><strong>Token Expiration:</strong> JWT tokens have a 7-day expiration by default</li>
              <li><strong>HTTPS Required:</strong> Always use HTTPS in production deployments</li>
              <li><strong>Backend Validation:</strong> Always validate tokens on your backend for all protected endpoints</li>
            </ul>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
}
