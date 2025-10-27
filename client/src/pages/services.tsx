import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Service, type RbacModel } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Boxes, Shield } from "lucide-react";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";

// Extended service type with RBAC model
type ServiceWithRbacModel = Service & {
  rbacModel: RbacModel | null;
};

export default function Services() {
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

  // Fetch all services (with RBAC models)
  const { data: services = [], isLoading } = useQuery<ServiceWithRbacModel[]>({
    queryKey: ["/api/services"],
  });

  // Sort services alphabetically by name
  const sortedServices = [...services].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Globe;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <PageHeader 
            title="Service List"
            subtitle="Browse and access all available services"
          />
        
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20">
              <Boxes className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">No Services Available</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                There are no services configured at the moment. Check back later or contact your administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedServices.map((service) => {
                const Icon = getIcon(service.icon);
                return (
                  <Card
                    key={service.id}
                    className="hover-elevate transition-all duration-200"
                    data-testid={`card-service-${service.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: service.color || "hsl(var(--primary))",
                            color: "white",
                          }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="ml-auto"
                          data-testid={`button-visit-${service.id}`}
                        >
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                      <CardTitle className="text-lg mt-3">{service.name}</CardTitle>
                      {service.rbacModel && (
                        <Badge variant="secondary" className="mt-2 gap-1" data-testid={`badge-rbac-${service.id}`}>
                          <Shield className="w-3 h-3" />
                          {service.rbacModel.name}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {service.description}
                      </CardDescription>
                      <Button
                        className="w-full mt-4"
                        asChild
                        data-testid={`button-launch-${service.id}`}
                      >
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Launch Service
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
