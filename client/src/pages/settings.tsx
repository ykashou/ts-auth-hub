import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { User, Shield, Bell, Palette, Lock } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    }
  }, [setLocation]);

  if (!isAuthenticated()) {
    return null;
  }

  const userRole = getUserRole();

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/me"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <PageHeader
            title="Settings"
            subtitle="Manage your account preferences and system settings"
          />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Your account details and profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base text-foreground" data-testid="text-user-email">
                    {currentUser?.email || "Anonymous"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-xs font-mono text-foreground break-all" data-testid="text-user-id">
                    {currentUser?.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <Badge
                    variant={userRole === 'admin' ? 'default' : 'secondary'}
                    data-testid="badge-user-role"
                  >
                    {userRole === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Manage your security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.password ? "Password is set" : "No password set"}
                  </p>
                </div>
                <div className="py-3">
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Not configured</p>
                </div>
              </CardContent>
            </Card>

            {/* Permissions (Admin Only) */}
            {userRole === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Permissions
                  </CardTitle>
                  <CardDescription>
                    Your administrative access level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    You have full administrative access to all features and settings.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Email notifications are enabled for account activities.
                </p>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize your interface preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Theme and display settings will be available soon.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
