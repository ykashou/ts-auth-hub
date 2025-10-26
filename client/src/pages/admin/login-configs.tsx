import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type LoginPageConfig } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Loader2, Shield, Plus, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import Navbar from "@/components/Navbar";

// Extended type with service information
type LoginConfigWithService = LoginPageConfig & {
  serviceName?: string;
  serviceIcon?: string;
  serviceColor?: string;
  enabledMethodsCount?: number;
};

export default function LoginConfigurations() {
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

  // Fetch all login configurations
  const { data: configs = [], isLoading } = useQuery<LoginConfigWithService[]>({
    queryKey: ["/api/admin/login-configs"],
  });

  // Sort configs alphabetically by title
  const sortedConfigs = [...configs].sort((a, b) => 
    a.title.localeCompare(b.title)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Login Configurations</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage authentication page configurations for your services
              </p>
            </div>
            <Button
              onClick={() => {
                // Navigate to editor to create new configuration
                setLocation("/admin/login-editor");
              }}
              data-testid="button-create-config"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          {/* Configurations Table */}
          <Card data-testid="card-configs-table">
            <CardHeader>
              <CardTitle>Login Page Configurations</CardTitle>
              <CardDescription>
                {configs.length === 0
                  ? "No login configurations yet. Create your first configuration."
                  : `${configs.length} configuration${configs.length === 1 ? "" : "s"} available`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading configurations...</p>
                </div>
              ) : configs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No configurations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by adding your first login configuration
                  </p>
                  <Button onClick={() => setLocation("/admin/login-editor")} data-testid="button-add-first-config">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Configuration
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Configuration</TableHead>
                        <TableHead className="font-semibold">Service</TableHead>
                        <TableHead className="font-semibold">Methods</TableHead>
                        <TableHead className="font-semibold">Default Method</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedConfigs.map((config) => {
                        return (
                          <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: "hsl(var(--primary))" }}
                                >
                                  {config.logoUrl ? (
                                    <img
                                      src={config.logoUrl}
                                      alt={config.title}
                                      className="w-10 h-10 object-cover rounded-lg"
                                    />
                                  ) : (
                                    <Shield className="w-5 h-5 text-primary-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm" data-testid={`text-config-title-${config.id}`}>
                                    {config.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate max-w-md">
                                    {config.description}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {config.serviceName ? (
                                <Badge variant="secondary" data-testid={`badge-service-${config.id}`}>
                                  {config.serviceName}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-methods-${config.id}`}>
                                {config.enabledMethodsCount || 0} methods
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm" data-testid={`text-default-method-${config.id}`}>
                                {config.defaultMethod === 'uuid' ? 'UUID Login' : 'Email Login'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/admin/login-editor/${config.id}`)}
                                data-testid={`button-edit-${config.id}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
