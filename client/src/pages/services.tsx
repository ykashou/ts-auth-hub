import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Service } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Boxes } from "lucide-react";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export default function Services() {
  const [, setLocation] = useLocation();

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    }
  }, [setLocation]);

  if (!isAuthenticated()) {
    return null;
  }

  // Fetch all services
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Globe;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
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
            {services.map((service) => {
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
      </main>
    </div>
  );
}
