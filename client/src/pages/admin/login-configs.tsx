import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type LoginPageConfig } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Loader2, FileText, Shield, Check, Plus } from "lucide-react";
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
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Login Configurations</h1>
            <p className="text-muted-foreground mt-2">
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

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading configurations...</p>
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Configurations Available</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              There are no login page configurations yet. Create your first configuration to customize the authentication experience.
            </p>
            <Button
              onClick={() => setLocation("/admin/login-editor")}
              data-testid="button-create-first-config"
            >
              <Edit className="w-4 h-4 mr-2" />
              Create Configuration
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedConfigs.map((config) => {
              return (
                <Card
                  key={config.id}
                  className="hover-elevate transition-all duration-200"
                  data-testid={`card-config-${config.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Logo or Icon */}
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary">
                        {config.logoUrl ? (
                          <img
                            src={config.logoUrl}
                            alt={config.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-primary-foreground" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/admin/login-editor/${config.id}`)}
                        className="ml-auto"
                        data-testid={`button-edit-${config.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg mt-3">{config.title}</CardTitle>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {config.serviceName && (
                        <Badge variant="secondary" data-testid={`badge-service-${config.id}`}>
                          {config.serviceName}
                        </Badge>
                      )}
                      <Badge variant="outline" data-testid={`badge-methods-${config.id}`}>
                        {config.enabledMethodsCount || 0} methods
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed line-clamp-3">
                      {config.description}
                    </CardDescription>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3" />
                      <span>Default: {config.defaultMethod === 'uuid' ? 'UUID Login' : 'Email Login'}</span>
                    </div>
                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={() => setLocation(`/admin/login-editor/${config.id}`)}
                      data-testid={`button-manage-${config.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Manage Configuration
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
