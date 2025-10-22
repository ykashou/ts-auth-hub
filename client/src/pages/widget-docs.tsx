import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, CheckCircle2, ExternalLink, Shield, Zap, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

export default function WidgetDocsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLocation("/login");
    }
  }, [setLocation]);

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
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">AuthHub</h1>
              <p className="text-xs text-muted-foreground">Widget Integration Guide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" data-testid="link-dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/services" data-testid="link-services">
              <Button variant="outline" size="sm">
                Services
              </Button>
            </Link>
            <Link href="/api-docs" data-testid="link-api-docs">
              <Button variant="outline" size="sm">
                API Docs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Introduction */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3">Embeddable Authentication Widget</h2>
          <p className="text-muted-foreground mb-4">
            Integrate AuthHub authentication into your website or application with just a few lines of code.
            The widget provides a popup-based authentication flow that works seamlessly across all modern browsers.
          </p>

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
        </div>

        <Separator className="my-8" />

        {/* Quick Start */}
        <Card className="mb-6">
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
        <Card className="mb-6">
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
        <Card className="mb-6">
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

        {/* API Usage */}
        <Card className="mb-6">
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

        {/* Configuration Options */}
        <Card className="mb-6">
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
        <Card className="mb-6">
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
    </div>
  );
}
