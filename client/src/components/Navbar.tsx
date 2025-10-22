import { Button } from "@/components/ui/button";
import { Shield, Boxes, Settings2, FileText, Code2, LogOut, Home } from "lucide-react";
import { useLocation } from "wouter";
import { clearToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    clearToken();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    setLocation("/login");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home, testId: "button-dashboard" },
    { path: "/services", label: "Services", icon: Boxes, testId: "button-services" },
    { path: "/config", label: "Config", icon: Settings2, testId: "button-config" },
    { path: "/api-docs", label: "API Docs", icon: FileText, testId: "button-api-docs" },
    { path: "/widget-docs", label: "Widget", icon: Code2, testId: "button-widget-docs" },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AuthHub</h1>
              <p className="text-xs text-muted-foreground">Centralized Authentication System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  data-testid={item.testId}
                  onClick={() => setLocation(item.path)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
