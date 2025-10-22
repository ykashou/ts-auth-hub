import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ApiDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const { toast } = useToast();

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
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">API Documentation</h1>
              <p className="text-xs text-muted-foreground">Integration guide for SaaS products</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Back Button */}
          <Button variant="ghost" size="sm" data-testid="button-back" onClick={() => window.location.href = "/dashboard"}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

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
